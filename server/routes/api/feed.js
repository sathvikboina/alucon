const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const auth = require("../../middleware/auth");
const FeedEvent = require("../../models/FeedEvent");
const Post = require("../../models/Post");
const User = require("../../models/User");
const { canViewPost } = require("../../utils/postVisibility");
const { rankFeed, invalidateFeedCache } = require("../../services/recommender");

const DAY_MS = 24 * 60 * 60 * 1000;
const EVENT_WINDOW_DAYS = 30;
const MAX_EVENTS_PER_BATCH = 50;
const MAX_EVENTS_PER_MINUTE = 600;
const MAX_QUERY_LENGTH = 120;
const MAX_VALUE = 300;

// Lightweight in-process guard against a runaway client. Behavioural events
// are low value individually, so a cap is enough; a shared store can replace
// this if the API ever runs on more than one process.
const minuteBuckets = new Map();

function allowEvents(userId, count) {
  const now = Date.now();
  const recent = (minuteBuckets.get(userId) || []).filter(
    (entry) => now - entry.at < 60 * 1000
  );
  const used = recent.reduce((total, entry) => total + entry.count, 0);
  if (used + count > MAX_EVENTS_PER_MINUTE) {
    minuteBuckets.set(userId, recent);
    return false;
  }
  recent.push({ at: now, count });
  minuteBuckets.set(userId, recent);
  return true;
}

function text(value, max = MAX_QUERY_LENGTH) {
  return String(value || "").trim().slice(0, max);
}

// @route   POST api/feed/events
// @desc    Record a batch of behavioural signals for the signed-in user
// @access  Private
router.post("/events", auth, async (req, res) => {
  try {
    const raw = Array.isArray(req.body?.events) ? req.body.events : [];
    if (raw.length === 0) {
      return res.status(400).json({ msg: "No events supplied" });
    }
    if (raw.length > MAX_EVENTS_PER_BATCH) {
      return res.status(400).json({
        msg: `Too many events in one batch (max ${MAX_EVENTS_PER_BATCH})`,
      });
    }
    if (!allowEvents(String(req.user.id), raw.length)) {
      return res.status(429).json({ msg: "Too many feed events. Slow down." });
    }

    const postIds = [
      ...new Set(
        raw
          .map((event) => event?.postId || event?.post)
          .filter((id) => id && mongoose.isValidObjectId(id))
          .map(String)
      ),
    ];

    const postDocs = postIds.length
      ? await Post.find({ _id: { $in: postIds } })
          .select("user channel")
          .lean()
      : [];
    const postById = new Map(postDocs.map((post) => [String(post._id), post]));

    const documents = [];
    for (const event of raw) {
      if (!event || !FeedEvent.EVENT_TYPES.includes(event.type)) {
        return res.status(400).json({
          msg: `Unknown event type: ${event?.type || "missing"}`,
        });
      }

      const postId = event.postId || event.post;
      const post = postId ? postById.get(String(postId)) : null;
      // A deleted or invalid post is not worth failing the whole batch over.
      if (postId && !post) continue;

      const value = Number(event.value);
      documents.push({
        user: req.user.id,
        type: event.type,
        post: post ? post._id : null,
        channel: post ? post.channel : text(event.channel, 60),
        author: post ? post.user : null,
        query: text(event.query),
        value: Number.isFinite(value)
          ? Math.max(0, Math.min(MAX_VALUE, value))
          : 0,
        surface: text(event.surface, 30) || "feed",
        sessionId: text(event.sessionId, 80),
      });
    }

    if (documents.length === 0) {
      return res.status(400).json({ msg: "No valid events supplied" });
    }

    await FeedEvent.insertMany(documents, { ordered: false });
    invalidateFeedCache(String(req.user.id));

    res.json({ accepted: documents.length });
  } catch (error) {
    console.error("[feed] event ingest failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/feed/reset
// @desc    Delete the signed-in user's behavioural history
// @access  Private
router.post("/reset", auth, async (req, res) => {
  try {
    const result = await FeedEvent.deleteMany({ user: req.user.id });
    invalidateFeedCache(String(req.user.id));
    res.json({ reset: true, deleted: result.deletedCount || 0 });
  } catch (error) {
    console.error("[feed] reset failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/feed/for-you
// @desc    Personalised post ranking for the signed-in user
// @access  Private
router.get("/for-you", auth, async (req, res) => {
  try {
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(50, Math.max(1, parsedLimit))
      : 30;
    const channel = text(req.query.channel, 60);

    const user = await User.findById(req.user.id)
      .select("name role isAdmin followings blockedUsers")
      .lean();
    if (!user) {
      return res.status(401).json({ msg: "User not found" });
    }

    const candidates = await Post.find({
      group: null,
      ...(channel ? { channel } : {}),
    })
      .sort({ date: -1 })
      .limit(200)
      .lean();

    const blocked = new Set((user.blockedUsers || []).map(String));
    const visible = candidates.filter(
      (post) => canViewPost(user, post) && !blocked.has(String(post.user))
    );

    const since = new Date(Date.now() - EVENT_WINDOW_DAYS * DAY_MS);
    const events = await FeedEvent.find({
      user: req.user.id,
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(3000)
      .lean();

    const engagedIds = [
      ...new Set(
        events
          .filter(
            (event) =>
              event.post &&
              ["click", "like", "comment", "share", "dwell"].includes(event.type)
          )
          .map((event) => String(event.post))
      ),
    ].slice(0, 10);

    const engagedPosts = engagedIds.length
      ? await Post.find({ _id: { $in: engagedIds } })
          .select("heading text channel user")
          .lean()
      : [];

    const result = rankFeed({
      user,
      posts: visible,
      events,
      engagedPosts,
      limit,
      channel,
    });

    res.json(result);
  } catch (error) {
    console.error("[feed] ranking failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// ---------------------------------------------------------------------------
// Top feed
// ---------------------------------------------------------------------------

const TOP_RANGES = ["today", "week", "month", "year", "all", "custom"];
const TOP_RANGE_DAYS = { week: 7, month: 30, year: 365 };

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Parses the requested window. Presets are relative to "now"; custom ranges
// must supply both ends and are inclusive of the whole end day.
function parseTopWindow(rangeRaw, fromRaw, toRaw) {
  const range = String(rangeRaw || "week").trim().toLowerCase();
  if (!TOP_RANGES.includes(range)) {
    return { error: `range must be one of ${TOP_RANGES.join(", ")}` };
  }

  if (range === "custom") {
    const from = fromRaw ? new Date(fromRaw) : null;
    const to = toRaw ? new Date(toRaw) : null;
    if (!from || Number.isNaN(from.getTime()) || !to || Number.isNaN(to.getTime())) {
      return { error: "custom range needs valid from and to dates" };
    }
    if (from.getTime() > to.getTime()) {
      return { error: "from must be before to" };
    }
    const end = new Date(to);
    // A bare date is midnight; include the rest of that day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(toRaw).trim())) {
      end.setHours(23, 59, 59, 999);
    }
    return { range, from, to: end };
  }

  if (range === "all") return { range, from: null, to: null };

  const now = new Date();
  if (range === "today") {
    return { range, from: startOfDay(now), to: now };
  }
  const days = TOP_RANGE_DAYS[range];
  return {
    range,
    from: new Date(now.getTime() - days * DAY_MS),
    to: now,
  };
}

function topReason(post) {
  const likes = post.likes?.length || 0;
  const comments = post.comments?.length || 0;
  if (likes === 0 && comments === 0) return "New post";
  const parts = [];
  if (likes > 0) parts.push(`${likes} like${likes === 1 ? "" : "s"}`);
  if (comments > 0) parts.push(`${comments} comment${comments === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

// Deterministic engagement score. Comments weigh more than likes because they
// cost more effort; the date is only a tie-breaker, never a multiplier.
function topScore(post) {
  return (post.likes?.length || 0) * 2 + (post.comments?.length || 0) * 4;
}

// @route   GET api/feed/top
// @desc    Most-engaged posts in a preset or custom time window
// @access  Private
router.get("/top", auth, async (req, res) => {
  try {
    const window = parseTopWindow(req.query.range, req.query.from, req.query.to);
    if (window.error) {
      return res.status(400).json({ msg: window.error });
    }

    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(50, Math.max(1, parsedLimit))
      : 30;
    const channel = text(req.query.channel, 60);

    const user = await User.findById(req.user.id)
      .select("name role isAdmin followings blockedUsers")
      .lean();
    if (!user) {
      return res.status(401).json({ msg: "User not found" });
    }

    const dateFilter = window.from
      ? { date: { $gte: window.from, ...(window.to ? { $lte: window.to } : {}) } }
      : {};

    const candidates = await Post.find({
      group: null,
      ...(channel ? { channel } : {}),
      ...dateFilter,
    })
      .sort({ date: -1 })
      .limit(500)
      .lean();

    const blocked = new Set((user.blockedUsers || []).map(String));
    const visible = candidates.filter(
      (post) => canViewPost(user, post) && !blocked.has(String(post.user))
    );

    const ranked = visible
      .map((post) => ({ post, score: topScore(post) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.post.date || 0) - new Date(a.post.date || 0);
      })
      .slice(0, limit)
      .map(({ post, score }) => ({
        ...post,
        feed: { score, reason: topReason(post), algorithm: "top-v1" },
      }));

    res.json({
      posts: ranked,
      meta: {
        algorithm: "top-v1",
        range: window.range,
        from: window.from ? window.from.toISOString() : null,
        to: window.to ? window.to.toISOString() : null,
        channel: channel || null,
        candidateCount: visible.length,
        count: ranked.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[feed] top failed:", error.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
