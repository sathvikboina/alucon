// Hybrid feed recommender (phase 1).
//
// Signals come from two places:
//   1. Implicit behaviour in `feed_events` (impressions, clicks, dwell, likes,
//      comments, searches, topic views) with exponential time decay.
//   2. Explicit engagement already stored on posts (likes/comments), used for
//      item-item collaborative similarity and a Bayesian engagement prior.
//
// Ranking is deliberately statistics-first: no LLM, no embeddings, no vector
// database. Everything here is deterministic for a given event set (except the
// seeded exploration slot) and runs in a few milliseconds for a feed-sized
// candidate set.

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const AFFINITY_HALF_LIFE_DAYS = 7;
const FRESHNESS_HALF_LIFE_HOURS = 48;
const CACHE_TTL_MS = 60 * 1000;

// How much each interaction contributes to topic/author affinity.
const EVENT_WEIGHTS = {
  impression: 0.2,
  click: 1.2,
  dwell: 0.8, // replaced by a 0.4..1.4 value based on seconds
  like: 3,
  comment: 4,
  share: 2,
  follow: 2,
  search: 2.5,
  topic_view: 2.5,
  not_interested: -6,
  report: -8,
};

// Relative importance of each scoring component. They sum to 1.0.
const SCORE_WEIGHTS = {
  topic: 0.3,
  author: 0.18,
  similarity: 0.15,
  prior: 0.15,
  freshness: 0.1,
  follow: 0.07,
};

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "has", "had",
  "are", "was", "were", "will", "would", "can", "could", "should", "not",
  "but", "you", "your", "our", "their", "they", "them", "his", "her", "its",
  "about", "into", "over", "under", "than", "then", "when", "what", "which",
  "who", "how", "why", "all", "any", "one", "two", "more", "most", "some",
  "just", "like", "also", "been", "being", "because", "after", "before",
  "there", "here", "very", "much", "many", "make", "made", "get", "got",
]);

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function tokenize(value) {
  return stripHtml(value)
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.replace(/^\.+|\.+$/g, ""))
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

// TF-IDF vectors with sublinear term frequency and L2 normalisation. This is
// the content-based half of the hybrid; it gives sensible neighbours even when
// only a handful of users have co-engaged with anything.
function buildTfIdf(docs) {
  const tokenSets = docs.map((doc) => tokenize(doc));
  const documentFrequency = new Map();
  tokenSets.forEach((tokens) => {
    new Set(tokens).forEach((token) => {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    });
  });

  const total = Math.max(1, docs.length);
  return tokenSets.map((tokens) => {
    const termFrequency = new Map();
    tokens.forEach((token) => {
      termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
    });

    const vector = new Map();
    let norm = 0;
    termFrequency.forEach((count, token) => {
      const idf = Math.log((total + 1) / ((documentFrequency.get(token) || 0) + 1)) + 1;
      const weight = (1 + Math.log(count)) * idf;
      vector.set(token, weight);
      norm += weight * weight;
    });

    const length = Math.sqrt(norm) || 1;
    vector.forEach((weight, token) => vector.set(token, weight / length));
    return vector;
  });
}

function cosineMaps(a, b) {
  if (!a || !b) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  small.forEach((weight, token) => {
    const other = large.get(token);
    if (other) dot += weight * other;
  });
  return Math.max(0, Math.min(1, dot));
}

// Item-item collaborative similarity: cosine over the sets of users who
// liked, commented on, or clicked a post.
function buildEngagementSets(posts, events) {
  const sets = new Map();

  const add = (postId, userId) => {
    if (!postId || !userId) return;
    const key = String(postId);
    if (!sets.has(key)) sets.set(key, new Set());
    sets.get(key).add(String(userId));
  };

  posts.forEach((post) => {
    (post.likes || []).forEach((like) => add(post._id, like.user));
    (post.comments || []).forEach((comment) => add(post._id, comment.user));
  });

  events.forEach((event) => {
    if (
      event.post &&
      event.user &&
      ["click", "like", "comment", "share", "dwell"].includes(event.type)
    ) {
      add(event.post, event.user);
    }
  });

  return sets;
}

function setCosine(a, b) {
  if (!a || !b || a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  small.forEach((value) => {
    if (large.has(value)) intersection += 1;
  });
  return intersection / Math.sqrt(a.size * b.size);
}

function eventWeight(event) {
  if (event.type === "dwell") {
    const seconds = Math.max(0, Math.min(30, Number(event.value) || 0));
    return 0.4 + (seconds / 30) * 1.0;
  }
  return EVENT_WEIGHTS[event.type] ?? 0;
}

function decayedWeight(event, now) {
  const ageDays = Math.max(0, (now - new Date(event.createdAt).getTime()) / DAY_MS);
  return eventWeight(event) * Math.pow(0.5, ageDays / AFFINITY_HALF_LIFE_DAYS);
}

function buildAffinities(events, now) {
  const topic = new Map();
  const author = new Map();

  events.forEach((event) => {
    const weight = decayedWeight(event, now);
    if (!weight) return;
    if (event.channel) {
      const key = String(event.channel);
      topic.set(key, (topic.get(key) || 0) + weight);
    }
    if (event.author) {
      const key = String(event.author);
      author.set(key, (author.get(key) || 0) + weight);
    }
  });

  return { topic: normalise(topic), author: normalise(author) };
}

function normalise(map) {
  let max = 0;
  map.forEach((value) => {
    max = Math.max(max, Math.abs(value));
  });
  if (max <= 0) return new Map();

  const result = new Map();
  map.forEach((value, key) => {
    result.set(key, Math.max(-1, Math.min(1, value / max)));
  });
  return result;
}

// Bayesian-style engagement prior: a post with no engagement sits at 0.25,
// and the score saturates instead of growing without bound.
function engagementPrior(post) {
  const likes = (post.likes || []).length;
  const comments = (post.comments || []).length;
  const evidence = likes + comments * 2;
  return (evidence + 1.5) / (evidence + 6);
}

function buildSeenMaps(events) {
  const impressions = new Map();
  const clicks = new Map();
  const dismissed = new Set();

  events.forEach((event) => {
    if (!event.post) return;
    const key = String(event.post);
    if (event.type === "impression") {
      impressions.set(key, (impressions.get(key) || 0) + 1);
    } else if (event.type === "click") {
      clicks.set(key, (clicks.get(key) || 0) + 1);
    } else if (event.type === "not_interested" || event.type === "report") {
      dismissed.add(key);
    }
  });

  return { impressions, clicks, dismissed };
}

function recentEngagedIds(events, limit = 8) {
  const ids = [];
  const seen = new Set();
  for (const event of events) {
    if (!event.post) continue;
    if (!["click", "like", "comment", "share", "dwell"].includes(event.type)) continue;
    const key = String(event.post);
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push(key);
    if (ids.length >= limit) break;
  }
  return ids;
}

function buildSimilarityScores(posts, engagedPosts, events) {
  const allPosts = [...posts];
  const known = new Set(posts.map((post) => String(post._id)));
  engagedPosts.forEach((post) => {
    if (!known.has(String(post._id))) {
      known.add(String(post._id));
      allPosts.push(post);
    }
  });

  const vectors = buildTfIdf(
    allPosts.map((post) => `${post.heading || ""} ${post.text || ""}`)
  );
  const vectorById = new Map(
    allPosts.map((post, index) => [String(post._id), vectors[index]])
  );
  const engagementSets = buildEngagementSets(allPosts, events);

  const engaged = recentEngagedIds(events);
  if (engaged.length === 0) return new Map();

  const scores = new Map();
  posts.forEach((post) => {
    const id = String(post._id);
    const contentVector = vectorById.get(id);
    const engagementSet = engagementSets.get(id);

    let best = 0;
    engaged.forEach((engagedId) => {
      if (engagedId === id) return;
      const content = cosineMaps(contentVector, vectorById.get(engagedId));
      const collaborative = setCosine(engagementSet, engagementSets.get(engagedId));
      best = Math.max(best, 0.5 * content + 0.5 * collaborative);
    });

    scores.set(id, Math.max(0, Math.min(1, best)));
  });

  return scores;
}

function scoreCandidates({ posts, events, user, now, engagedPosts }) {
  const { topic, author } = buildAffinities(events, now);
  const similarity = buildSimilarityScores(posts, engagedPosts, events);
  const { impressions, clicks, dismissed } = buildSeenMaps(events);
  const followed = new Set((user.followings || []).map(String));
  const userId = String(user._id);

  return posts
    .filter((post) => !dismissed.has(String(post._id)))
    .map((post) => {
      const id = String(post._id);
      const authorId = post.user ? String(post.user) : "";
      const channel = post.channel || "General";

      const components = {
        topic: Math.max(0, topic.get(channel) || 0),
        author: Math.max(0, author.get(authorId) || 0),
        similarity: similarity.get(id) || 0,
        prior: engagementPrior(post),
        freshness: Math.pow(
          0.5,
          Math.max(0, now - new Date(post.date || now).getTime()) / HOUR_MS / FRESHNESS_HALF_LIFE_HOURS
        ),
        follow: followed.has(authorId) ? 1 : 0,
      };

      let score =
        SCORE_WEIGHTS.topic * components.topic +
        SCORE_WEIGHTS.author * components.author +
        SCORE_WEIGHTS.similarity * components.similarity +
        SCORE_WEIGHTS.prior * components.prior +
        SCORE_WEIGHTS.freshness * components.freshness +
        SCORE_WEIGHTS.follow * components.follow;

      // Small corrections that keep the feed useful without hiding anything.
      if (authorId === userId) score *= 0.55;
      const seen = impressions.get(id) || 0;
      const clicked = clicks.get(id) || 0;
      if (seen > 0 && clicked === 0) score *= 0.7;
      if (clicked > 0) score *= 1.05;

      return {
        post,
        id,
        authorId,
        channel,
        score: Math.max(0, Math.min(1, score)),
        components,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// Greedy diversity re-ranking: exponential penalty for repeating an author or
// a channel, with a hard cap of two posts per author.
function diversify(scored, limit) {
  const remaining = [...scored];
  const chosen = [];
  const authorCount = new Map();
  const channelCount = new Map();

  while (chosen.length < limit && remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const authors = authorCount.get(candidate.authorId) || 0;
      const channels = channelCount.get(candidate.channel) || 0;

      let adjusted =
        candidate.score *
        Math.pow(0.82, authors) *
        Math.pow(0.9, channels);
      if (authors >= 2) adjusted *= 0.5;

      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestIndex = index;
      }
    }

    const [picked] = remaining.splice(bestIndex, 1);
    picked.finalScore = bestScore;
    chosen.push(picked);
    authorCount.set(picked.authorId, (authorCount.get(picked.authorId) || 0) + 1);
    channelCount.set(picked.channel, (channelCount.get(picked.channel) || 0) + 1);
  }

  return chosen;
}

// Deterministic PRNG so the exploration slot is stable for a user on a given
// day (mulberry32 seeded with an FNV-1a hash).
function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function addExploration(chosen, scored, { userId, limit, dismissed }) {
  const slots = Math.max(1, Math.round(limit * 0.1));
  if (chosen.length >= limit) return chosen;

  const chosenIds = new Set(chosen.map((entry) => entry.id));
  const pool = scored.filter(
    (entry) => !chosenIds.has(entry.id) && !dismissed.has(entry.id)
  );
  if (pool.length === 0) return chosen;

  const day = new Date().toISOString().slice(0, 10);
  const random = mulberry32(hashString(`${userId}:${day}`));

  for (let slot = 0; slot < slots && chosen.length < limit && pool.length > 0; slot += 1) {
    const index = Math.floor(random() * pool.length);
    const [picked] = pool.splice(index, 1);
    chosen.push({ ...picked, exploration: true, finalScore: picked.score });
  }

  return chosen;
}

function reasonFor(entry, { followed }) {
  if (entry.exploration) return "New for you";

  const { components } = entry;
  const candidates = [
    ["follow", components.follow * SCORE_WEIGHTS.follow],
    ["topic", components.topic * SCORE_WEIGHTS.topic],
    ["author", components.author * SCORE_WEIGHTS.author],
    ["similarity", components.similarity * SCORE_WEIGHTS.similarity],
    [
      "popular",
      components.prior * SCORE_WEIGHTS.prior +
        components.freshness * SCORE_WEIGHTS.freshness,
    ],
  ].sort((a, b) => b[1] - a[1]);

  const winner = candidates[0][0];
  if (winner === "follow") return `You follow ${entry.post.name || "this author"}`;
  if (winner === "topic") return `Because you engage with ${entry.channel}`;
  if (winner === "author") return `More from ${entry.post.name || "this author"}`;
  if (winner === "similarity") return "Similar to a post you engaged with";
  return `Popular in ${entry.channel} this week`;
}

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

const cache = new Map();

function cacheKey(userId, limit, channel) {
  return `${userId}:${limit}:${channel || ""}`;
}

function readCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache(key, value) {
  cache.set(key, { value, createdAt: Date.now() });
}

function invalidateFeedCache(userId) {
  const prefix = `${userId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

function rankFeed({ user, posts, events, engagedPosts = [], limit = 30, channel = "" }) {
  const userId = String(user._id);
  const key = cacheKey(userId, limit, channel);
  const cached = readCache(key);
  if (cached) return { ...cached, cached: true };

  const now = Date.now();
  const scored = scoreCandidates({ posts, events, user, now, engagedPosts });
  const { dismissed } = buildSeenMaps(events);
  const followed = new Set((user.followings || []).map(String));

  const explorationSlots = Math.max(1, Math.round(limit * 0.1));
  const core = diversify(scored, Math.max(1, limit - explorationSlots));
  const withExploration = addExploration(core, scored, {
    userId,
    limit,
    dismissed,
  });

  const ranked = withExploration.slice(0, limit).map((entry) => ({
    ...entry.post,
    feed: {
      score: Math.round((entry.finalScore ?? entry.score) * 100),
      reason: reasonFor(entry, { followed }),
      exploration: Boolean(entry.exploration),
      components: {
        topic: round(entry.components.topic),
        author: round(entry.components.author),
        similarity: round(entry.components.similarity),
        prior: round(entry.components.prior),
        freshness: round(entry.components.freshness),
        follow: round(entry.components.follow),
      },
    },
  }));

  const result = {
    posts: ranked,
    meta: {
      algorithm: "hybrid-v1",
      // Impressions alone are weak evidence; require a few deliberate actions.
      personalized:
        events.filter((event) => event.type !== "impression").length >= 3,
      eventCount: events.length,
      candidateCount: posts.length,
      explorationSlots: ranked.filter((post) => post.feed.exploration).length,
      generatedAt: new Date().toISOString(),
    },
  };

  writeCache(key, result);
  return result;
}

module.exports = {
  rankFeed,
  invalidateFeedCache,
  // Exported for verification scripts.
  _internals: {
    tokenize,
    buildTfIdf,
    cosineMaps,
    engagementPrior,
    decayedWeight,
    mulberry32,
    hashString,
  },
};
