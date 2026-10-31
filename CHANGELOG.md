# Changelog

All notable changes to AlumniConnect are recorded here. Entries name the exact
software, data structures and algorithms used, so the implementation can be
audited without reading every file.

---

## [2026-10-30] — Feed Phase 0 + Phase 1: behavioural signals and hybrid ranking

Scope: capture how signed-in users use the feed, then use those signals to rank
the **For you** tab. `Latest` and `Following` are unchanged.

### Software and runtime

| Component | Version / detail |
|---|---|
| Node.js | v20.20.2 |
| Express | 4.18.2 |
| MongoDB | 7.x, local Docker container `alumni-mongo` |
| Mongoose | 7.6.1 |
| React | 18.2.0 (Create React App 5.0.1) |
| HTTP client | Axios 0.21.4 (`client/src/utils/api.js`) |
| Browser APIs | `IntersectionObserver`, `MutationObserver`, `Page Visibility API` (`visibilitychange`), `fetch` with `keepalive: true`, `crypto.randomUUID()`, `sessionStorage` |
| New npm packages | **none** |

**No LLM, no RAG, no embedding model, no vector database, and no third-party
API is used in this phase.** Ranking is deterministic statistics computed in
Node from MongoDB documents. (The Gemini/Mistral AI features from earlier
changes are unrelated and untouched.)

### Added — data model

`server/models/FeedEvent.js` — collection `feed_events`.

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId → `user` | required, indexed |
| `type` | String enum | `impression`, `click`, `dwell`, `like`, `comment`, `share`, `follow`, `search`, `topic_view`, `not_interested`, `report` |
| `post` | ObjectId → `post` | nullable for search/topic events |
| `channel` | String | denormalised from the post at write time |
| `author` | ObjectId → `user` | denormalised from the post at write time |
| `query` | String | search text, truncated to 120 chars |
| `value` | Number | dwell seconds, clamped to 0–300 |
| `surface` | String | `feed`, `post`, etc. |
| `sessionId` | String | client-generated UUID |
| `createdAt` | Date | default `now` |

Indexes:

- `{ user: 1, createdAt: -1 }`
- `{ post: 1, type: 1, createdAt: -1 }`
- `{ author: 1, createdAt: -1 }`
- TTL index `{ createdAt: 1 }` with `expireAfterSeconds: 7776000` (90 days)

### Added — API

Mounted at `/api/feed` in `server/server.js`.

**`POST /api/feed/events`** (auth required)

- Body: `{ "events": [ ... ] }`, 1–50 events per batch.
- Rejects unknown event types with `400`.
- Skips events whose `postId` no longer resolves (deleted post) without failing
  the batch.
- Enriches `channel` and `author` from the referenced post.
- In-memory per-user limit: **600 events/minute**; excess returns `429`.
- Invalidates the user's ranking cache.
- Response: `{ "accepted": n }`.

**`POST /api/feed/reset`** (auth required)

- `deleteMany({ user })` on `feed_events`, invalidates the ranking cache.
- Response: `{ "reset": true, "deleted": n }`.

**`GET /api/feed/for-you?limit=30&channel=`** (auth required)

- `limit` clamped to 1–50 (default 30); optional channel filter.
- Loads up to 200 candidates, applies `canViewPost()` and excludes authors in
  the viewer's `blockedUsers`.
- Loads the last 30 days of events (max 3,000 rows) plus up to 10 engaged posts
  for similarity.
- Response:

```json
{
  "posts": [ { "...post": "...", "feed": { "score": 87, "reason": "...", "exploration": false, "components": {} } } ],
  "meta": { "algorithm": "hybrid-v1", "personalized": true, "eventCount": 11, "candidateCount": 38, "explorationSlots": 3, "generatedAt": "..." }
}
```

### Added — recommender

`server/services/recommender.js` — a **hybrid recommender system** combining
content-based filtering, item-item collaborative filtering, popularity,
recency and social signals.

**1. Exponential time decay for affinities**

Topic and author affinity are sums of decayed event weights:

```
weight(event) = baseWeight(type) × 0.5 ^ (ageDays / 7)
```

Half-life: **7 days**. Base weights:

| Event | Weight |
|---|---|
| impression | 0.2 |
| click | 1.2 |
| dwell | 0.4 + 1.0 × min(seconds, 30) / 30 (range 0.4–1.4) |
| like | 3 |
| comment | 4 |
| share | 2 |
| follow | 2 |
| search | 2.5 |
| topic_view | 2.5 |
| not_interested | −6 |
| report | −8 |

Affinities are max-normalised by the largest absolute value, then clamped to
`[-1, 1]`; negative values are floored at 0 during scoring.

**2. Content-based filtering — TF-IDF + cosine similarity**

- Tokenisation: lowercase, split on non-alphanumeric characters, drop tokens
  of length ≤ 2 and a 65-word English stop list.
- Sublinear term frequency: `1 + ln(tf)`.
- Smoothed inverse document frequency: `ln((N + 1) / (df + 1)) + 1`.
- L2-normalised vectors; similarity is the dot product (cosine).
- HTML is stripped from post bodies before tokenisation.

**3. Item-item collaborative filtering**

- Each post gets a set of user ids that liked, commented on, clicked, shared or
  dwelled on it (from Mongo posts + `feed_events`).
- Item similarity is the cosine over those sets:
  `|A ∩ B| / sqrt(|A| × |B|)`.

**4. Hybrid item similarity**

For each candidate, similarity is the maximum over the user's 8 most recent
engaged posts of:

```
0.5 × TF-IDF cosine + 0.5 × collaborative set cosine
```

**5. Bayesian-smoothed engagement prior**

```
prior = (likes + 2 × comments + 1.5) / (likes + 2 × comments + 6)
```

Pseudo-counts: 6, implied prior 0.25. Prevents a 0-like post from scoring 0 and
a 1-like post from scoring 1.

**6. Recency**

```
freshness = 0.5 ^ (ageHours / 48)
```

Half-life: **48 hours**.

**7. Final score**

```
score = 0.30 × topicAffinity
      + 0.18 × authorAffinity
      + 0.15 × hybridSimilarity
      + 0.15 × engagementPrior
      + 0.10 × freshness
      + 0.07 × followBoost
```

Corrections:

- own post: × 0.55
- seen (impression) but never clicked: × 0.70
- clicked before: × 1.05
- `not_interested` / `report`: excluded entirely

**8. Diversity re-ranking**

Greedy selection with exponential repetition penalties:

```
adjusted = score × 0.82 ^ (author already chosen) × 0.9 ^ (channel already chosen)
```

Hard cap: after 2 posts from the same author, an additional × 0.5 penalty.
This is a greedy approximation of **MMR (maximal marginal relevance)**.

**9. Exploration — ε-greedy**

- 10% of slots (rounded, minimum 1) are reserved for posts outside the top
  ranked set.
- Randomness is deterministic per user per day: **mulberry32** PRNG seeded with
  an **FNV-1a hash** of `userId:YYYY-MM-DD`.
- Exploration items are labelled `"New for you"` and flagged
  `feed.exploration = true`.

**10. Cold start**

- `meta.personalized` is `false` until the user has **3 deliberate events**
  (anything except `impression`); impressions alone are weak evidence.
- With few or no events, ranking falls back to engagement prior + freshness +
  follows, so the feed is still sensible.
- Users with no history see "Learning your feed" in the UI.

**11. Caching**

- In-process `Map` keyed by `userId:limit:channel`, TTL **60 seconds**.
- Invalidated on event ingest and reset.
- Per-process only; a shared cache (Redis) would be needed for multi-instance
  deployments.

### Added — client instrumentation

`client/src/utils/feedTracking.js`

- In-memory event queue, flushed every **4 seconds**, at **50 events**, on
  `visibilitychange → hidden`, and on `pagehide`.
- Final flush uses `fetch(..., { keepalive: true })` because
  `navigator.sendBeacon` cannot attach the `x-auth-token` header.
- **Impression**: card ≥ 50% visible for **800 ms**, once per post per session
  (`IntersectionObserver`, threshold 0.5).
- **Dwell**: time visible, recorded on exit, minimum **2 s**, capped at **30 s**.
- `MutationObserver` re-attaches the observer when cards render asynchronously.
- `resetFeedRecommendations()` clears the local queue and calls
  `POST /api/feed/reset`.

Wired into:

- `PostCard.jsx` — impression/dwell via `data-post-id` and `data-channel`,
  click on title/comments/read-more, like on the like button.
- `PostDisplay.jsx` — comment event after a successful reply.
- `Posts.jsx` — search and topic-view events, ranked feed loading, reset,
  stale-feed indicator, and impression observer lifecycle.

### Changed — feed UI

- **For you** now calls `GET /api/feed/for-you` (limit 50) and renders the
  server-ranked list. `Latest` and `Following` keep the existing Redux/Mongo
  path. The ranked order is merged with the latest Redux post objects so a
  like/comment updates the card without losing its `feed.reason`.
- Search and topic views still use `GET /api/posts/search` (Mongo text index).
- New per-card reason chip: `✦ Because you engage with Research`,
  `✦ More from <author>`, `✦ You follow <author>`,
  `✦ Similar to a post you engaged with`, `✦ Popular in <channel> this week`,
  `✦ New for you`.
- New tabs-row status: `✦ Personalized` / `Learning your feed`.
- New `Update feed` button appears after a like/comment when the ranking is
  stale, so the feed does not jump while the user is reading. It flushes the
  pending event batch before refetching, so the new ranking always includes the
  interaction that triggered it.
- New `Reset` button deletes the user's behavioural history and re-ranks.
- Additive CSS only: `.feed-tabs-row`, `.feed-tabs-meta`,
  `.feed-personalized`, `.feed-update`, `.feed-reset`, `.feed-reason`.

### Files

Added:

- `server/models/FeedEvent.js`
- `server/services/recommender.js`
- `server/routes/api/feed.js`
- `client/src/utils/feedTracking.js`
- `CHANGELOG.md`

Modified:

- `server/server.js` (mount `/api/feed`)
- `client/src/components/posts/Posts.jsx`
- `client/src/components/posts/PostCard.jsx`
- `client/src/components/posts/PostDisplay.jsx`
- `client/src/components/posts/Posts.css`
- `client/src/components/posts/PostCard.css`
- `README.md`

### Verification (2026-10-30, local stack)

| Check | Result |
|---|---|
| Baseline `GET /api/feed/for-you` | 200, 30 posts, 38 candidates, `personalized: false`, `eventCount: 0` |
| Research posts in baseline top 10 | 3 / 10 |
| Ingest 11 events (3 clicks, 3 dwells, 3 likes, 1 topic view, 1 search) | `accepted: 11`, 200 |
| After ingest | `personalized: true`, `eventCount: 11`, Research 6 / 10, top score 87, reason `Because you engage with Research` |
| 5 impressions only | `personalized: false` (impressions are weak evidence) |
| 5 impressions + 1 click + 2 dwells | `personalized: true`, top post Research |
| `POST /api/feed/reset` | `deleted: 11`, baseline restored (Research 3 / 10, `personalized: false`) |
| `not_interested` on top post | post absent from subsequent ranking |
| Cold start (Riya, 0 events) | `personalized: false`, 37 candidates, popularity/recency reasons |
| Unauthenticated event post | 401 |
| Unknown event type | 400 `Unknown event type` |
| 51-event batch | 400 `Too many events in one batch (max 50)` |
| Burst rate limit | 11 × 50 accepted, 12th and 13th → 429 |
| Client compile | `webpack compiled with 1 warning` (pre-existing hooks warnings only) |

### Known limits

- Ranking data is per user and per process; the 60 s cache and 600/min limiter
  are in-memory and reset on server restart.
- Events older than 30 days are ignored by ranking; rows expire after 90 days.
- Dwell time is an approximation from viewport visibility; it does not measure
  actual reading.
- No cross-device identity merge; `sessionId` is recorded but not used for
  ranking.
- Content similarity is lexical TF-IDF, not semantic embeddings. Phase 2
  (MiniLM embeddings) is not part of this change.
- Exploration is deterministic per day, not per request.

### Rollback

No schema migration or environment variable is required. Revert the files above
and remove the `/api/feed` mount; existing posts, likes and comments are
unaffected. Deleting the `feed_events` collection removes all behavioural data.
