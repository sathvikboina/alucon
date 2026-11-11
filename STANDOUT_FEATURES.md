# AlumniConnect — Standout Features

> The full inventory is the **Features** sheet in
> [`AlumniConnect_Changelog_and_Ideas.xlsx`](./AlumniConnect_Changelog_and_Ideas.xlsx).
> This page is the short list of features that are technically differentiated —
> the ones worth demoing, not the CRUD.

---

## 1. Unified semantic search across six modules

**Why it is not vanilla:** one query searches jobs, alumni, non-group posts,
resources, events and groups. `Xenova/bge-small-en-v1.5` runs locally at 384
dimensions; ranking is **0.6 cosine + 0.4 lexical + intent boost**, with a
content-token guard, exact-phrase boost and an upcoming-event filter. Post
visibility and private-group membership are enforced before ranking. No LLM
generates answers.

**See it:** `/search` → *Find ML internships in Bangalore* · *Find posts about
placements* · *Find resources* · *Find upcoming technical events*.

**Proof:** `server/services/searchIndex.js`, `server/services/embeddings.js`,
`server/models/SearchDocument.js`, `client/src/components/search/AISearch.jsx`.

**Honest limit:** six public modules; indexing is not incremental on write yet.

---

## 2. Explainable, deterministic internship and mentor matching

**Why it is not vanilla:** the same engine powers the job-board **Fit** panel,
`/internship-matches` and `/mentor-matches`. It runs hard constraints → skill
aliases and token overlap → contextual signals → an explanation, and returns
`model: "algorithm"`. No Gemini rerank, no match cache, no non-reproducible
scores. A role reports the same score everywhere.

**See it:** open a job → **Fit**; then `/internship-matches` and
`/mentor-matches`.

**Proof:** `server/services/matching.js`, `server/services/aiInsights.js`.

---

## 3. Hybrid feed recommender with real ranking signals

**Why it is not vanilla:** the **For you** tab blends TF-IDF content
similarity, item-item collaborative filtering, a Bayesian-smoothed engagement
prior, freshness decay, follow affinity and topic/author affinity. It adds
MMR-style diversity and 10% ε-greedy exploration seeded deterministically per
user per day (mulberry32 + FNV-1a). No LLM and no embeddings.

**See it:** **For you** tab; every card carries a `✦` reason chip.

**Proof:** `server/services/recommender.js`.

---

## 4. On-demand grounded briefing with citations

**Why it is not vanilla:** the briefing is generated only when the member clicks
**Generate briefing**, not on every feed load. Themes, counts, events and people
are computed in Mongo; the model only writes the prose. Every answer cites a
`sources[]` array. It is cached for 6 h, can be refreshed only by an admin, and
falls back to a labelled extractive result when no key is configured.

**See it:** feed right rail → **Generate briefing**.

**Proof:** `server/services/aiInsights.js`,
`client/src/components/posts/Posts.jsx`.

---

## 5. Long-thread TL;DR with an open question and suggested reply

**Why it is not vanilla:** the summary is gated to threads with **≥2 replies and
a post body of ≥750 words**, so it does not waste a model call on short posts.
It returns three bullets, the open question and a suggested reply, cached for
24 h with an offline fallback.

**See it:** open a long post → **AI TL;DR**.

**Proof:** `client/src/components/posts/PostCard.jsx`,
`server/services/aiInsights.js`.

---

## 6. Private groups with real access modes and AI isolation

**Why it is not vanilla:** hubs support **OPEN / REQUEST / INVITE** membership,
an owner-only Manage tab, join-request approvals and invite-by-email. Group
threads are deliberately excluded from unified search, **For you** and the
briefing; non-members get a 404 rather than a 403. The group directory itself is
indexed and filtered by membership.

**See it:** Community → Groups & Cohorts; try a private hub as a non-member.

**Proof:** `server/models/Group.js`, `canViewGroupPost`,
`server/services/searchIndex.js`.

---

## 7. Mentorship workflow with atomic guarantees

**Why it is not vanilla:** the lifecycle is explicit —
`pending → accepted → active → completed` (or `declined`) — with server-side
transition guards. Duplicate requests are blocked by a unique partial index;
capacity is checked under a per-mentor keyed mutex, so two simultaneous accepts
cannot overbook a mentor. The race is covered by a regression test.

**See it:** `/mentor-matches` → request; `/mentorship` dashboard; run
`npm test`.

**Proof:** `server/models/MentorShipRequest.js`,
`server/utils/keyedMutex.js`, `server/tests/security.test.js`.

---

## 8. Real-time messenger with receipts and reactions

**Why it is not vanilla:** Socket.IO rooms per conversation, a JWT-verified
handshake with membership checks, optimistic sending, typing indicators,
per-user read receipts, reactions, sender-only edits, per-user delete/mute and
unread counts.

**See it:** open two browser sessions and message between them.

**Proof:** `server/sockets`, `client/src/components/messenger`.

---

## 9. Security regression suite against the real API

**Why it is not vanilla:** the tests start the real Express API against a
throwaway MongoDB database and cover **19 unauthenticated writes**, admin-only
Showcase writes, private-group 404s, mentorship duplicate/transition/capacity
rules and the parallel-accept race. The suite seeds its own users, group and
post, signs its own JWTs and drops the database afterwards.

**See it:** `cd server && npm test` → **32/32 passing**.

**Proof:** `server/tests/security.test.js`, `server/tests/search.test.js`.

---

## What is deliberately not on this list

Authentication, profile CRUD, admin tables, notification dropdowns and generic
event/resource pages. They exist and work, but they are table stakes. This page
is the differentiators.

---

## Effort reality — do the next phases need high effort?

| Phase | Active items | Estimate | Verdict |
|---|---:|---:|---|
| **P0 — Search trust** | 5 | ~20 h | ~2.5 focused days; all M, no L |
| **P1 — BGE matching** | 3 | ~5 h | Low |
| **P2 — On-demand AI** | 6 | ~15.5 h | Moderate |
| **P3 — Product completeness** | 15 | ~37.5 h | Largest phase, but 15 small/medium items; stage it |
| **P4 — Production hardening** | 9 | ~16.5 h + external accounts | Mostly config and verification |

**No item is L-sized.** The active plan is **5 XS, 16 S, 17 M, 0 L** — about
**94.5 focused hours** in total (~12 eight-hour days). The effort is cumulative,
not concentrated.

### Lean paths

- **2 days:** `F-35` incremental indexing + `F-27` demo data. Search becomes
  credible on live content and all six example queries return the right type.
- **1 week:** the P0 set — `F-35`, `F-27`, `F-37`, `F-28` (`F-36` coverage
  decision is optional).
- **2 weeks:** P0 + P1 (`F-19`, `F-13`, `F-14`).
- **P2 and P3** can be staged or deferred; **P4** runs before production.
