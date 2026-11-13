# AlumniConnect — Security Audit

**Date:** 2026-11-13  
**Scope:** Express API, MongoDB deployment, Socket.IO, uploads, authentication, React render paths and client dependency tree.  
**Method:** Route-by-route static review, targeted live requests against the local API (`:5001`), a two-client Socket.IO test, workbook/dependency inspection, and the existing server test suite.  
**Environment:** Local demo instance (React `:3000`, API `:5001`, MongoDB via Docker). No production data was touched.

---

## 1. Executive summary

No unauthenticated remote code execution or authentication bypass was found. The previous audit's fixes (DB-backed role reload, CORS allowlist, upload allowlists, DOMPurify, socket handshake auth, production admin guard) are present and working.

The most serious issue is **infrastructure, not application code**: MongoDB is published on `0.0.0.0:27017` with no authentication. On any host reachable from a network or a permissive cloud security group, that is a complete database compromise.

Application-level issues worth fixing next:

1. Any member can inject fake message events into another member's live messenger through the legacy socket handler.
2. Any conversation member can permanently delete the entire conversation history for everyone.
3. Registration accepts an arbitrary `role`, which is copied verbatim on approval.
4. `GET /api/users/:id` returns every member's email and private fields to any signed-in user (confirmed live).
5. Event Q&A returns participants' email addresses to every signed-in member (confirmed live).

**Counts:** 1 critical (deployment), 4 high, 8 medium, 16 low / hardening.

The full list of already-verified controls is in section 5.

---

## 2. Critical

### C1. MongoDB is exposed without authentication

- **Evidence:** `ss -ltnp` shows `0.0.0.0:27017` and `[::]:27017`; `docker ps` shows `alumni-mongo 0.0.0.0:27017->27017/tcp`; `server/.env` uses `mongodb://127.0.0.1:27017/alumniconnect` with no credentials.
- **Impact:** Anyone who can route to the host's port 27017 can read or modify every collection: accounts, bcrypt hashes, posts, encrypted messages, mentorship records and admin flags. They can create an admin account directly and bypass the API entirely. This is a full compromise if the host is internet-reachable or on an untrusted LAN.
- **Fix:**
  1. Publish the container only on loopback: `127.0.0.1:27017:27017`.
  2. Enable MongoDB authentication (`--auth`, `MONGO_INITDB_ROOT_USERNAME/PASSWORD`) and use a least-privilege application user.
  3. Add a firewall rule / cloud security group that denies 27017 from everywhere except the API host.
  4. Rotate the JWT, encryption and database credentials if the port has ever been publicly reachable.
- **Status:** Not changed — the repository rules forbid touching MongoDB/Docker data without approval.

---

## 3. High

### H1. Legacy socket handler lets any member push messages to any user

- **Evidence:** `server/server.js:242-276`. The non-group branch of `sendMessage` resolves `receiverId` from `onlineUsers` and emits `receiveMessage` without checking that the sender shares a conversation with the receiver. The client still listens for this legacy event (`client/src/hooks/useMessengerSocket.js:107-108`) and dispatches `MESSAGE_RECEIVED`.
- **Confirmed live:** two real accounts connected; the attacker emitted `sendMessage` with the victim's ID and a fabricated conversation ID. The victim socket received:
  `{"senderId":"<attacker>","text":"SPOOFED: this conversation does not exist","conversationId":"000000000000000000000001"}`
- **Impact:** fake/abusive messages appear in a victim's messenger UI without being persisted. Using a real shared conversation ID makes the spoof look like a normal chat message until refresh. It also allows unsolicited disruption of users the attacker has never chatted with.
- **Fix:** delete the legacy `sendMessage`/`receiveMessage` path (the REST `/api/messages/send` route is already membership-checked), or require the sender to be a member of `conversationId` and both users to share that conversation before emitting.

### H2. Any conversation member can delete the whole history for everyone

- **Evidence:** `server/routes/api/messages.js:355-379`. `DELETE /api/messages/clear/:conversationId` verifies membership and then runs `Message.deleteMany({ conversation })`. There is no owner/admin check and no per-user soft delete.
- **Impact:** in a group chat, any ordinary member can irreversibly wipe every message for every participant. This is a destructive integrity issue rather than a confidentiality leak.
- **Fix:** make “clear chat” a per-user soft delete (`$addToSet: { deletedFor: user }`), or restrict the hard delete to the conversation owner/admins and require an explicit “delete for everyone” action.

### H3. Registration accepts an arbitrary role, and approval copies it

- **Evidence:** `server/routes/api/users.js:87-218` validates only `role` non-empty, then stores it in the OTP record and `JoinRequest`. `server/routes/api/request.js:55-84` copies `claimed.role` directly into the new `User`. `server/routes/api/posts.js:236-246` treats `req.user.role === "head_admin"` as a head-admin bypass.
- **Impact:** a registrant can request `role: "head_admin"`, `"Admin"`, `"faculty"` or any other string. Once an admin approves the request, that value becomes the account's role. For `"head_admin"` it bypasses the role check in post deletion; for `"faculty"`/`"alumni"` it bypasses student-only restrictions on jobs, stories and mentorship. The admin UI does not make the injected value obvious.
- **Fix:** allowlist roles (`student`, `alumni`, `faculty`), reject anything else at registration and again at approval, derive privileged fields server-side, and remove the `role === "head_admin"` fallback in `posts.js` (only `isAdmin && adminType === "head"` should pass).

### H4. IDOR: any member can read any other member's full user document

- **Evidence:** `server/routes/api/users.js:394-421` returns `User.findById(...).select("-password")`. Confirmed live with a normal student token against another user:
  fields included `email`, `blockedUsers`, `NotificationID`, `followers`, `followings`, `internship_preferences`, `mentorship`.
- **Impact:** member email harvesting, inference of who blocked whom, and exposure of private preferences. The directory and search routes already hide email; this route bypasses that policy.
- **Fix:** return a directory-safe projection (name, avatar, role, program, batch, organisation, designation, location, skills, bio) and keep email/private arrays for `/api/users/me` and admins only.

---

## 4. Medium

### M1. Event Q&A exposes email addresses to every signed-in member

- **Evidence:** `server/routes/api/eventQuestions.js:48-63` populates `studentId` and `replies.alumniId` with `"name email"`. Confirmed live: `GET /api/event-questions/<event>/questions` returned `student fields ['_id','name','email']`.
- **Fix:** populate `"name avatar"` only; expose contact through an explicit opt-in.

### M2. LinkedIn callback has no OAuth `state` and the flow is partially broken

- **Evidence:** `server/middleware/LinkedinAuth.js`. The callback consumes `code` without validating a state/nonce, auto-creates a `User` with no password (required by the schema), signs a token whose payload lacks the `{ user: { id } }` shape used by the API, writes a cookie without `sameSite`, and redirects to a hardcoded `http://localhost:5173/login`. No `cookie-parser` middleware is installed, so `getUser` cannot read `req.cookies`.
- **Impact:** if the flow is enabled, it is vulnerable to login CSRF/account fixation (victim is logged into the attacker's LinkedIn-created account) and cannot reliably authenticate anyway.
- **Fix:** implement the current LinkedIn OIDC flow with a signed, single-use `state`, PKCE, a strict redirect allowlist, and an account-linking step. Otherwise remove the route until it can be done safely.

### M3. Upload endpoint can exhaust memory and storage

- **Evidence:** `server/routes/api/upload.js:113-140` accepts 5 × 25 MB files into memory per request; `express.json({ limit: "10mb" })` also allows large JSON bodies (`server/server.js:47-48`). There is no upload rate limit or per-user quota.
- **Impact:** an authenticated account can repeatedly submit 125 MB requests and fill memory/disk (local fallback) or consume Cloudinary quota.
- **Fix:** add a per-user upload rate limit and quota, lower the document/file caps, and stream to disk/Cloudinary instead of buffering all files at once.

### M4. Message and query limits are unbounded

- **Evidence:** `server/routes/api/messages.js:134-172` uses `Number(req.query.limit)` without clamping; `POST /send` and `PUT /edit` store `text` up to the 10 MB body limit.
- **Impact:** a member can fetch a whole conversation in one response or store very large messages, causing memory/latency/storage pressure.
- **Fix:** clamp `limit` to 1–100, cap message length (e.g. 4,000 chars), and reject empty/oversized payloads.

### M5. Long-lived tokens in `localStorage`

- **Evidence:** `server/routes/api/auth.js:108-120` signs with `expiresIn: 360000` (~100 hours); the client stores the token in `localStorage` (`client/src/utils/api.js`) and there is no refresh/revocation list.
- **Impact:** any XSS or shared-device access yields a usable token for days. DOMPurify reduces but does not eliminate XSS risk.
- **Fix:** short-lived access tokens (15–60 min) plus refresh/rotation, an explicit logout/revocation path, and consider an httpOnly cookie with CSRF protection.

### M6. Password policy is six characters

- **Evidence:** `server/routes/api/users.js:91` and `server/routes/api/auth.js:214` require only `min: 6`; no strength or breached-password check.
- **Fix:** minimum 12 characters (or zxcvbn-style scoring) and block known-breached passwords. Keep bcrypt cost at 10–12.

### M7. Account enumeration

- **Evidence:** `POST /api/users/register` returns “User already exists”/“Already requested”; `POST /api/auth/forgot-password` returns “Account not found”.
- **Fix:** return a generic “If an account exists, an email has been sent” for reset, and a generic pending-review message for registration.

### M8. Rate limiting depends on a single process and `req.ip`

- **Evidence:** `server/middleware/rateLimit.js` is an in-memory `Map`; `clientIp(req)` uses `req.ip`, but `server.js` never sets `trust proxy`.
- **Impact:** behind nginx/Cloudflare every user may share one bucket (self-DoS/lockout), or if a proxy is misconfigured the key may be spoofable. Multiple instances each get their own counters.
- **Fix:** `app.set("trust proxy", 1)` with a known proxy count, and use a shared store (Redis/Mongo) if the API ever runs more than one replica.

### M9. Admin middleware does not reject blocked accounts

- **Evidence:** `server/middleware/authAdmin.js` and `authHeadAdmin.js` load the user but check only `isAdmin`/`adminType`. Standard `auth.js` correctly checks `blocked`.
- **Impact:** a blocked admin can keep approving join requests, deleting showcase content or promoting admins until the token expires.
- **Fix:** check `blocked` in both admin middlewares and reject with 403.

### M10. Client dependency advisories

- **Evidence:** `npm audit` in `client/` reports 30 advisories (7 high, 6 moderate, 17 low): `webpack-dev-server`, `webpack-dev-middleware`, `svgo`, `nth-check`, `postcss`, `qs`, `uuid`, `react-scripts` chain. `server/` production audit is clean.
- **Impact:** most are build/dev-tooling issues, not shipped runtime code. `webpack-dev-server` path traversal and `svgo` script retention matter on developer machines; `qs`/`uuid` are used by tooling.
- **Fix:** upgrade `react-scripts`/webpack toolchain when feasible, or run the dev server only on loopback. Do not run `npm audit fix --force` blindly on a CRA app.

---

## 5. Low / hardening

| # | Finding | Where | Recommendation |
| --- | --- | --- | --- |
| L1 | No CSP/HSTS; only three security headers | `server/server.js:27-35` | Add `helmet` with a CSP after cataloguing inline styles; enable HSTS in production. |
| L2 | Notifications are global: query ignores `userID` | `server/routes/api/notifications.js:13-26` | Scope notifications to the recipient (or make admin broadcasts explicit). |
| L3 | Any user can mark any notification read (for themselves) | `notifications.js:52-73` | Verify the notification belongs to the caller. |
| L4 | Group admins can add arbitrary users without consent; no ID validation | `conversations.js:281-310` | Validate ObjectIds, cap batch size, and require acceptance for large groups. |
| L5 | INVITE-only group metadata is visible to non-members | `groups.js:280-360` | Return a minimal summary or 404 for non-members. |
| L6 | OTP uses `Math.random()` and plaintext passwords/OTPs sit in memory | `users.js:177-205` | Use `crypto.randomInt`, hash the OTP, and keep the TTL short. |
| L7 | Reset token travels in the URL | `auth.js:130-208` | Keep the 5-minute TTL, add `<meta name="referrer" content="no-referrer">`, consider a one-time server-side token. |
| L8 | Cloudinary `public_id` is built from the raw uploaded filename | `resources.js:31-40` | Use a random ID and a sanitized extension. |
| L9 | User files are served from the app origin under `/uploads` | `server.js:142-145` | Send `Content-Disposition: attachment` for non-image/PDF files and add a sandbox CSP to that path. |
| L10 | Post/message media may point at any external host | `posts.js` media allowlist; `messages.js` media field | Restrict to an allowlist/proxy; external images leak viewer IPs and enable tracking. |
| L11 | Public achievements list has unbounded `limit`/`page`; errors echo `error.message` | `routes/achievement/achievements.js:16-49` | Clamp pagination and return generic errors. |
| L12 | `/api/users/search/all` returns every user without pagination | `users.js:341-345` | Add pagination/limit. |
| L13 | Feed events are client-supplied and can bias ranking | `routes/api/feed.js:46-122` | Already per-user rate-limited; treat engagement as untrusted and cap influence. |
| L14 | Job/event creation can trigger community-wide email (10/hour) | `jobs.js` / `event.js` | Keep the queue cap, require admin approval for large broadcasts, and add unsubscribe. |
| L15 | Message encryption is AES-256-CTR without a MAC | `utils/encryption.js` + `aes256` package | Migrate to AES-256-GCM (or libsodium) for integrity and key rotation. |
| L16 | Verbose debug logging of users/notification IDs | several routes | Reduce production logging and never log tokens or message bodies. |
| L17 | No audit trail for admin actions | admin routes | Record actor, action, target and timestamp. |
| L18 | Event reply endpoint does not verify the event exists or the replier's role | `eventQuestions.js:66-98` | Validate event/role and handle missing events without a 500. |

---

## 6. Verified controls (working)

- JWT handshake required for Socket.IO; conversation join/typing/group sends verify membership.
- `auth` reloads `role`, `isAdmin`, `adminType` and `blocked` from MongoDB on every request.
- Passwords are bcrypt-hashed and excluded by default (`select: false`); login returns a password-free copy.
- CORS allowlist rejects unknown origins (verified: `Origin: https://evil.example` receives no `Access-Control-Allow-Origin`).
- Security headers present: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`; `X-Powered-By` disabled.
- Upload MIME allowlist, random local filenames, 25 MB cap; `/uploads` is gitignored.
- Rich-text posts are sanitized with DOMPurify; no `dangerouslySetInnerHTML` sinks found.
- Post visibility is enforced in feed, detail, search and AI summary paths.
- Ownership checks cover posts, jobs, events, resources and achievements.
- Production admin bootstrap requires `ADMIN_EMAIL`/`ADMIN_PASSWORD`; demo seeding refuses `NODE_ENV=production`.
- No secrets tracked in Git or embedded in the client bundle.
- Server production dependency audit: **0 advisories**.
- Server test suite: **86/86 passing**.

---

## 7. Verification commands used

```bash
ss -ltnp | grep -E ':(27017|5001|3000)'
docker ps
git log --all --oneline -- server/.env client/.env .env
npm audit --omit=dev            # server and client
curl -H 'Origin: https://evil.example' -D- http://127.0.0.1:5001/api/availability
curl -H "x-auth-token: $TOKEN" http://127.0.0.1:5001/api/users/<other-user-id>
node /tmp/opencode/socket-test.js   # two-client spoof test
```

---

## 8. Suggested order of work

1. Bind MongoDB to loopback, enable auth, rotate credentials (**C1**).
2. Remove/guard the legacy socket path and fix “clear chat” (**H1**, **H2**).
3. Allowlist registration roles and derive privileged flags server-side (**H3**).
4. Trim `/api/users/:id` and event Q&A projections (**H4**, **M1**).
5. Remove or rebuild the LinkedIn flow with `state` + PKCE (**M2**).
6. Add upload/message limits, short-lived tokens and admin-block checks (**M3–M5**, **M9**).
7. Add CSP/HSTS, then the low-risk hardening items.
