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
const Event = require("../models/Event");
const Job = require("../models/Jobs");
const AiArtifact = require("../models/AiArtifact");
const { generateJSON, isConfigured } = require("./aiService");
const { canViewPost } = require("../utils/postVisibility");
const { canViewGroupPost } = require("../utils/groupAccess");
const { matchInternship, isEligible } = require("./matching");

const DAY = 24 * 60 * 60 * 1000;
const BRIEFING_TTL = 6 * 60 * 60 * 1000;
const THREAD_TTL = 24 * 60 * 60 * 1000;
const FIT_TTL = 12 * 60 * 60 * 1000;
// TL;DR is only offered for long-form posts. Short posts are quicker to read
// than the summary itself, so the button would be noise.
const MIN_TLDR_WORDS = 750;

const TECH_KEYWORDS = [
  "python", "javascript", "typescript", "react", "node", "express", "sql",
  "mongodb", "docker", "kubernetes", "aws", "gcp", "machine learning",
  "deep learning", "nlp", "computer vision", "distributed systems", "go",
  "java", "api", "pytorch", "tensorflow", "mlops", "evaluation",
  "research",
];

const SKILL_ALIASES = {
  "machine learning": ["machine learning", "ml"],
  "computer vision": ["computer vision", "cv"],
  "deep learning": ["deep learning"],
  "distributed systems": ["distributed systems", "distributed"],
  api: ["api", "apis", "rest"],
  rest: ["rest", "api", "apis"],
  evaluation: ["evaluation", "evaluate", "eval"],
  mlops: ["mlops", "ml ops", "model monitoring", "model serving"],
  research: ["research", "papers", "publication"],
  internship: ["internship", "intern"],
};

const normalizeText = (value) =>
  ` ${String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;

const hasKeyword = (text, keyword) => {
  const aliases = SKILL_ALIASES[keyword] || [keyword];
  return aliases.some((alias) => text.includes(` ${alias} `));
};

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

const engagement = (post) =>
  (post.likes?.length || 0) * 1 + (post.comments?.length || 0) * 2;

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
/* Briefing                                                            */
/* ------------------------------------------------------------------ */

function rankPeople(user, people) {
  const userSkills = new Set(
    [...(user.skills || []), user.working_area, user.program]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase())
  );

  return people
    .map((person) => {
      const text = `${person.working_area || ""} ${(person.skills || []).join(" ")}`.toLowerCase();
      let overlap = 0;
      userSkills.forEach((skill) => {
        if (skill && text.includes(skill)) overlap += 1;
      });
      const sameLocation =
        person.location && user.location
          ? String(person.location).toLowerCase() === String(user.location).toLowerCase()
          : false;
      const score = overlap * 3 + (sameLocation ? 1 : 0);
      const bits = [
        person.working_area,
        (person.skills || []).slice(0, 2).join(", "),
        person.organisation,
      ].filter(Boolean);
      return {
        userId: String(person._id),
        name: person.name,
        avatar: person.avatar,
        reason: bits.length ? bits.join(" · ") : "IIITA alumni",
        href: `/profile/${person._id}`,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

async function buildBriefingContext(user) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY);

  let posts = await Post.find({ group: null, date: { $gte: weekAgo } })
    .sort({ date: -1 })
    .limit(60)
    .lean();
  posts = posts.filter((post) => canView(user, post));

  // A quiet week should still produce a useful briefing.
  if (posts.length < 6) {
    const latest = await Post.find({ group: null })
      .sort({ date: -1 })
      .limit(40)
      .lean();
    posts = latest.filter((post) => canView(user, post)).slice(0, 15);
  }

  const [events, jobs, people] = await Promise.all([
    Event.find({ startTime: { $gte: now } }).sort({ startTime: 1 }).limit(4).lean(),
    Job.find({ Job_deadline: { $gte: now } }).sort({ Job_deadline: 1 }).limit(4).lean(),
    User.find({ role: "alumni", _id: { $ne: user._id } })
      .select("name avatar organisation working_area skills location passing_year")
      .limit(40)
      .lean(),
  ]);

  const themes = Object.entries(
    posts.reduce((acc, post) => {
      const name = post.channel || "General";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const postSummary = posts.map((post) => ({
    id: String(post._id),
    title: post.heading,
    excerpt: truncate(stripHtml(post.text), 220),
    channel: post.channel || "General",
    author: post.name || "IIITA member",
    likes: post.likes?.length || 0,
    comments: post.comments?.length || 0,
    ageDays: Math.max(0, Math.round((now - new Date(post.date || now)) / DAY)),
  }));

  const postById = Object.fromEntries(postSummary.map((post) => [post.id, post]));

  const openQuestions = posts
    .filter((post) => (post.comments?.length || 0) === 0)
    .filter((post) => `${post.heading} ${stripHtml(post.text)}`.includes("?"))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 3)
    .map((post) => ({
      postId: String(post._id),
      title: post.heading,
      channel: post.channel || "General",
      href: `/posts/${post._id}`,
    }));

  const highlights = [...posts]
    .sort((a, b) => engagement(b) - engagement(a))
    .slice(0, 3)
    .map((post) => ({
      postId: String(post._id),
      title: post.heading,
      channel: post.channel || "General",
      href: `/posts/${post._id}`,
      text: "",
    }));

  const upcoming = events.map((event) => ({
    eventId: String(event._id),
    title: event.title,
    when: event.startTime,
    speaker: event.Speaker || "",
    href: "/events",
  }));

  const newJobs = jobs.map((job) => ({
    jobId: String(job._id),
    title: job.Job_name,
    company: job.created_by_user || "",
    href: "/jobs",
  }));

  return {
    now,
    posts: postSummary,
    postById,
    themes,
    openQuestions,
    highlights,
    upcoming,
    jobs: newJobs,
    peopleToMeet: rankPeople(user, people),
  };
}

function fallbackSummary(ctx) {
  const themeText =
    ctx.themes.length > 0
      ? ` Most activity is in ${ctx.themes.slice(0, 2).map((t) => t.name).join(" and ")}.`
      : "";
  const questionText =
    ctx.openQuestions.length > 0
      ? ` ${ctx.openQuestions.length} question${
          ctx.openQuestions.length === 1 ? "" : "s"
        } still need${ctx.openQuestions.length === 1 ? "s" : ""} an answer.`
      : "";
  const eventText =
    ctx.upcoming.length > 0
      ? ` ${ctx.upcoming.length} event${ctx.upcoming.length === 1 ? "" : "s"} coming up.`
      : "";
  return `${ctx.posts.length} recent post${ctx.posts.length === 1 ? "" : "s"} from the community.${themeText}${questionText}${eventText}`;
}

function briefingPrompt(ctx, user) {
  const payload = {
    member: {
      name: user.name,
      role: user.role,
      skills: user.skills || [],
      workingArea: user.working_area || "",
    },
    posts: ctx.posts.map((post) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      channel: post.channel,
      likes: post.likes,
      comments: post.comments,
    })),
    openQuestions: ctx.openQuestions.map((q) => ({ postId: q.postId, title: q.title })),
    events: ctx.upcoming.map((e) => ({ eventId: e.eventId, title: e.title })),
    jobs: ctx.jobs,
  };

  return `You are the community editor for the IIIT Allahabad alumni network.
Write a short, factual briefing for the signed-in member using ONLY the data below.

Rules:
- Never invent facts, names, numbers, dates or events.
- headline: max 70 characters, specific, no clickbait.
- summary: exactly 2 sentences, max 240 characters.
- focus: choose ONE open question or event and state the action in max 100 characters. Use the provided id.
- highlights: choose up to 3 post ids that are worth reading, each with a reason of max 110 characters.
- If there is not enough data, return an empty highlights array and a plain summary.

Return strict JSON only:
{"headline":"","summary":"","focus":{"text":"","postId":null,"eventId":null},"highlights":[{"postId":"","text":""}]}

DATA:
${JSON.stringify(payload)}`;
}

function normalizeBriefing(aiData, ctx, user) {
  const firstName = String(user.name || "there").split(" ")[0];
  const headline =
    cleanString(aiData?.headline, 90) ||
    `${firstName}, here's your community briefing`;
  const summary = cleanString(aiData?.summary, 300) || fallbackSummary(ctx);

  let focus = null;
  const rawFocus = aiData?.focus;
  if (rawFocus && typeof rawFocus === "object") {
    if (rawFocus.postId && ctx.postById[rawFocus.postId]) {
      const post = ctx.postById[rawFocus.postId];
      focus = {
        text: cleanString(rawFocus.text, 140) || `Read: ${post.title}`,
        postId: post.id,
        title: post.title,
        href: `/posts/${post.id}`,
      };
    } else if (rawFocus.eventId) {
      const event = ctx.upcoming.find((item) => item.eventId === rawFocus.eventId);
      if (event) {
        focus = {
          text: cleanString(rawFocus.text, 140) || `Join: ${event.title}`,
          eventId: event.eventId,
          title: event.title,
          href: event.href,
        };
      }
    }
  }
  if (!focus && ctx.openQuestions.length > 0) {
    const question = ctx.openQuestions[0];
    focus = {
      text: `Answer: ${question.title}`,
      postId: question.postId,
      title: question.title,
      href: question.href,
    };
  }
  if (!focus && ctx.upcoming.length > 0) {
    const event = ctx.upcoming[0];
    focus = {
      text: `Join: ${event.title}`,
      eventId: event.eventId,
      title: event.title,
      href: event.href,
    };
  }

  const seen = new Set();
  const highlights = [];
  for (const item of Array.isArray(aiData?.highlights) ? aiData.highlights : []) {
    const post = ctx.postById[item?.postId];
    if (!post || seen.has(post.id)) continue;
    seen.add(post.id);
    highlights.push({
      postId: post.id,
      title: post.title,
      channel: post.channel,
      href: `/posts/${post.id}`,
      text:
        cleanString(item?.text, 140) ||
        `${post.channel} · ${post.likes} likes · ${post.comments} comments`,
    });
    if (highlights.length === 3) break;
  }
  if (highlights.length === 0) {
    ctx.highlights.slice(0, 2).forEach((post) => {
      highlights.push({
        postId: post.postId,
        title: post.title,
        channel: post.channel,
        href: post.href,
        text: `${post.channel} · ${ctx.postById[post.postId]?.likes || 0} likes`,
      });
    });
  }

  const sources = [];
  const addSource = (label, href, type) => {
    if (!href || sources.some((source) => source.href === href)) return;
    sources.push({ label, href, type });
  };
  highlights.forEach((post) => addSource(`Post · ${post.title}`, post.href, "post"));
  if (focus?.postId) addSource(`Focus · ${focus.title}`, focus.href, "post");
  if (focus?.eventId) addSource(`Event · ${focus.title}`, focus.href, "event");
  ctx.upcoming.slice(0, 2).forEach((event) =>
    addSource(`Event · ${event.title}`, event.href, "event")
  );
  ctx.peopleToMeet.forEach((person) =>
    addSource(`Alumni · ${person.name}`, person.href, "person")
  );

  return {
    headline,
    summary,
    focus,
    themes: ctx.themes,
    highlights,
    openQuestions: ctx.openQuestions.slice(0, 2),
    upcoming: ctx.upcoming.slice(0, 2),
    peopleToMeet: ctx.peopleToMeet,
    sources: sources.slice(0, 6),
  };
}

async function getBriefing(user, { force = false } = {}) {
  const key = `briefing:${user._id}`;
  if (!force) {
    const cached = await readCache(key);
    if (cached) {
      return {
        ...cached.payload,
        model: cached.model,
        generatedAt: cached.generatedAt,
        cached: true,
      };
    }
  }

  const ctx = await buildBriefingContext(user);
  const ai = await generateJSON(briefingPrompt(ctx, user), { maxOutputTokens: 900 });
  const payload = normalizeBriefing(ai?.data, ctx, user);
  const model = ai?.model || "offline";

  if (ai?.data) {
    await writeCache(
      key,
      "briefing",
      String(user._id),
      payload,
      payload.sources,
      model,
      BRIEFING_TTL
    );
  }

  return {
    ...payload,
    model,
    generatedAt: new Date(),
    cached: false,
  };
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

function scoreToVerdict(score) {
  if (score >= 82) return "Strong fit";
  if (score >= 68) return "Good fit";
  if (score >= 52) return "Worth exploring";
  return "Different focus";
}

function fallbackFit(user, job) {
  const jobText = normalizeText(
    `${job.Job_name} ${job.Description || ""} ${(job.skills || []).join(" ")}`
  );
  const profileText = normalizeText(
    [
      ...(user.skills || []),
      user.working_area,
      user.bio,
      user.program,
      user.designation,
      user.organisation,
    ]
      .filter(Boolean)
      .join(" ")
  );

  const matchedSkills = TECH_KEYWORDS.filter(
    (keyword) => hasKeyword(jobText, keyword) && hasKeyword(profileText, keyword)
  );
  const missingSkills = TECH_KEYWORDS.filter(
    (keyword) => hasKeyword(jobText, keyword) && !hasKeyword(profileText, keyword)
  ).slice(0, 4);

  const score = Math.max(
    40,
    Math.min(95, 58 + matchedSkills.length * 9 - missingSkills.length * 3)
  );

  return {
    score,
    verdict: scoreToVerdict(score),
    matchedSkills: matchedSkills.slice(0, 6),
    missingSkills,
    prepSteps: missingSkills.length
      ? missingSkills
          .slice(0, 2)
          .map((skill) => `Build one small project or note that demonstrates ${skill}.`)
      : ["Add one measurable outcome (scale, latency, users) to your profile."],
    summary: `Rule-based match: ${matchedSkills.length} shared skill${
      matchedSkills.length === 1 ? "" : "s"
    } and ${missingSkills.length} gap${missingSkills.length === 1 ? "" : "s"} between your profile and this role.`,
  };
}

function normalizeFit(aiData, user, job, deterministic) {
  // Prefer the shared matching engine so a role scores the same on the job
  // board as it does on /internship-matches.
  const fallback = deterministic
    ? {
        score: deterministic.score,
        verdict: scoreToVerdict(deterministic.score),
        matchedSkills: deterministic.matchedSkills,
        missingSkills: deterministic.missingSkills,
        prepSteps: deterministic.missingSkills.length
          ? deterministic.missingSkills
              .slice(0, 2)
              .map((skill) => `Build one small project or note that demonstrates ${skill}.`)
          : ["Add one measurable outcome (scale, latency, users) to your profile."],
        summary: deterministic.summary,
      }
    : fallbackFit(user, job);

  const aiScore = Number(aiData?.score);
  let score = fallback.score;
  if (Number.isFinite(aiScore)) {
    const bounded = Math.max(0, Math.min(100, aiScore));
    score = deterministic
      ? Math.round(fallback.score * 0.55 + bounded * 0.45)
      : Math.round(bounded);
  }
  score = Math.max(0, Math.min(100, score));

  const verdict = cleanString(aiData?.verdict, 30);
  const matchedSkills = cleanList(aiData?.matchedSkills, 6, 40);
  const missingSkills = cleanList(aiData?.missingSkills, 5, 40);
  const prepSteps = cleanList(aiData?.prepSteps, 3, 160);

  return {
    score,
    verdict: verdict || scoreToVerdict(score),
    matchedSkills: matchedSkills.length ? matchedSkills : fallback.matchedSkills,
    missingSkills: missingSkills.length ? missingSkills : fallback.missingSkills,
    prepSteps: prepSteps.length ? prepSteps : fallback.prepSteps,
    summary: cleanString(aiData?.summary, 240) || fallback.summary,
  };
}

function fitPrompt(user, job) {
  const payload = {
    member: {
      role: user.role,
      program: user.program,
      passingYear: user.passing_year,
      skills: user.skills || [],
      workingArea: user.working_area || "",
      designation: user.designation || "",
      organisation: user.organisation || "",
      bio: truncate(stripHtml(user.bio), 600),
    },
    job: {
      title: job.Job_name,
      description: truncate(stripHtml(job.Description), 1400),
      skills: job.skills || [],
      type: job.job_type || "",
      workMode: job.work_mode || "",
      location: job.location || "",
      deadline: job.Job_deadline,
    },
  };

  return `Compare this member profile with the job and assess fit.

Rules:
- Use only the evidence below. Do not invent experience, employers or skills.
- score: integer 0-100 for role fit, not personal worth.
- verdict: one of "Strong fit", "Good fit", "Stretch", "Different focus".
- matchedSkills / missingSkills: short skill names, max 6 each.
- prepSteps: up to 3 concrete actions, each max 150 characters.
- summary: one sentence, max 220 characters.

Return strict JSON only:
{"score":0,"verdict":"","matchedSkills":[""],"missingSkills":[""],"prepSteps":[""],"summary":""}

DATA:
${JSON.stringify(payload)}`;
}

async function getJobFit(user, jobId, { force = false } = {}) {
  const job = await Job.findById(jobId).lean();
  if (!job) return { error: "not_found" };

  // Hard constraints are checked before cache/model work so an ineligible role
  // can never inherit a stale "strong fit" artifact.
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
      model: "offline",
      generatedAt: new Date(),
      cached: false,
    };
  }

  const key = `fit:${user._id}:${jobId}`;
  if (!force) {
    const cached = await readCache(key);
    if (cached) {
      return {
        ...cached.payload,
        job: { jobId: String(job._id), title: job.Job_name },
        model: cached.model,
        generatedAt: cached.generatedAt,
        cached: true,
      };
    }
  }

  const ai = await generateJSON(fitPrompt(user, job), { maxOutputTokens: 700 });
  const poster = job.userID
    ? await User.findById(job.userID).select("name role").lean()
    : null;
  const deterministic = matchInternship(user, job, poster);
  const payload = normalizeFit(ai?.data, user, job, deterministic);
  const model = ai?.model || "offline";

  if (ai?.data) {
    await writeCache(
      key,
      "job_fit",
      `${user._id}:${jobId}`,
      payload,
      [{ label: `Job · ${job.Job_name}`, href: "/jobs", type: "job" }],
      model,
      FIT_TTL
    );
  }

  return {
    ...payload,
    job: { jobId: String(job._id), title: job.Job_name },
    model,
    generatedAt: new Date(),
    cached: false,
  };
}

module.exports = {
  getBriefing,
  summarizeThread,
  getJobFit,
  isConfigured,
  canView,
  countWords,
  MIN_TLDR_WORDS,
};
