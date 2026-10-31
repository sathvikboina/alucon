const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

// Small in-memory limiter: the assistant is an optional, quota-consuming
// endpoint, so a single account should not be able to loop it. This is
// intentionally per-process; a shared store can replace it if the app is ever
// deployed on more than one server.
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 5;
const recentRequests = new Map();

function rateLimit(req, res, next) {
  const key = String(req.user?.id || req.ip || "anonymous");
  const now = Date.now();
  const recent = (recentRequests.get(key) || []).filter(
    (time) => now - time < RATE_WINDOW_MS
  );

  if (recent.length >= RATE_MAX) {
    const retryAfter = Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 1000);
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      success: false,
      error: "Too many AI requests. Try again in a moment.",
    });
  }

  recent.push(now);
  recentRequests.set(key, recent);
  next();
}

// ✅ Models
const ShowcaseEvent = require("../models/Event");
const Infra = require("../models/Infra");
const Research = require("../models/Research");
const Alumni = require("../models/Alumni");
const Timeline = require("../models/TimeLine");
const User = require("../models/User");
const Achievement = require("../models/Achievement");
const Jobs = require("../models/Jobs");
const Poll = require("../models/Poll");
const Post = require("../models/Post");
const Resource = require("../models/Resource");

// ✅ Cache Mistral client (better performance)
let mistralClient;

async function getMistralClient() {
  if (!mistralClient) {
    const { Mistral } = await import("@mistralai/mistralai");

    mistralClient = new Mistral({
      apiKey: process.env.MISTRAL_API_KEY,
    });
  }
  return mistralClient;
}

// ✅ MAIN ROUTE
router.post("/ask-ai", auth, rateLimit, async (req, res) => {
  try {
    const prompt =
      typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (prompt.length > 500) {
      return res
        .status(400)
        .json({ error: "Prompt is too long (max 500 characters)." });
    }

    if (!process.env.MISTRAL_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "The institute assistant is not configured.",
      });
    }

    const client = await getMistralClient();

    // 🔥 Fetch limited DB data (important for performance)
    const [events, infra, research, alumni, timeline, users, achievements, jobs, polls, posts, resources] = await Promise.all([
      ShowcaseEvent.find().limit(5),
      Infra.find().limit(5),
      Research.find().limit(5),
      Alumni.find().select('-email').limit(5),
      Timeline.find().limit(5),
      User.find({ isAdmin: { $ne: true } })
        .select('-password -email -linkedinId -friends -blockedUsers -blocked -followers -followings -notificationID -NotificationID')
        .limit(5),
      Achievement.find().limit(5),
      Jobs.find().limit(5),
      Poll.find().limit(5),
      Post.find().limit(5),
      Resource.find().limit(5),
    ]);

    // 🔥 Build context
    const context = `
Events: ${JSON.stringify(events)}
Infrastructure: ${JSON.stringify(infra)}
Research: ${JSON.stringify(research)}
Alumni: ${JSON.stringify(alumni)}
Timeline: ${JSON.stringify(timeline)}
Users: ${JSON.stringify(users)}
Achievements: ${JSON.stringify(achievements)}
Jobs: ${JSON.stringify(jobs)}
Polls: ${JSON.stringify(polls)}
Posts: ${JSON.stringify(posts)}
Resources: ${JSON.stringify(resources)}
`;

    const response = await client.chat.complete({
      model: "mistral-small",
      messages: [
        {
          role: "system",
          content: `
You are an AI assistant for an institute.

Rules:
- Answer in plain simple sentences
- Do not use bullet points or formatting
- Keep answer short and natural

If answer is not available, say:
"I don't have that information yet."
`,
        },
        {
          role: "user",
          content: `
Context:
${context}

Question:
${prompt}
`,
        },
      ],
    });

    res.json({
      success: true,
      reply: response.choices[0].message.content,
    });

  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({
      success: false,
      error: "AI failed",
    });
  }
});

module.exports = router;