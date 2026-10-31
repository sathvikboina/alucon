# AlumniConnect — Security & UI Audit

**Date:** 2026-10-30  
**Scope:** Express API, MongoDB models, Socket.IO, React render paths, global CSS and responsive layouts.  
**Method:** Route-by-route static review, live `curl` checks against `http://localhost:5001`, Socket.IO handshake tests, and a production client build.

---

## 1. Fixed and verified

| Severity | Issue | Fix | Evidence |
| --- | --- | --- | --- |
| Critical | `POST /api/profile/` had auth commented out and trusted `req.body.userID`, allowing anyone to overwrite any member's profile. | Added `auth`; identity now comes only from `req.user.id`. | Unauthenticated write → `401`; authenticated write → `200`. |
| Critical | `server/models/User.js` created a head admin with the hardcoded demo password on every non-test boot, including production. | The bootstrap now requires `ADMIN_EMAIL` / `ADMIN_PASSWORD` in production; without a password it skips creation and warns. The demo password applies only outside production. | Production boot without `ADMIN_PASSWORD` created 0 users and the demo admin login returned `400`; with `ADMIN_PASSWORD` the env admin logged in `200`. |
| High | `seedDemo` would create the full demo account set with the shared `alumni123#` password in any environment. | The script exits with code 1 when `NODE_ENV=production`. | `NODE_ENV=production node scripts/seedDemo.js` → exit 1, no database writes. |
| Low | A missing JWT secret was only discovered on the first authenticated request. | The server now exits at boot with a clear message when neither `JWT_SECRET` nor `ACCESS_TOKEN_SECRET` is set. | Boot with both secrets unset → exit 1. |
| High | Bcrypt password hashes were returned by login (`user_data`), `GET /api/users/me` and `GET /api/users/search/:query`. | `password` is now `select: false`; login/reset opt in with `.select("+password")`; login returns a password-free copy. | Login, `/me` and `/search/all` contain no `password` field. |
| High | Notifications could be read, created and marked read without a token, using an arbitrary `userID`. | Read/mark-read require `auth`; creation requires `authAdmin`; identity comes from the token. | No-token calls → `401`. |
| High | Anyone could create/delete events and jobs and trigger a mass email to every member. Delete trusted client-supplied `userID`/`userRole`. | Added `auth`; actor loaded from MongoDB; creation limited to non-students/admins; ownership from the token; deletes authorised by DB ownership or `isAdmin`. | Unauthenticated create → `401`. |
| High | Showcase CRUD (`/api/showcase/*`) was fully unauthenticated and mass-assignable. | All POST/PUT/DELETE routes now use `authAdmin`; reads stay public. | Non-admin write → `401`; head-admin create `201`, delete `200`. |
| High | Socket.IO trusted client-supplied user IDs, let any socket join any conversation room, and relayed group messages to a client-supplied member list. | JWT verification on the handshake; `socket.userId` from the token; membership checks before joining rooms; recipients resolved from MongoDB. | No-token handshake rejected; valid token connects. |
| High | Rich-text posts were rendered with `html-react-parser` without sanitization (stored XSS). | Added DOMPurify and a shared `sanitizeHtml` allowlist used by the feed, post detail, composer preview and post-request cards. | Production build passes with DOMPurify imported in all four paths. |
| Medium | Conversation `unread-count`, `mute`, `read`, `react` and soft-`delete` endpoints did not verify membership. | Added membership checks; `/conversations/start` validates/de-duplicates member IDs and caps groups at 50. | Non-member calls → `403`. |
| Medium | Open CORS accepted every origin. | Allowlist: `CLIENT_URL`, `localhost:3000`, `127.0.0.1:3000`; other origins receive no CORS headers. | Allowed origin `200`; disallowed origin blocked by the browser. |
| Medium | Resource Hub uploads had no MIME allowlist or size limit. | Added the same allowlist as the main upload route plus a 10 MB limit. | Auth + no file → `400`; no auth → `401`. |
| Low | `POST /api/auth/verify-reset-link` never sent a response on success, leaving the request hanging. | Added `res.json({ valid: true })`. | Syntax + live smoke test pass. |
| Low | No baseline security headers. | Disabled `x-powered-by`; added `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`. | Headers present on API responses. |

### Visual fixes

| Issue | Fix |
| --- | --- |
| Navbar overflowed between tablet and desktop widths (~12 top-level links at `1.12rem`). | Mobile drawer breakpoint moved to `1024px`; compact nav rules added for `1025–1360px`; logo text hidden below `1180px`. |
| `PostCard.css` applied a global 3-line clamp to `.post-text`, which could truncate the full post body on the detail page. | Added a `.post-container .post-text` reset in `PostDisplay.css`. |
| The home page was a sparse hero whose typing animation forced the headline to a fixed `14ch` width, and the flat grey stats strip clashed with the campus photo. | One-pass restrained redesign: top bar, static responsive headline, lede and eligibility note, gold-accented dark glass stats strip, and three value cards. Landing buttons scoped to `.landing .btn` to remove the global `.btn` collision. Structure, background image and footer unchanged. |

---

## 2. Residual findings (not changed)

| Severity | Finding | Recommendation |
| --- | --- | --- |
| Medium | `POST /api/extras/add-achievement` is public by design (public award form). Anyone can submit unlimited records. | Add a rate limit/captcha, or require login and route submissions through `/api/achievements`. |
| Medium | `POST /api/extras/submit-feedback` is public and interpolates `name`, `email` and `feedback` into an HTML email to the admin. | Escape all user values before building the email; add a rate limit. |
| Medium | Event and job creation still email every member in a synchronous loop. Authenticated alumni/faculty can spam the whole directory. | Move email to a queued/batched job; rate-limit creation; consider admin approval. |
| Medium | No login/registration rate limiting or lockout. OTP verification is capped at 5 attempts per record, but resend is unlimited. | Add `express-rate-limit` (or a shared limiter) to `/api/auth`, `/api/users/register`, `/api/users/resend-otp`. |
| Low | `POST /api/users/reset-otp` is unauthenticated and can clear another email's pending OTP. | Require the OTP or a signed registration token; rate-limit. |
| Low | `GET /api/users/search/:query` passes user input directly into a Mongo `$regex`. | Escape regex metacharacters and cap query length. |
| Low | Admin actions use `GET` (`/users/:id/make-admin`, `/remove-admin`, `/block`, `/unblock`, `/requests/join/:id/approve`). | Change to `POST`/`PATCH`; keep CSRF tokens if cookies are introduced. |
| Low | `GET /api/profile/all` now requires auth but still returns every member's email. | Restrict the projection to directory fields or remove the route if unused. |
| Low | No Content-Security-Policy; `helmet` is not installed. | Add `helmet` with a CSP once inline styles/scripts are catalogued. |
| Low | OTP store and AI rate limiter are per-process in-memory maps. | Use Redis/Mongo if the app runs on more than one instance. |
| Low | `POST /api/conversations/start` lets any member open a chat with any other member. | Add block checks if unsolicited messaging becomes a problem. |

---

## 3. Visual / CSS findings (remaining; #2 resolved)

1. **Global `:root` token collisions.** `--navy-800` is `#0c1f42` in `Home.css`, `#1a2f54` in `messenger.css`, and `#0f2044` in the post styles. Because all are `:root`, the last-loaded value wins for every page. Consolidate into one token file.
2. **Global `.btn` collision (resolved).** `Home.css` set `padding: 11px 28px`, while the base `.btn` rule set `padding: 8px 14px` and `font-size: 13px`. The home rules are now scoped to `.landing .btn`, and the base rule was moved out of `UserCard.css` into `App.css`, where the app-wide button base belongs. `UserCard.css` now only contributes `.btn-danger`, `.btn-secondary` and `.btn-simple`. Note: scoping the base to `.user-card` would have been wrong — it is the only base `.btn` definition and is used app-wide.
3. **Groups selectors are global.** `groups.css` says every rule is scoped to `.groups-page`, but `.group-card`, `.group-tab`, `.group-btn`, `.avatar-stack`, `.member-stack`, etc. are global. No current collisions were found, but the comment is misleading and future components can collide. Prefix or nest them.
4. **Groups typography is very small.** Badges and labels use `8–11px`, body copy `12px`. This is below comfortable mobile readability; consider a `13px` minimum for body and `11px` for badges.
5. **Mobile AI briefing is duplicated in the DOM.** The desktop rail and mobile copies both exist (`Posts.jsx`); the inactive copy is `display: none` (`Posts.css`), which removes it from the accessibility tree, so this is not an assistive-technology exposure. It is still duplicate markup and duplicate work. Render once and reorder with CSS, or gate it with `aria-hidden` plus `inert` if the duplicate is kept.
6. **Feed/right-rail breakpoints are otherwise coherent.** Rails hide at `1180px`, the shell collapses at `900px`, and the composer/hero stack at `680px`. The new navbar rules close the remaining tablet gap.

---

## 4. Verification performed

- `node --check` on every modified server file.
- Live API: login, `/users/me`, `/users/search/all`, profile write, notifications, showcase create/delete, resources upload, conversation membership, CORS.
- Socket.IO: handshake without a token rejected; valid token connects.
- `npm run test:matching` → **8/8 passing**.
- Production client build → **succeeded** (`main.2b769ed9.js`, 678.68 kB gzip; CSS 36.16 kB gzip).
- `./run.sh --no-seed` → API `:5001` and client `:3000` both `200`; security headers present.

---

## 5. Files changed

**Server**

- `server/models/User.js`
- `server/models/Event.js`
- `server/server.js`
- `server/scripts/seedDemo.js`
- `server/.env.example`
- `server/routes/api/auth.js`
- `server/routes/api/profile.js`
- `server/routes/api/users.js`
- `server/routes/api/notifications.js`
- `server/routes/api/event.js`
- `server/routes/api/jobs.js`
- `server/routes/api/conversations.js`
- `server/routes/api/messages.js`
- `server/routes/api/resources.js`
- `server/routes/showcaseRoutes.js`

**Client**

- `client/package.json` / `package-lock.json` (DOMPurify)
- `client/src/utils/sanitizeHtml.js` (new)
- `client/src/socket.js`
- `client/src/components/posts/PostCard.jsx`
- `client/src/components/posts/PostDisplay.jsx`
- `client/src/components/posts/PostForm.jsx`
- `client/src/components/requests/PostRequestCard.jsx`
- `client/src/components/posts/PostDisplay.css`
- `client/src/components/layouts/Navbar.css`
- `client/src/App.css` (global `.btn` base moved here)
- `client/src/components/profiles/UserCard.css` (base removed; variants remain)

**Records**

- `AlumniConnect_Changelog_and_Ideas.xlsx` (Changelog, Verification, Stack & Algorithms, Features)
