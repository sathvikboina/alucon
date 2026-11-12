// Unified semantic search across the whole portal.
//
// MongoDB stores one SearchDocument per source record (job, member, post,
// resource, event or group). BGE-small embeds the searchable text once at index
// time; a query is embedded once and ranked in Node with cosine similarity plus
// lexical evidence and an intent boost. No LLM is involved.

const SearchDocument = require("../models/SearchDocument");
const Job = require("../models/Jobs");
const User = require("../models/User");
const Post = require("../models/Post");
const Resource = require("../models/Resource");
const Event = require("../models/Event");
const Group = require("../models/Group");
const { canViewPost } = require("../utils/postVisibility");
const {
  MODEL_NAME,
  EMBEDDING_DIM,
  embedTexts,
  embedQuery,
  cosineSimilarity,
} = require("./embeddings");

// Blend used when both the BGE vector and lexical evidence are available.
// Kept in one place so ranking can be tuned and evaluated without touching the
// scoring pipeline.
const RANKING_WEIGHTS = Object.freeze({
  semantic: 0.6,
  lexical: 0.4,
});

const TYPE_ORDER = ["job", "alumni", "post", "resource", "event", "group"];
const TYPE_LABELS = {
  job: "Internships & jobs",
  alumni: "Alumni & members",
  post: "Posts & discussions",
  resource: "Resources",
  event: "Events",
  group: "Groups & cohorts",
};

const TYPE_NOUNS = {
  job: "internships or jobs",
  alumni: "alumni or members",
  post: "posts",
  resource: "resources",
  event: "events",
  group: "groups",
};

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "for", "from",
  "find", "get", "give", "help", "how", "i", "in", "is", "it", "me", "my",
  "need", "of", "on", "or", "our", "please", "show", "the", "to", "up", "want",
  "what", "where", "who", "with", "you", "your", "about", "all", "any", "looking",
  "not", "no", "don", "dont", "doesn", "doesnt", "didn", "didnt", "isn", "isnt",
  "aren", "arent", "wasn", "wasnt", "weren", "werent", "excluding", "except",
  "without", "outside", "other", "than", "apart", "besides", "but", "however",
  "while", "whereas", "yet", "though", "although",
]);

// Query language that flips the meaning of the words that follow it. The
// normalized form splits apostrophes into spaces, so "don't" arrives as
// "don t"; both spellings are listed.
const NEGATION_CUES = [
  "do not", "does not", "did not", "don t", "doesn t", "didn t",
  "is not", "isn t", "are not", "aren t", "was not", "wasn t",
  "were not", "weren t", "not", "dont", "doesnt", "didnt", "isnt",
  "arent", "wasnt", "werent", "excluding", "except", "without",
  "outside", "other than", "apart from", "besides",
];

const NEGATION_BOUNDARIES = [
  "but", "however", "while", "whereas", "yet", "though", "although",
];

// "Kafka is not a queue" is a title, not a request to exclude queues. Cues
// such as "not" and "no" only act as filters when the words after them look
// like a filter phrase ("not in Bangalore", "not working at Google").
// Explicit exclusion words do not need that guard.
const WEAK_NEGATION_CUES = new Set([
  "do not", "does not", "did not", "don t", "doesn t", "didn t",
  "is not", "isn t", "are not", "aren t", "was not", "wasn t",
  "were not", "weren t", "not", "no", "dont", "doesnt", "didnt", "isnt",
  "arent", "wasnt", "werent",
]);

const NEGATION_FILTER_RE =
  /^(?:(?:currently|actually|really|also)\s+)?(?:work(?:s|ing|ed)?|based|located|live(?:s|d|ing)?|hq|headquartered|in|at|from|for|with)\b/;

const escapeRegexText = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const NEGATION_RE = new RegExp(
  `\\b(?:${NEGATION_CUES.map(escapeRegexText).join("|")})\\b`,
  "g"
);

const NEGATION_BOUNDARY_RE = new RegExp(
  `\\b(?:${NEGATION_BOUNDARIES.map(escapeRegexText).join("|")})\\b`
);

// Words that describe *what kind* of record the user wants rather than *what*
// it should be about. They steer the intent boost but must not count as
// content evidence: "posts about placements" is a search for placements, not a
// search that every post satisfies by containing the word "post".
const INTENT_WORDS = new Set([
  "alumni", "alumnus", "people", "member", "members", "person", "persons",
  "post", "posts", "discussion", "discussions", "thread", "threads",
  "conversation", "conversations", "wrote", "posted",
  "job", "jobs", "intern", "interns", "internship", "internships", "role",
  "roles", "opening", "openings", "hiring", "opportunity", "opportunities",
  "position", "positions", "vacancy", "vacancies",
  "resource", "resources", "learn", "learning", "course", "courses", "guide",
  "guides", "note", "notes", "tutorial", "tutorials", "reading",
  "event", "events", "upcoming", "webinar", "webinars", "workshop", "workshops",
  "talk", "talks", "meetup", "meetups", "conference", "conferences",
  "group", "groups", "cohort", "cohorts", "club", "clubs", "community",
  "communities", "hub", "hubs",
  "work", "works", "working", "worked", "based", "near", "around",
]);

// Query words that should match the vocabulary used in the data.
const SYNONYMS = {
  ml: ["machine learning", "applied ml"],
  ai: ["artificial intelligence", "machine learning"],
  bangalore: ["bengaluru", "bangalore"],
  bengaluru: ["bangalore", "bengaluru"],
  internship: ["intern", "internship"],
  job: ["role", "opening", "position"],
  alumni: ["alumnus", "alumni"],
  member: ["alumni", "people", "member"],
  people: ["alumni", "member", "people"],
  placement: ["placements", "recruitment", "hiring"],
  placements: ["placement", "recruitment", "hiring"],
  resource: ["resources", "notes", "guide", "course"],
  event: ["events", "talk", "webinar", "workshop"],
  group: ["groups", "cohort", "club", "community"],
};

const INTENT_PATTERNS = {
  job: [
    /\binternships?\b/, /\bjobs?\b/, /\broles?\b/, /\bopenings?\b/, /\bhiring\b/,
    /\bopportunit(?:y|ies)\b/, /\bpositions?\b/, /\bvacanc(?:y|ies)\b/,
  ],
  alumni: [
    /\balumni\b/, /\balumnus\b/, /\bpeople\b/, /\bmembers?\b/,
    /\bworks?\s+(?:at|for)\b/, /\bworking\s+(?:at|for)\b/, /\bengineer\b/,
    /\bfounder\b/, /\bcolleague\b/,
  ],
  post: [
    /\bposts?\b/, /\bdiscussions?\b/, /\bthreads?\b/, /\bconversations?\b/,
    /\bwrote\b/, /\bposted\b/,
  ],
  resource: [
    /\bresources?\b/, /\blearn(?:ing)?\b/, /\bcourses?\b/, /\bguides?\b/,
    /\bnotes?\b/, /\btutorials?\b/, /\breading\b/,
  ],
  event: [
    /\bevents?\b/, /\bupcoming\b/, /\bwebinars?\b/, /\bworkshops?\b/,
    /\btalks?\b/, /\bmeetups?\b/, /\bconferences?\b/,
  ],
  group: [
    /\bgroups?\b/, /\bcohorts?\b/, /\bclubs?\b/, /\bcommunities\b/, /\bhubs?\b/,
  ],
};

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function joinParts(...parts) {
  return parts
    .flat()
    .filter(Boolean)
    .map((part) => String(part))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, max) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function tokenize(value) {
  return normalize(value)
    .split(" ")
    .map((token) => token.replace(/^\.+|\.+$/g, ""))
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function tokenVariants(token) {
  const variants = new Set([token]);
  if (token.endsWith("s") && token.length > 4) variants.add(token.slice(0, -1));
  for (const synonym of SYNONYMS[token] || []) variants.add(synonym);
  return [...variants];
}

// Content words are what the user is actually looking for. A query with content
// words only returns documents that mention at least one of them; otherwise
// every document gets a mid-range cosine score and unrelated results dominate.
function contentTokens(tokens) {
  return tokens.filter((token) => !INTENT_WORDS.has(token));
}

// Split a negated span into alternatives: "not in Bangalore or Pune" should
// exclude either city, not require both.
function negatedAlternatives(span) {
  return span
    .split(/\s+(?:or|and)\s+/)
    .map((part) => contentTokens(tokenize(part)).join(" "))
    .filter(Boolean)
    .map((phrase) => ({ phrase, tokens: phrase.split(" ") }));
}

// Separate the positive part of a query from the part that excludes records.
// Examples:
//   "alumni who don't work in Bangalore" -> positive "the alumni who",
//     negated [{ phrase: "bangalore" }]
//   "alumni in India not in Bangalore or Pune" -> positive "alumni in India",
//     negated ["bangalore", "pune"]
function parseSearchQuery(rawQuery) {
  const normalized = normalize(rawQuery);
  const negated = [];
  const positiveParts = [];
  let cursor = 0;

  NEGATION_RE.lastIndex = 0;
  let match = NEGATION_RE.exec(normalized);
  while (match) {
    const cueStart = match.index;
    const cueEnd = cueStart + match[0].length;
    const rest = normalized.slice(cueEnd);
    const boundary = rest.match(NEGATION_BOUNDARY_RE);
    const spanEnd = boundary ? cueEnd + boundary.index : normalized.length;
    const span = normalized.slice(cueEnd, spanEnd).trim();

    // Ignore a weak cue that is just part of a phrase, not a filter.
    if (WEAK_NEGATION_CUES.has(match[0]) && !NEGATION_FILTER_RE.test(span)) {
      NEGATION_RE.lastIndex = cueEnd;
      match = NEGATION_RE.exec(normalized);
      continue;
    }

    positiveParts.push(normalized.slice(cursor, cueStart));
    negated.push(...negatedAlternatives(span));

    cursor = spanEnd;
    NEGATION_RE.lastIndex = spanEnd;
    match = NEGATION_RE.exec(normalized);
  }
  positiveParts.push(normalized.slice(cursor));

  const positive = positiveParts.join(" ").replace(/\s+/g, " ").trim();
  const queryTokens = tokenize(positive);

  return {
    positive,
    queryTokens,
    content: contentTokens(queryTokens),
    negated,
  };
}

// A negated phrase matches when every one of its words appears in the record.
// Synonyms still apply, so "not in Bangalore" also excludes "Bengaluru".
function matchesNegated(doc, negated = []) {
  if (!negated.length) return false;
  const text = docText(doc);
  return negated.some(({ tokens }) =>
    tokens.length > 0 &&
    tokens.every((token) =>
      tokenVariants(token).some((variant) => includesPhrase(text, variant))
    )
  );
}

function docText(doc) {
  return normalize(
    `${doc.title || ""} ${doc.subtitle || ""} ${doc.body || ""} ${(
      doc.keywords || []
    ).join(" ")}`
  )
    // Sentence-ending periods otherwise stick to the final word and defeat
    // the space-padded phrase check ("Bengaluru." versus "bengaluru").
    .replace(/\.(?=\s|$)/g, "");
}

// Space-padded comparison so "ml" does not match "html" and "go" does not
// match "google".
function includesPhrase(text, phrase) {
  if (!phrase) return false;
  return ` ${text} `.includes(` ${phrase} `);
}

function matchesAnyToken(doc, tokens) {
  if (!tokens.length) return true;
  const text = docText(doc);
  return tokens.some((token) =>
    tokenVariants(token).some((variant) => includesPhrase(text, variant))
  );
}

function countTokenMatches(doc, tokens) {
  if (!tokens.length) return 0;
  const text = docText(doc);
  return tokens.reduce(
    (count, token) =>
      count +
      (tokenVariants(token).some((variant) => includesPhrase(text, variant))
        ? 1
        : 0),
    0
  );
}

function isUpcomingEvent(doc, now) {
  const raw = doc.meta?.startTime || doc.meta?.date;
  if (!raw) return true;
  const time = new Date(raw).getTime();
  if (Number.isNaN(time)) return true;
  return time >= now;
}

function detectIntent(query) {
  const text = normalize(query);
  let bestType = "";
  let bestScore = 0;

  for (const [type, patterns] of Object.entries(INTENT_PATTERNS)) {
    const hits = patterns.reduce(
      (count, pattern) => count + (pattern.test(text) ? 1 : 0),
      0
    );
    if (hits > bestScore) {
      bestScore = hits;
      bestType = type;
    }
  }

  return {
    type: bestType,
    confidence: bestScore ? Math.min(1, bestScore / 2) : 0,
  };
}

function lexicalScore(doc, queryTokens, phrase, content = []) {
  if (!queryTokens.length) return 0;
  const title = normalize(doc.title);
  const body = normalize(
    `${doc.subtitle || ""} ${doc.body || ""} ${(doc.keywords || []).join(" ")}`
  );

  let hits = 0;
  for (const token of queryTokens) {
    const variants = tokenVariants(token);
    if (variants.some((variant) => includesPhrase(title, variant))) {
      hits += 1.1;
    } else if (variants.some((variant) => includesPhrase(body, variant))) {
      hits += 0.6;
    }
  }

  let score = hits / (queryTokens.length * 1.1);

  // Matching more of the actual subject ("ml" + "bangalore") should beat a
  // document that only catches one incidental word.
  if (content.length > 1) {
    const text = `${title} ${body}`;
    const covered = content.filter((token) =>
      tokenVariants(token).some((variant) => includesPhrase(text, variant))
    ).length;
    score += 0.25 * (covered / content.length);
  }

  if (phrase && phrase.length >= 4) {
    if (includesPhrase(title, phrase)) score += 0.35;
    else if (includesPhrase(body, phrase)) score += 0.2;
  }
  return Math.min(1, score);
}

function canSee(user, doc) {
  if (!user || !doc) return false;
  if (doc.sourceType === "post") {
    return canViewPost(user, {
      user: doc.meta?.authorId,
      visibility: doc.meta?.visibility || [],
    });
  }
  if (doc.sourceType === "group") {
    const meta = doc.meta || {};
    if (meta.access === "OPEN") return true;
    if (user.isAdmin) return true;
    const userId = String(user._id || user.id || "");
    if (String(meta.ownerId || "") === userId) return true;
    return (meta.memberIds || []).map(String).includes(userId);
  }
  return true;
}

function makeSnippet(doc, queryTokens, max = 190) {
  const text = stripHtml(doc.body || "");
  if (!text) return doc.subtitle || "";
  const lower = text.toLowerCase();
  let index = -1;

  for (const token of queryTokens) {
    for (const variant of tokenVariants(token)) {
      const found = lower.indexOf(variant);
      if (found >= 0 && (index < 0 || found < index)) index = found;
    }
  }

  if (index < 0) return truncate(text, max);
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, start + max);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${
    end < text.length ? "…" : ""
  }`;
}

function jobDocument(job) {
  const keywords = [
    ...(job.skills || []),
    ...(job.requirements || []),
    job.job_type,
    job.location,
    job.work_mode,
    job.stipend,
    job.duration,
  ].filter(Boolean);

  return {
    sourceType: "job",
    sourceId: String(job._id),
    title: job.Job_name || "Untitled opportunity",
    subtitle: [job.job_type, job.location, job.work_mode]
      .filter(Boolean)
      .join(" · "),
    body: joinParts(job.Description, keywords.join(" ")),
    keywords,
    url: "/jobs",
    meta: {
      jobType: job.job_type || "",
      location: job.location || "",
      workMode: job.work_mode || "",
      deadline: job.Job_deadline || null,
      skills: (job.skills || []).slice(0, 8),
    },
  };
}

function userDocument(user) {
  const keywords = [
    ...(user.skills || []),
    user.organisation,
    user.designation,
    user.working_area,
    user.location,
    user.program,
    user.department,
    user.role,
  ].filter(Boolean);

  const roleLine =
    [user.designation, user.organisation].filter(Boolean).join(" at ") ||
    [user.role, user.program].filter(Boolean).join(" · ");

  return {
    sourceType: "alumni",
    sourceId: String(user._id),
    title: user.name || "Member",
    subtitle: roleLine,
    body: joinParts(
      user.bio,
      user.working_area,
      user.program,
      user.department,
      user.location,
      user.passing_year,
      keywords.join(" ")
    ),
    keywords,
    url: `/profile/${user._id}`,
    meta: {
      role: user.role || "",
      organisation: user.organisation || "",
      designation: user.designation || "",
      location: user.location || "",
      program: user.program || "",
      skills: (user.skills || []).slice(0, 8),
    },
  };
}

function postDocument(post) {
  return {
    sourceType: "post",
    sourceId: String(post._id),
    title: post.heading || "Untitled post",
    subtitle: ["Post", post.channel].filter(Boolean).join(" · "),
    body: stripHtml(post.text),
    keywords: [post.channel, post.name].filter(Boolean),
    url: `/posts/${post._id}`,
    meta: {
      authorId: post.user ? String(post.user) : "",
      visibility: Array.isArray(post.visibility) ? post.visibility : [],
      channel: post.channel || "",
      date: post.date || null,
    },
  };
}

function resourceDocument(resource) {
  return {
    sourceType: "resource",
    sourceId: String(resource._id),
    title: resource.title || "Resource",
    subtitle: ["Resource", resource.topic].filter(Boolean).join(" · "),
    body: joinParts(resource.topic, resource.title),
    keywords: [resource.topic].filter(Boolean),
    url: "/resources",
    meta: {
      topic: resource.topic || "",
      fileUrl: resource.fileUrl || "",
    },
  };
}

function eventDocument(event) {
  const when = event.startTime || event.Event_post_date;
  return {
    sourceType: "event",
    sourceId: String(event._id),
    title: event.title || "Event",
    subtitle: [
      "Event",
      when
        ? new Date(when).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "",
    ]
      .filter(Boolean)
      .join(" · "),
    body: joinParts(event.Description, event.Speaker),
    keywords: [event.Speaker, "event"].filter(Boolean),
    url: "/events",
    meta: {
      speaker: event.Speaker || "",
      startTime: event.startTime || event.Event_post_date || null,
    },
  };
}

function groupDocument(group) {
  return {
    sourceType: "group",
    sourceId: String(group._id),
    title: group.name || "Group",
    subtitle: ["Group", group.category, group.access].filter(Boolean).join(" · "),
    body: joinParts(group.description, group.guidelines, group.category),
    keywords: [group.category, group.access].filter(Boolean),
    url: `/groups/${group._id}`,
    meta: {
      access: group.access || "OPEN",
      ownerId: group.owner ? String(group.owner) : "",
      memberIds: (group.members || []).map((member) => String(member.user)),
    },
  };
}

async function collectDocuments() {
  const [jobs, users, posts, resources, events, groups] = await Promise.all([
    Job.find({ is_active: { $ne: false } }).lean(),
    User.find({ blocked: { $ne: true } })
      .select(
        "name role program department passing_year organisation location designation working_area skills bio isAdmin"
      )
      .lean(),
    Post.find({ group: null })
      .select("heading text channel visibility user name date")
      .lean(),
    Resource.find({}).lean(),
    Event.find({}).lean(),
    Group.find({}).lean(),
  ]);

  return [
    ...jobs.map(jobDocument),
    ...users.map(userDocument),
    ...posts.map(postDocument),
    ...resources.map(resourceDocument),
    ...events.map(eventDocument),
    ...groups.map(groupDocument),
  ];
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function rebuildSearchIndex({ batchSize = 16 } = {}) {
  const documents = await collectDocuments();
  if (!documents.length) {
    await SearchDocument.deleteMany({});
    return { indexed: 0, semantic: true, byType: {}, model: MODEL_NAME };
  }

  let semantic = true;
  const vectors = [];
  for (const batch of chunk(documents, batchSize)) {
    try {
      const embedded = await embedTexts(
        batch.map((doc) => `${doc.title}. ${doc.subtitle}. ${doc.body}`)
      );
      vectors.push(...embedded);
    } catch (err) {
      semantic = false;
      console.warn("[search] embedding failed; indexing text only:", err.message);
      break;
    }
  }

  const now = new Date();
  const operations = documents.map((doc, index) => ({
    updateOne: {
      filter: { sourceType: doc.sourceType, sourceId: doc.sourceId },
      update: {
        $set: {
          ...doc,
          embedding: semantic ? vectors[index] || [] : [],
          embeddingModel: semantic ? MODEL_NAME : "",
          indexedAt: now,
        },
      },
      upsert: true,
    },
  }));

  await SearchDocument.bulkWrite(operations, { ordered: false });

  const keep = documents.map((doc) => ({
    sourceType: doc.sourceType,
    sourceId: doc.sourceId,
  }));
  await SearchDocument.deleteMany({ $nor: keep });

  const byType = {};
  for (const doc of documents) {
    byType[doc.sourceType] = (byType[doc.sourceType] || 0) + 1;
  }

  return {
    indexed: documents.length,
    semantic,
    byType,
    model: MODEL_NAME,
  };
}

async function ensureSearchIndex() {
  const count = await SearchDocument.estimatedDocumentCount();
  if (count > 0) {
    // An index built with a different embedding model has incompatible vectors,
    // so rebuild instead of silently comparing BGE queries to MiniLM passages.
    const stale = await SearchDocument.countDocuments({
      embeddingModel: { $ne: MODEL_NAME },
    });
    if (!stale) return { indexed: count, built: false, model: MODEL_NAME };
  }
  return { ...(await rebuildSearchIndex()), built: true };
}

async function getIndexStats() {
  const byType = {};
  const rows = await SearchDocument.aggregate([
    { $group: { _id: "$sourceType", count: { $sum: 1 } } },
  ]);
  for (const row of rows) byType[row._id] = row.count;
  const latest = await SearchDocument.findOne()
    .sort({ indexedAt: -1 })
    .select("indexedAt")
    .lean();
  return {
    indexed: rows.reduce((total, row) => total + row.count, 0),
    byType,
    model: MODEL_NAME,
    lastIndexedAt: latest?.indexedAt || null,
  };
}

const SOURCE_MODELS = {
  job: Job,
  alumni: User,
  post: Post,
  resource: Resource,
  event: Event,
  group: Group,
};

const DOCUMENT_BUILDERS = {
  job: jobDocument,
  alumni: userDocument,
  post: postDocument,
  resource: resourceDocument,
  event: eventDocument,
  group: groupDocument,
};

// Whether a source record still belongs in the public index. Eligibility can
// change without a delete (blocked member, archived job, group discussion).
function belongsInIndex(sourceType, record) {
  if (!record) return false;
  if (sourceType === "alumni") return record.blocked !== true;
  if (sourceType === "job") return record.is_active !== false;
  if (sourceType === "post") return !record.group;
  return true;
}

async function removeSearchDocument(sourceType, sourceId) {
  if (!sourceType || !sourceId) return { removed: false };
  const result = await SearchDocument.deleteOne({
    sourceType,
    sourceId: String(sourceId),
  });
  return { removed: result.deletedCount > 0 };
}

// Index or refresh one record immediately. Used by the on-demand admin
// reindex route and by queueSearchRefresh after normal writes.
async function refreshSearchDocument(sourceType, sourceId) {
  const Model = SOURCE_MODELS[sourceType];
  const build = DOCUMENT_BUILDERS[sourceType];
  if (!Model || !build || !sourceId) {
    return { indexed: false, reason: "unknown source" };
  }

  let query = Model.findById(sourceId);
  if (sourceType === "alumni") query = query.select("-password");
  const record = await query.lean();
  if (!belongsInIndex(sourceType, record)) {
    await removeSearchDocument(sourceType, sourceId);
    return { indexed: false, removed: true };
  }

  const doc = build(record);
  let embedding = [];
  let semantic = false;
  try {
    const [vector] = await embedTexts([
      `${doc.title}. ${doc.subtitle}. ${doc.body}`,
    ]);
    embedding = vector || [];
    semantic = true;
  } catch (err) {
    console.warn(
      "[search] incremental embedding failed; indexing text only:",
      err.message
    );
  }

  await SearchDocument.updateOne(
    { sourceType, sourceId: doc.sourceId },
    {
      $set: {
        ...doc,
        embedding,
        embeddingModel: semantic ? MODEL_NAME : "",
        indexedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return {
    indexed: true,
    semantic,
    type: sourceType,
    id: doc.sourceId,
  };
}

// Fire-and-forget refresh so a create/update response never waits on the
// embedding model. Deletes use removeSearchDocument directly and are awaited.
function queueSearchRefresh(sourceType, sourceId) {
  if (!sourceType || !sourceId) return;
  setImmediate(() => {
    refreshSearchDocument(sourceType, sourceId).catch((err) => {
      console.warn("[search] background index refresh failed:", err.message);
    });
  });
}

// A member delete also removes their posts, so drop both kinds of document.
async function removeSearchDocumentsForUser(userId) {
  if (!userId) return { removed: 0 };
  const result = await SearchDocument.deleteMany({
    $or: [
      { sourceType: "alumni", sourceId: String(userId) },
      { sourceType: "post", "meta.authorId": String(userId) },
    ],
  });
  return { removed: result.deletedCount || 0 };
}


async function searchAll(
  user,
  rawQuery,
  { limit = 6, type = "", weights = {} } = {}
) {
  const query = String(rawQuery || "").trim().slice(0, 240);
  const boundedLimit = Math.max(1, Math.min(10, Number(limit) || 6));
  const semanticWeight = Number.isFinite(Number(weights.semantic))
    ? Math.max(0, Number(weights.semantic))
    : RANKING_WEIGHTS.semantic;
  const lexicalWeight = Number.isFinite(Number(weights.lexical))
    ? Math.max(0, Number(weights.lexical))
    : RANKING_WEIGHTS.lexical;

  await ensureSearchIndex();
  let documents = await SearchDocument.find({}).lean();

  let queryVector = [];
  let semantic = true;
  try {
    queryVector = await embedQuery(query);
  } catch (err) {
    semantic = false;
    console.warn("[search] query embedding failed; using lexical only:", err.message);
  }

  const parsed = parseSearchQuery(query);
  const queryTokens = parsed.queryTokens;
  const phrase = parsed.positive;
  const intent = detectIntent(query);
  const content = parsed.content;
  // "Alumni who do not work in Bangalore" names the record type explicitly.
  // Honour that instead of filling the page with groups, events and posts that
  // merely mention alumni.
  const restrictToIntent = Boolean(intent.type && parsed.negated.length);
  const wantsUpcoming = /\bupcoming\b/.test(phrase);
  const now = Date.now();
  const results = [];

  for (const doc of documents) {
    if (type && doc.sourceType !== type) continue;
    if (restrictToIntent && doc.sourceType !== intent.type) continue;
    if (!canSee(user, doc)) continue;
    // "Not in Bangalore" must remove those people, not rank them first.
    if (matchesNegated(doc, parsed.negated)) continue;
    if (wantsUpcoming && doc.sourceType === "event" && !isUpcomingEvent(doc, now)) {
      continue;
    }

    // A query with a concrete subject ("google", "placements", "python") must
    // mention that subject somewhere. Without this guard a purely semantic
    // score returns dozens of loosely related records.
    if (content.length && !matchesAnyToken(doc, content)) continue;

    const lexical = lexicalScore(doc, queryTokens, phrase, content);
    const semanticScore =
      semantic && queryVector.length && doc.embedding?.length
        ? Math.max(0, cosineSimilarity(queryVector, doc.embedding))
        : 0;

    let score = semantic
      ? semanticWeight * semanticScore + lexicalWeight * lexical
      : lexical;
    if (intent.type === doc.sourceType) score += 0.1;

    // Reward documents that cover every content word rather than one.
    if (content.length > 1) {
      const coverage = countTokenMatches(doc, content) / content.length;
      if (coverage === 1) score += 0.06;
    }

    const exact =
      phrase.length >= 4 &&
      (includesPhrase(normalize(doc.title), phrase) ||
        includesPhrase(normalize(doc.body), phrase));
    if (exact) score += 0.08;

    if (!exact && score < 0.3 && lexical < 0.35) continue;

    results.push({
      type: doc.sourceType,
      label: TYPE_LABELS[doc.sourceType],
      id: doc.sourceId,
      title: doc.title,
      subtitle: doc.subtitle,
      snippet: makeSnippet(doc, queryTokens),
      url: doc.url,
      score: Math.round(Math.min(1, score) * 100),
      meta: doc.meta || {},
    });
  }

  results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  const counts = {};
  for (const result of results) {
    counts[result.type] = (counts[result.type] || 0) + 1;
  }

  // If the member explicitly asked for one kind of record and none exist, say
  // so instead of presenting unrelated modules as if they answered the query.
  const requestedCount = intent.type ? counts[intent.type] || 0 : null;
  const notice =
    intent.type && requestedCount === 0 && results.length > 0
      ? `No ${TYPE_NOUNS[intent.type] || TYPE_LABELS[intent.type]} matched “${query}”. Showing related results from other modules.`
      : "";

  // Put the requested kind first: "posts about placements" should lead with
  // posts, not with an alumnus whose bio happens to mention placements.
  const groupOrder = intent.type
    ? [intent.type, ...TYPE_ORDER.filter((groupType) => groupType !== intent.type)]
    : TYPE_ORDER;

  const groups = groupOrder.map((groupType) => ({
    type: groupType,
    label: TYPE_LABELS[groupType],
    count: counts[groupType] || 0,
    items: results
      .filter((result) => result.type === groupType)
      .slice(0, boundedLimit),
  })).filter((group) => group.count > 0);

  return {
    query,
    engine: {
      semantic,
      model: semantic ? MODEL_NAME : "lexical-only",
      indexSize: documents.length,
      dimensions: EMBEDDING_DIM,
    },
    intent,
    requestedType: intent.type || "",
    requestedCount,
    notice,
    total: results.length,
    results: results.slice(0, boundedLimit * 4),
    groups,
  };
}

module.exports = {
  searchAll,
  rebuildSearchIndex,
  ensureSearchIndex,
  getIndexStats,
  refreshSearchDocument,
  removeSearchDocument,
  removeSearchDocumentsForUser,
  queueSearchRefresh,
  belongsInIndex,
  detectIntent,
  parseSearchQuery,
  matchesNegated,
  tokenize,
  contentTokens,
  matchesAnyToken,
  isUpcomingEvent,
  lexicalScore,
  canSee,
  TYPE_ORDER,
  TYPE_LABELS,
};
