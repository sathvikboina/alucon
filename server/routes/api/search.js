const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const authAdmin = require("../../middleware/authAdmin");
const { rateLimit } = require("../../middleware/rateLimit");
const User = require("../../models/User");
const {
  searchAll,
  getIndexStats,
  rebuildSearchIndex,
} = require("../../services/searchIndex");

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  scope: "ai-search",
  message: "Too many searches. Please wait a moment and try again.",
});

// @route   GET api/search
// @desc    Unified BGE-small semantic search across jobs, members, posts, resources, events and groups
router.get("/", auth, searchLimiter, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (!query) {
      return res.status(400).json({ msg: "Enter a search query" });
    }
    if (query.length > 240) {
      return res.status(400).json({ msg: "Search query is too long" });
    }

    const user = await User.findById(req.user.id)
      .select("name role isAdmin blockedUsers")
      .lean();
    if (!user) return res.status(404).json({ msg: "User not found" });

    const type = String(req.query.type || "").trim();
    const data = await searchAll(user, query, {
      limit: req.query.limit,
      type,
    });
    res.json(data);
  } catch (err) {
    console.error("[search]", err.message);
    res.status(500).json({ msg: "Search is temporarily unavailable" });
  }
});

// @route   GET api/search/status
// @desc    Index size, embedding model and last indexed time
router.get("/status", auth, async (req, res) => {
  try {
    res.json(await getIndexStats());
  } catch (err) {
    console.error("[search] status:", err.message);
    res.status(500).json({ msg: "Could not read the search index" });
  }
});

// @route   POST api/search/reindex
// @desc    Rebuild the whole search index (admin only)
router.post("/reindex", authAdmin, async (req, res) => {
  try {
    const started = Date.now();
    const stats = await rebuildSearchIndex();
    res.json({
      ...stats,
      lastIndexedAt: new Date(),
      durationMs: Date.now() - started,
    });
  } catch (err) {
    console.error("[search] reindex:", err.message);
    res.status(500).json({ msg: "Could not rebuild the search index" });
  }
});

module.exports = router;
