// Grounded, cached AI features for the community feed, threads and job board.
//
// Design rules:
//  - The model never sees data the signed-in user is not allowed to see.
//  - Model output is advisory only: themes, counts, event lists and people are
//    computed from Mongo, and the model picks/describes ids it was given.
//  - Every response carries `sources`, so the UI can link the evidence.
//  - If Gemini is not configured, deterministic extractive output is returned
//    and deliberately not cached.

const Post = require("../models/Post");
const User = require("../models/User");
const Job = require("../models/Jobs");
const AiArtifact = require("../models/AiArtifact");
const { generateJSON, isConfigured } = require("./aiService");
const { canViewPost } = require("../utils/postVisibility");
const { canViewGroupPost } = require("../utils/groupAccess");
const { matchInternship, isEligible } = require("./matching");

const DAY = 24 * 60 * 60 * 1000;
const THREAD_TTL = 24 * 60 * 60 * 1000;
// TL;DR is only offered for long-form posts. Short posts are quicker to read
// than the summary itself, so the button would be noise.
const MIN_TLDR_WORDS = 750;

const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value, max) => {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

// Plain-text word count for the TL;DR threshold. HTML tags and entities do not
// count as words.
const countWords = (value = "") => {
  const text = stripHtml(value == null ? "" : value);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
};

const cleanString = (value, max) => {
  if (typeof value !== "string") return "";
  return truncate(value.replace(/\s+/g, " ").trim(), max);
};

const cleanList = (value, maxItems, maxLen) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(typeof item === "string" ? item : item?.text, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
};

function canView(user, post) {
  return canViewPost(user, post);
}

async function readCache(key) {
  const doc = await AiArtifact.findOne({ key }).lean();
  if (!doc) return null;
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) return null;
  return doc;
}

async function writeCache(key, kind, refId, payload, sources, model, ttl) {
  await AiArtifact.findOneAndUpdate(
    { key },
    {
      key,
      kind,
      refId,
      payload,
      sources,
      model,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + ttl),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).catch((err) => console.warn("[ai] cache write failed:", err.message));
}

/* ------------------------------------------------------------------ */
/* Thread TL;DR                                                        */
/* ------------------------------------------------------------------ */

function fallbackThreadSummary(post) {
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const ranked = [...comments].sort(
    (a, b) => String(b.text || "").length - String(a.text || "").length
  );
  const tldr = ranked
    .slice(0, 3)
    .map((comment) => `${comment.name || "Member"}: ${truncate(stripHtml(comment.text), 140)}`);
  const question = comments
    .map((comment) => stripHtml(comment.text))
    .find((text) => text.includes("?"));
  return {
    tldr: tldr.length ? tldr : ["No substantial replies yet."],
    openQuestion: question ? truncate(question, 180) : null,
    suggestedReply: question
      ? "Answer the open question with one concrete example from your own experience."
      : null,
  };
}

function normalizeThreadSummary(aiData, post) {
  const fallback = fallbackThreadSummary(post);
  const tldr = cleanList(aiData?.tldr, 3, 160);
  return {
    tldr: tldr.length ? tldr : fallback.tldr,
    openQuestion:
      cleanString(aiData?.openQuestion, 220) || fallback.openQuestion,
    suggestedReply:
      cleanString(aiData?.suggestedReply, 220) || fallback.suggestedReply,
  };
}

function threadPrompt(post, comments) {
  const payload = {
    title: post.heading,
    body: truncate(stripHtml(post.text), 1200),
    channel: post.channel,
    comments: comments.slice(0, 20).map((comment) => ({
      author: comment.name || "Member",
      text: truncate(stripHtml(comment.text), 400),
    })),
  };

  return `Summarize this IIIT Allahabad community thread for a member deciding whether to read it.

Rules:
- Use only the thread content below. Do not invent replies or facts.
- tldr: up to 3 bullets, each max 150 characters.
- openQuestion: the single most useful unanswered question, or null.
- suggestedReply: one useful reply of max 200 characters, or null.

Return strict JSON only:
{"tldr":["",""],"openQuestion":"","suggestedReply":""}

THREAD:
${JSON.stringify(payload)}`;
}

async function summarizeThread(user, postId, { force = false } = {}) {
  const post = await Post.findById(postId).lean();
  if (!post || !canView(user, post)) return { error: "not_found" };
  // Group discussions stay inside their group; the TL;DR must obey the same
  // membership rule as the discussion list itself.
  if (post.group && !(await canViewGroupPost(user, post))) {
    return { error: "not_found" };
  }

  const comments = Array.isArray(post.comments) ? post.comments : [];
  const words = countWords(post.text);
  if (words < MIN_TLDR_WORDS) {
    return { error: "post_too_short", wordCount: words, minWords: MIN_TLDR_WORDS };
  }
  if (comments.length === 0) return { error: "no_comments" };

  const key = `thread:${postId}:${comments.length}`;
  if (!force) {
    const cached = await readCache(key);
    if (cached) {
      return {
        ...cached.payload,
        commentCount: comments.length,
        model: cached.model,
        generatedAt: cached.generatedAt,
        cached: true,
      };
    }
  }

  const ai = await generateJSON(threadPrompt(post, comments), { maxOutputTokens: 1000 });
  const payload = normalizeThreadSummary(ai?.data, post);
  const model = ai?.model || "offline";

  if (ai?.data) {
    await writeCache(
      key,
      "thread_summary",
      String(post._id),
      payload,
      [{ label: post.heading, href: `/posts/${post._id}`, type: "post" }],
      model,
      THREAD_TTL
    );
  }

  return {
    ...payload,
    commentCount: comments.length,
    model,
    generatedAt: new Date(),
    cached: false,
  };
}

/* ------------------------------------------------------------------ */
/* Job fit                                                             */
/* ------------------------------------------------------------------ */

function prepStepsFor(missingSkills) {
  if (missingSkills.length) {
    return missingSkills
      .slice(0, 2)
      .map((skill) => `Build one small project or note that demonstrates ${skill}.`);
  }
  return ["Add one measurable outcome (scale, latency, users) to your profile."];
}

async function getJobFit(user, jobId) {
  const job = await Job.findById(jobId).lean();
  if (!job) return { error: "not_found" };

  // Hard constraints are checked before scoring so an ineligible role can
  // never inherit a misleading fit score.
  const eligibility = isEligible(user, job);
  if (!eligibility.ok) {
    return {
      score: 0,
      verdict: "Not eligible",
      matchedSkills: [],
      missingSkills: [],
      prepSteps: [],
      summary: `You do not meet this role's eligibility constraints: ${eligibility.reason}.`,
      eligible: false,
      job: { jobId: String(job._id), title: job.Job_name },
      model: "algorithm",
      generatedAt: new Date(),
      cached: false,
    };
  }

  const poster = job.userID
    ? await User.findById(job.userID).select("name role").lean()
    : null;
  const match = matchInternship(user, job, poster);
  if (!match) {
    return { error: "not_eligible", reason: eligibility.reason || "" };
  }

  const payload = {
    score: match.score,
    verdict: match.verdict,
    matchedSkills: match.matchedSkills,
    missingSkills: match.missingSkills,
    prepSteps: prepStepsFor(match.missingSkills),
    summary: match.summary,
  };

  return {
    ...payload,
    eligible: true,
    job: { jobId: String(job._id), title: job.Job_name },
    model: "algorithm",
    generatedAt: new Date(),
    cached: false,
  };
}

module.exports = {
  summarizeThread,
  getJobFit,
  isConfigured,
  canView,
  countWords,
  MIN_TLDR_WORDS,
};
