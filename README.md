

# AlumniConnect 🎓

A full-stack Alumni Engagement and Networking Platform built using the MERN Stack to strengthen collaboration among students, alumni, and administrators through networking, mentorship, events, messaging, and resource sharing.

---

## 📌 Overview

AlumniConnect provides a centralized digital platform where:

- Students can connect with alumni for guidance and opportunities  
- Alumni can mentor students and share achievements  
- Administrators can manage users, events, resources, and analytics  

The platform focuses on engagement, collaboration, and alumni tracking in one integrated system.

---

## 🚀 Features

### Student Module
- User Registration and Login
- Email Verification
- Profile Management
- Alumni Search and Networking
- Mentorship Requests
- Discussion Posts
- Event Registration
- Resource Access
- Real-Time Messaging
- Notifications
- Achievement Viewing

### Alumni Module
- Professional Profile Management
- Accept Connection Requests
- Share Achievements
- Post Opportunities and Updates
- Mentor Students
- Share Resources
- Participate in Events

### Admin Module
- User Verification and Management
- Post Moderation
- Event Management
- Resource and Achievement Approval
- Alumni Tracer Management
- Dashboard Analytics

---

## 🛠 Tech Stack

### Frontend
- React.js
- Redux Toolkit
- React Router
- Axios
- CSS

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication

### Additional Services
- Socket.io
- Cloudinary
- Brevo (transactional email)
- Gemini (optional AI layer with an offline fallback)
- Render

---

## 📂 Project Structure

```bash
AlumniConnect/
│
├── client/
│   ├── src/
│   ├── public/
│
├── server/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│
├── .env
├── package.json
└── README.md
```

---

## ⚙ Installation

### Clone Repository

```bash
git clone https://github.com/your-username/alumniconnect.git
cd alumniconnect
```

## Install Dependencies

### Backend

```bash
cd server
npm install
```

### Frontend

```bash
cd client
npm install
```

---

## 🔑 Environment Variables

Create a `.env` file in server directory:

```env
PORT=5001
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:3000

# First head admin created at boot. Required in production.
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password

# Transactional email (Brevo). Announcement email is skipped when blank.
BREVO_API_KEY=your_brevo_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# AI features (Gemini). Optional: without a key the app uses offline,
# extractive output so the UI still works.
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
```

Frontend `.env`

```env
REACT_APP_BACKEND_URL=http://localhost:5001
```

`client/.env.example` is committed as a template. Without `REACT_APP_BACKEND_URL`,
the client calls `undefined/api/...` and login fails silently — the variable must
exist **before** `npm start` or `npm run build` (CRA inlines it at compile time).

---

## ▶ Running the Project

### Requirements

Node.js **22 LTS** or newer. The repository pins the major version in `.nvmrc`, so
`nvm use` selects it automatically. Node 20 reached end of life on 30 April 2026
and is no longer accepted by `run.sh` or the package `engines` fields.

### One-command start (recommended)

```bash
./run.sh
```

`run.sh` requires Node 22+, starts the `alumni-mongo` Docker container (or creates
`mongo:6` if needed), falls back to a local `MONGO_URI` when `server/.env` still
contains the placeholder, installs missing dependencies, seeds only when the
database is empty, then starts the API and React dev server. Logs go to
`.run/server.log` and `.run/client.log`.

```bash
./run.sh --seed      # refresh demo data, then start
./run.sh --no-seed   # never seed
./run.sh --install   # force npm install for both apps
./run.sh --open      # open http://localhost:3000
```

### Start Backend manually

```bash
cd server
npm run server   # nodemon, development
# or
npm start        # plain node
```

### Start Frontend manually

```bash
cd client
npm start
```

Runs on:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5001`

---

## 🌱 Demo Data

Seed the community with the sample users, topics, posts, comments, likes and
follows used for demos:

```bash
cd server
MONGO_URI=mongodb://127.0.0.1:27017/alumniconnect npm run seed
```

The script refuses to run when `NODE_ENV=production`, because every demo
account shares a public password. It is idempotent (users matched by email,
posts by heading, groups by name), so it is safe to re-run locally. Re-running also refreshes the demo timestamps
(post and comment dates, event times and job deadlines), so the feed and the
7-day AI briefing stay relative to today. It seeds 38 feed posts plus 9 group
discussions and the comment threads behind them: a
base set of announcements plus longer LinkedIn-style essays and short X-style
takes written for the demo. All of that content is original fiction, not copied
from real people. Every seeded account uses the password `alumni123#`:

| Account | Role |
|---|---|
| `alumni@iiita.ac.in` | Institutional admin |
| `aarav.mehta@iiita.ac.in` | Alumni · ML Engineer |
| `riya.kapoor@iiita.ac.in` | Alumni · Backend Engineer |
| `sneha.malhotra@iiita.ac.in` | Alumni · Research Scientist |
| `dev.gupta@iiita.ac.in` | Alumni · Software Engineer |
| `priya.rao@iiita.ac.in` | Alumni · ML Engineer |
| `aditya.rao@iiita.ac.in` | Alumni · Software Engineer |
| `meera.iyer@iiita.ac.in` | Alumni · Product Manager |
| `kabir.shah@iiita.ac.in` | Alumni · Founder & CTO |
| `ananya.verma@iiita.ac.in` | Alumni · Data Scientist |
| `rahul.nair@iiita.ac.in` | Alumni · Site Reliability Engineer |
| `ishaan.kulkarni@iiita.ac.in` | Alumni · Quant Researcher |
| `tara.singh@iiita.ac.in` | Alumni · Staff Product Designer |
| `neha.bansal@iiita.ac.in` | Faculty · HCI |
| `sathvik.boina@iiita.ac.in` | Student |

The separately provisioned head admin (`iiita.alumniconnect@gmail.com`) is
created by the server on first boot.

> **Demo credentials are local-only.** In production the server does **not**
> create an admin from the demo password: it requires `ADMIN_EMAIL` and
> `ADMIN_PASSWORD`, and it skips the bootstrap (with a warning) when they are
> missing. `seedDemo` exits immediately when `NODE_ENV=production`. Never deploy
> with these accounts or the `alumni123#` password.

---

## 👥 Groups & Cohorts

`/groups` mirrors the prototype's community hubs: batch, programme, club,
regional chapter, application cohort and invite-only categories. Each hub has an
access mode:

- **OPEN** — any signed-in member can read and join immediately.
- **REQUEST** — joining creates a pending request that the owner approves or
  rejects from the Manage tab.
- **INVITE** — the hub is visible for discovery, but joining requires an invite
  from the owner.

Group threads are ordinary `Post` documents with a `group` reference. Likes,
comments and the AI TL;DR therefore work unchanged. They are deliberately
excluded from `/api/posts/search`, `/api/feed/for-you` and the weekly AI
briefing (`group: null`), and post detail, likes, comments and thread summaries
all re-check `canViewGroupPost`. The demo seed creates seven hubs, nine
discussions and two replies.

---

## ✨ AI Features

AI is attached to existing objects instead of living in a generic chat page.

| Feature | Where | Endpoint |
|---|---|---|
| **Weekly briefing** — themes, a suggested next step, posts worth reading, upcoming events, sources | Feed right rail, moved into the feed below 1180px | `GET /api/ai/insights/briefing` |
| **Thread TL;DR** — 3 bullets, the open question, a suggested reply | Post card, when a thread has ≥2 replies | `POST /api/ai/insights/posts/:id/summary` |
| **Job fit** — score, verdict, matched/missing skills, prep steps | Job board, student view | `GET /api/ai/insights/jobs/:id/fit` |
| **Internship matches** — ranked roles, evidence, gaps, deadline context | `/internship-matches` | `GET /api/ai/insights/jobs/matches` |
| **Mentor matches** — ranked mentors, shared skills, availability, request flow | `/mentor-matches` | `GET /api/ai/insights/mentors/matches` and `GET /api/mentorship/matches` |

Design guarantees:

- **Grounded** — the model only sees posts the signed-in user may view; themes,
  counts, events and people are computed in Mongo, not generated.
- **Cited** — briefing responses include a `sources[]` array rendered as links.
- **Cached** — results live in the `ai_artifacts` collection, so repeat views are
  instant. Offline fallbacks are never cached. Cache bypass (`?force=1`) is
  admin-only, so a normal account cannot trigger repeated model calls.
- **Degrades safely** — with no `GEMINI_API_KEY`, each endpoint returns a
  deterministic extractive result labelled `offline` in the UI.
- **Time-boxed** — a request may try several Gemini models, but the whole chain
  is capped at 20 seconds before falling back.

The older `/ai-help` institute assistant is still present but parked; it uses
Mistral and now requires a signed-in account plus a 5-requests/minute limit.

### Internship & mentor matching

Both matching flows use the same explainable pipeline from the project deck:

1. **Hard constraints** — deadline, active role, eligible program/graduation
   year, mentor availability and capacity.
2. **Semantic / skill overlap** — normalized skills with aliases (`ML` ↔
   `Machine Learning`, `Node` ↔ `Node.js`) plus description/profile token
   overlap.
3. **Contextual rerank** — preferred type, work mode, location, recency, poster
   role, shared academic background and past mentorship response rate.
4. **Explanation** — every card exposes reasons, matched skills, gaps and a
   next action.

The deterministic ranker always runs first. If `GEMINI_API_KEY` is configured,
the top candidates are re-ranked once and cached (`ai_artifacts`); otherwise
the UI labels the output **Rule-based ranking**. The model can only reorder
candidates it is given — it cannot invent people, roles or skills.

Only a member's listed profile skills count as evidence; internship
preferences (type, mode, location) affect context, not the skill score. The
job-board **Fit** panel calls the same engine, so a role reports the same score
on `/jobs` and `/internship-matches`.

Mentoring is opt-in: an alumni/faculty account only appears after
`mentorship.available` is explicitly `true` (the profile editor exposes this).
Legacy accounts without that flag stay out of recommendations and cannot be
requested directly. Capacity is enforced twice — when a request is created and
when a mentor accepts it — so a full mentor cannot be overbooked.

Mentorship state is explicit: `pending → accepted → active → completed`
(or `declined`). The mentor accepts/declines; either participant can move an
accepted relationship to active/completed.

Seed the demo matching data with:

```bash
cd server
MONGO_URI=mongodb://127.0.0.1:27017/alumniconnect npm run seed
npm run test:matching
```

Set the key in `server/.env`, restart, then pre-compute demo artifacts:

```bash
cd server
MONGO_URI=mongodb://127.0.0.1:27017/alumniconnect npm run ai:warm
```

Check whether a key is loaded at runtime:

```bash
curl -H "x-auth-token: <token>" http://localhost:5001/api/ai/insights/status
```

---

## 🧭 Feed Recommendations

The **For you** tab is ranked server-side from how the signed-in user actually
uses the site. `Latest` and `Following` remain chronological.

**What is recorded** (`feed_events`, 90-day TTL): impressions, clicks, dwell
seconds, likes, comments, shares, follows, searches, topic views and
`not_interested` / `report`. Events are batched client-side and sent to
`POST /api/feed/events`; a user can erase their history with
`POST /api/feed/reset`.

**How ranking works** (`server/services/recommender.js`, algorithm id
`hybrid-v1`):

- exponential time decay on topic/author affinity (half-life 7 days)
- TF-IDF + cosine similarity over post text (content-based filtering)
- item-item cosine similarity over user engagement sets (collaborative filtering)
- Bayesian-smoothed engagement prior and 48-hour freshness decay
- weighted blend: topic 0.30, author 0.18, similarity 0.15, prior 0.15,
  freshness 0.10, follow 0.07
- greedy MMR-style diversity (0.82 per repeated author, 0.9 per repeated
  channel, max 2 per author)
- ε-greedy exploration: 10% of slots, deterministic per user per day
  (mulberry32 PRNG seeded with an FNV-1a hash)

No LLM, embedding model or vector database is involved. The API returns a
`feed.reason` for each post, rendered as the `✦` chip on the card. The full
technical record is in
[`AlumniConnect_Changelog_and_Ideas.xlsx`](./AlumniConnect_Changelog_and_Ideas.xlsx)
— one workbook with the combined changelog, future ideas, stack/algorithms,
features and verification.

Endpoints:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/feed/for-you?limit=30&channel=` | Ranked posts + `meta` |
| `POST` | `/api/feed/events` | Batch of 1–50 behavioural events |
| `POST` | `/api/feed/reset` | Delete the user's feed history |

---

## 🏗 Production Build

The backend URL is baked into the bundle, so set it first:

```bash
cd client
REACT_APP_BACKEND_URL=https://your-api-host npm run build
```

CRA's default heap is sometimes too small for this project; if the build exits
early with no error, raise the limit:

```bash
GENERATE_SOURCEMAP=false NODE_OPTIONS=--max-old-space-size=2048 npm run build
```

Serve `client/build` with any static host; the Express server stays on
`server/` and exposes `/api/*`.

---

## 📌 Core Modules

- Authentication System  
- Alumni Directory  
- Community Posts  
- Events Management  
- Resource Hub  
- Achievement Showcase  
- Real-Time Chat  
- Notification System  
- Alumni Tracer System  
- Admin Dashboard  

---

## 🔒 Security Features

- JWT Authentication  
- Protected Routes  
- Role-Based Access Control  
- Input Validation  
- Password Hashing  
- Secure API Handling  

---

## 🧪 Testing

Testing performed for:

- Head Admin  
- Students  
- Alumni  

Includes:

- Unit Testing  
- Integration Testing  
- Functional Testing  
- API Testing using Postman  

---

## 🌐 Deployment

Project deployed on **Render**

---

## 🔮 Future Scope

- AI-based Alumni Recommendations  
- Advanced Analytics  
- Mobile App Support  
- Video Mentorship Sessions  
- Enhanced Notification Features  

---

## 👨‍💻 Contributors

Developed as an academic major project.

---

## 📜 License

This project is for educational and academic use.
