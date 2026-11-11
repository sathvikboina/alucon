const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const {
  getBriefing,
  summarizeThread,
  getJobFit,
  isConfigured,
} = require("../../services/aiInsights");
const { modelList } = require("../../services/aiService");
const {
  getInternshipMatches,
  getMentorMatches,
} = require("../../services/matching");

const asUser = async (req) => User.findById(req.user.id).lean();
// Bypassing the cache costs a model call, so only admins may force a refresh.
const wantsRefresh = (req, user) =>
  Boolean(user?.isAdmin) &&
  (req.query.force === "1" || req.body?.force === true);

// @route   GET api/ai/insights/status
// @desc    Whether a model key is configured (useful for demos/debugging)
router.get("/status", auth, (req, res) => {
  res.json({ configured: isConfigured(), models: modelList() });
});

// @route   GET api/ai/insights/briefing
// @desc    On-demand grounded community briefing for the signed-in member
router.get("/briefing", auth, async (req, res) => {
  try {
    const user = await asUser(req);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const briefing = await getBriefing(user, { force: wantsRefresh(req, user) });
    res.json(briefing);
  } catch (err) {
    console.error("[ai] briefing:", err.message);
    res.status(500).json({ msg: "Could not build the briefing" });
  }
});

// @route   POST api/ai/insights/posts/:id/summary
// @desc    TL;DR of a post's comment thread
router.post("/posts/:id/summary", auth, async (req, res) => {
  try {
    const user = await asUser(req);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const summary = await summarizeThread(user, req.params.id, {
      force: wantsRefresh(req, user),
    });

    if (summary.error === "not_found") {
      return res.status(404).json({ msg: "Post not found" });
    }
    if (summary.error === "no_comments") {
      return res.status(400).json({ msg: "There are no replies to summarize yet" });
    }
    if (summary.error === "post_too_short") {
      return res.status(400).json({
        msg: `TL;DR is only available for posts of ${summary.minWords} words or more`,
        wordCount: summary.wordCount,
        minWords: summary.minWords,
      });
    }

    res.json(summary);
  } catch (err) {
    console.error("[ai] thread summary:", err.message);
    res.status(500).json({ msg: "Could not summarize this thread" });
  }
});

// @route   GET api/ai/insights/jobs/matches
// @desc    Explainable internship / opportunity matches for the signed-in member
router.get("/jobs/matches", auth, async (req, res) => {
  try {
    const user = await asUser(req);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const matches = await getInternshipMatches(user, {
      limit: req.query.limit,
      type: req.query.type,
      mode: req.query.mode,
      force: wantsRefresh(req, user),
    });
    res.json(matches);
  } catch (err) {
    console.error("[matching] internships:", err.message);
    res.status(500).json({ msg: "Could not build internship matches" });
  }
});

// @route   GET api/ai/insights/mentors/matches
// @desc    Explainable mentor matches for the signed-in member
router.get("/mentors/matches", auth, async (req, res) => {
  try {
    const user = await asUser(req);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const matches = await getMentorMatches(user, {
      limit: req.query.limit,
      area: req.query.area,
      force: wantsRefresh(req, user),
    });
    res.json(matches);
  } catch (err) {
    console.error("[matching] mentors:", err.message);
    res.status(500).json({ msg: "Could not build mentor matches" });
  }
});

// @route   GET api/ai/insights/jobs/:id/fit
// @desc    Fit score, gaps and prep steps for a job
router.get("/jobs/:id/fit", auth, async (req, res) => {
  try {
    const user = await asUser(req);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const fit = await getJobFit(user, req.params.id);

    if (fit.error === "not_found") {
      return res.status(404).json({ msg: "Job not found" });
    }

    res.json(fit);
  } catch (err) {
    console.error("[ai] job fit:", err.message);
    res.status(500).json({ msg: "Could not assess this role" });
  }
});

module.exports = router;
