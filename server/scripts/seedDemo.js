/*
 * Seeds the local AlumniConnect database with the IIITA community demo data
 * used in the prototype (users, profiles, topics, posts, comments, likes,
 * follows). Safe to re-run: users are matched by email, posts by heading.
 *
 *   node scripts/seedDemo.js
 *   MONGO_URI=mongodb://127.0.0.1:27017/alumniconnect node scripts/seedDemo.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const gravatar = require("gravatar");

const User = require("../models/User");
const Post = require("../models/Post");
const Channel = require("../models/Channel");
const Event = require("../models/Event");
const Job = require("../models/Jobs");
const Group = require("../models/Group");
const Resource = require("../models/Resource");
const MentorShipRequest = require("../models/MentorShipRequest");
const Door = require("../models/Door");
const DoorRequest = require("../models/DoorRequest");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const JoinRequest = require("../models/JoinRequest");
const EventQuestion = require("../models/EventQuestion");
const { groups: demoGroups } = require("./demoGroups");

// Demo accounts share a public password, so they must never exist on a
// deployed instance. Refuse to run instead of trusting an operator to remember.
if (process.env.NODE_ENV === "production") {
	console.error(
		"Refusing to seed demo data: NODE_ENV=production. Demo accounts share a public password and must not exist on a deployed instance."
	);
	process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI || process.env.mongoURI_PROD;
const DEMO_PASSWORD = "alumni123#";

if (!MONGO_URI) {
  console.error("No MONGO_URI / mongoURI_PROD configured. Aborting.");
  process.exit(1);
}

const avatarFor = (email) => gravatar.url(email, { s: "200", r: "pg", d: "mm" });

const users = [
  {
    key: "sathvik",
    name: "Sathvik Boina",
    email: "sathvik.boina@iiita.ac.in",
    role: "student",
    program: "B.Tech IT",
    starting_year: "2019",
    passing_year: "2023",
    location: "Allahabad, India",
    designation: "Student",
    organisation: "IIIT Allahabad",
    working_area: "Machine Learning",
    skills: ["Python", "Machine Learning", "NLP", "SQL"],
    bio: "Student at IIIT Allahabad exploring machine learning, systems and practical software engineering.",
  },
  {
    key: "aarav",
    name: "Aarav Mehta",
    email: "aarav.mehta@iiita.ac.in",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2015",
    passing_year: "2019",
    location: "Bengaluru, India",
    designation: "ML Engineer",
    organisation: "Nimbus Labs",
    working_area: "Production ML",
    skills: ["Machine Learning", "MLOps", "Python", "Distributed Systems"],
    bio: "ML engineer focused on reliable production systems, evaluation and infrastructure.",
  },
  {
    key: "riya",
    name: "Riya Kapoor",
    email: "riya.kapoor@iiita.ac.in",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2016",
    passing_year: "2020",
    location: "Hyderabad, India",
    designation: "Backend Engineer",
    organisation: "Arclight Systems",
    working_area: "Distributed Systems",
    skills: ["Go", "Python", "Distributed Systems", "Databases"],
    bio: "Backend engineer working on distributed systems and platform reliability.",
  },
  {
    key: "college",
    name: "IIIT Allahabad",
    email: "alumni@iiita.ac.in",
    role: "Admin",
    isAdmin: true,
    adminType: "sub",
    location: "Prayagraj, India",
    designation: "Institutional account",
    organisation: "IIIT Allahabad",
    working_area: "Alumni Relations",
    skills: [],
    bio: "Official IIIT Allahabad institutional account.",
  },
  {
    key: "sneha",
    name: "Sneha Malhotra",
    email: "sneha.malhotra@iiita.ac.in",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2014",
    passing_year: "2018",
    location: "Austin, USA",
    designation: "Research Scientist",
    organisation: "Vision Systems Lab",
    working_area: "Computer Vision",
    skills: ["Computer Vision", "Deep Learning", "PyTorch", "Research"],
    bio: "Research scientist working on computer vision and efficient ML systems.",
  },
  {
    key: "dev",
    name: "Dev Gupta",
    email: "dev.gupta@iiita.ac.in",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2017",
    passing_year: "2021",
    location: "Pune, India",
    designation: "Software Engineer",
    organisation: "Collab Works",
    working_area: "Product Engineering",
    skills: ["TypeScript", "Node.js", "Product Engineering", "APIs"],
    bio: "Software engineer building collaboration and productivity systems.",
  },
  {
    key: "priya",
    name: "Priya Rao",
    email: "priya.rao@iiita.ac.in",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2016",
    passing_year: "2020",
    location: "Bengaluru, India",
    designation: "Machine Learning Engineer",
    organisation: "Nimbus Labs",
    working_area: "NLP",
    skills: ["NLP", "LLMs", "Python", "Evaluation"],
    bio: "Machine learning engineer working on NLP and applied AI.",
  },
  {
    key: "aditya",
    name: "Aditya Rao",
    email: "aditya.rao@iiita.ac.in",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2015",
    passing_year: "2019",
    location: "Hyderabad, India",
    designation: "Software Engineer",
    organisation: "Arclight Systems",
    working_area: "Distributed Systems",
    skills: ["Java", "Distributed Systems", "Kafka", "SQL"],
    bio: "Software engineer focused on distributed systems and backend architecture.",
  },
  {
    key: "nikhil",
    name: "Nikhil Sethi",
    email: "nikhil.sethi@iiita.ac.in",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2013",
    passing_year: "2017",
    location: "Mountain View, USA",
    designation: "Senior Software Engineer",
    organisation: "Google",
    working_area: "Search Infrastructure",
    skills: ["Distributed Systems", "Search", "C++", "Information Retrieval"],
    bio: "Fictional demo alumnus working on search infrastructure at Google. Included only so search demos can show a recognisable company.",
  },
];

const channels = ["General", "Research", "Career", "Events", "Achievements"];

const ALL = ["student", "faculty", "alumni"];

const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);

// Events are seeded relative to today so the "Upcoming" rail always has content.
const inDays = (days, hour) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const events = [
  {
    title: "Career Q&A with Alumni",
    Description:
      "A practical session on internships, first jobs and the transition from coursework to professional engineering. Submit questions ahead of time.",
    Speaker: "Aarav Mehta, Riya Kapoor",
    Link: "https://example.com/events/career-qa",
    start: inDays(4, 19),
    end: inDays(4, 20),
    // Open the Q&A window now so the seeded questions are visible in the demo.
    queryStart: inDays(-1, 9),
  },
  {
    title: "Systems Alumni Meet",
    Description:
      "Informal technical discussion on distributed systems, platform engineering and what people actually learned after graduation.",
    Speaker: "Aditya Rao",
    Link: "https://example.com/events/systems-meet",
    start: inDays(11, 18),
    end: inDays(11, 20),
  },
  {
    title: "IIITA Research Roundtable",
    Description:
      "Short research talks followed by open discussion on efficient AI, systems and current directions.",
    Speaker: "Sneha Malhotra",
    Link: "https://example.com/events/research-roundtable",
    start: inDays(18, 17),
    end: inDays(18, 19),
  },
];

// Demo opportunities. Deadlines are relative so the board is never empty.
const jobs = [
  {
    owner: "priya",
    title: "Applied ML Systems Intern",
    description:
      "Work on evaluation pipelines, model monitoring and data-quality tooling with an alumni-led product team. Strong Python and ML fundamentals are useful; production experience is a plus.",
    link: "https://example.com/apply/ml-intern",
    deadline: inDays(9, 18),
    skills: ["Python", "Machine Learning", "MLOps", "Evaluation"],
    location: "Bengaluru, India",
    work_mode: "Hybrid",
    job_type: "Internship",
  },
  {
    owner: "riya",
    title: "Backend Engineering Intern",
    description:
      "Build APIs and internal services around distributed workloads. This is a hands-on role for students who have shipped at least one real backend project using SQL and an API framework.",
    link: "https://example.com/apply/backend-intern",
    deadline: inDays(12, 18),
    skills: ["Go", "Python", "APIs", "Distributed Systems", "SQL"],
    location: "Hyderabad, India",
    work_mode: "Onsite",
    job_type: "Internship",
  },
  {
    owner: "aarav",
    title: "Production ML Project",
    description:
      "Small team project to build reliable model-serving and observability components. Best for students who want a serious portfolio project and can commit 8-10 hours a week. Docker and Python experience expected.",
    link: "",
    deadline: inDays(16, 18),
    skills: ["Python", "MLOps", "Docker", "Distributed Systems"],
    location: "Remote",
    work_mode: "Remote",
    job_type: "Project",
  },
  {
    owner: "sneha",
    title: "Computer Vision Research Assistant",
    description:
      "Research collaboration on efficient vision models. Applicants should be comfortable reading papers and implementing experiments in PyTorch. Deep learning fundamentals required.",
    link: "https://example.com/apply/research",
    deadline: inDays(20, 18),
    skills: ["Computer Vision", "PyTorch", "Research", "Deep Learning"],
    location: "Austin / Remote",
    work_mode: "Remote",
    job_type: "Research",
  },
  {
    owner: "college",
    title: "Backend Internship Referral Window",
    description:
      "Verified alumni have two referral slots for backend internship applications. Applicants should have hands-on API, SQL and deployment experience.",
    link: "",
    deadline: inDays(7, 18),
    skills: ["APIs", "SQL", "Backend", "Deployment"],
    location: "India",
    work_mode: "Hybrid",
    job_type: "Referral",
  },
];

const resources = [
  {
    title: "Hidden Technical Debt in Machine Learning Systems",
    topic: "Research",
    fileUrl: "https://arxiv.org/pdf/2205.02302",
    filePublicId: "seed-resource-ml-debt",
  },
  {
    title: "C-Pack: BGE Text Embeddings",
    topic: "Research",
    fileUrl: "https://arxiv.org/pdf/2402.03216",
    filePublicId: "seed-resource-bge",
  },
  {
    title: "Attention Is All You Need",
    topic: "Research",
    fileUrl: "https://arxiv.org/pdf/1706.03762",
    filePublicId: "seed-resource-transformer",
  },
  {
    title: "BERT: Pre-training of Deep Bidirectional Transformers",
    topic: "Research",
    fileUrl: "https://arxiv.org/pdf/1810.04805",
    filePublicId: "seed-resource-bert",
  },
];

const posts = [
  {
    author: "college",
    heading: "Welcome to the IIITA community feed",
    channel: "General",
    visibility: ALL,
    date: hoursAgo(3),
    text: "<p>Welcome to the IIITA community feed. This is now the home for verified announcements, alumni knowledge, opportunities, events and questions.</p>",
  },
  {
    author: "aarav",
    heading: "A checklist for production ML",
    channel: "Research",
    visibility: ALL,
    date: hoursAgo(5),
    text: "<p>A practical way to think about production ML: start with the reliability constraints, then choose the model. I wrote up the checklist I wish I had during my first production system.</p>",
  },
  {
    author: "sneha",
    heading: "Efficient vision systems: recording and slides",
    channel: "Events",
    visibility: ALL,
    date: hoursAgo(8),
    text: "<p>Recording and slides from yesterday's alumni session on efficient vision systems are now available. The Q&amp;A below stays attached so future students can reuse the answers.</p>",
  },
  {
    author: "priya",
    heading: "Applied ML systems internship",
    channel: "Career",
    visibility: ALL,
    date: hoursAgo(11),
    text: "<p>A product team is hiring interns for an applied ML systems project. The work is focused on evaluation pipelines, model monitoring and data quality. Applications close Friday.</p>",
  },
  {
    author: "sathvik",
    heading: "From coursework to a strong first internship",
    channel: "General",
    visibility: ALL,
    date: hoursAgo(14),
    text: "<p>What actually helped you move from coursework to your first strong engineering internship? Looking for concrete things to build, not a list of 40 buzzwords.</p>",
  },
  {
    author: "riya",
    heading: "Shipped our distributed-systems migration",
    channel: "Achievements",
    visibility: ALL,
    date: hoursAgo(20),
    text: "<p>Small personal milestone: after several months of distributed-systems work, our team finally shipped the migration without a weekend incident. Sharing the postmortem because the boring parts were the useful parts.</p>",
  },
  {
    author: "college",
    heading: "September student-alumni mentoring cohort",
    channel: "General",
    visibility: ["student", "alumni"],
    date: hoursAgo(34),
    text: "<p>Applications are open for the September student-alumni mentoring cohort. The college will confirm pairings after applications close.</p>",
  },
  {
    author: "aarav",
    heading: "Referral window: two backend internship slots",
    channel: "Career",
    visibility: ["student"],
    date: hoursAgo(42),
    text: "<p>Referral window: two backend engineering internship slots are available for IIITA students who have hands-on experience with APIs, SQL and one production deployment.</p>",
  },
  {
    author: "sneha",
    heading: "Three papers worth reading before your next vision project",
    channel: "Research",
    visibility: ALL,
    date: hoursAgo(52),
    text: "<p>Three papers worth reading before your next computer-vision project, with notes on what each paper actually changed instead of the usual paragraph of praise.</p>",
  },
  {
    author: "priya",
    heading: "100 mentoring questions answered this month",
    channel: "Achievements",
    visibility: ALL,
    date: hoursAgo(60),
    text: "<p>Our alumni mentoring group crossed 100 student questions answered this month. Most of the value has come from very specific questions and very unglamorous answers.</p>",
  },
  {
    author: "college",
    heading: "Career Q&A with alumni, 14 September",
    channel: "Events",
    visibility: ALL,
    date: hoursAgo(70),
    text: "<p>Upcoming: Career Q&amp;A with alumni on 14 September at 19:00 IST. Students can submit questions in advance so we spend less time asking &ldquo;tell us about your journey&rdquo; for the 900th time.</p>",
  },
];

const comments = [
  {
    post: "From coursework to a strong first internship",
    author: "aarav",
    hoursAgo: 13,
    text: "The biggest jump for me was building one system that handled failure, logs and deployment. One complete boring project beats five disconnected demos.",
  },
  {
    post: "From coursework to a strong first internship",
    author: "riya",
    hoursAgo: 12,
    text: "Seconding this. Learn to debug something you did not write. That skill keeps paying rent.",
  },
  {
    post: "A checklist for production ML",
    author: "sathvik",
    hoursAgo: 4,
    text: "The checklist around observability is useful. I always underestimate how much time this saves.",
  },
  {
    post: "Efficient vision systems: recording and slides",
    author: "priya",
    hoursAgo: 7,
    text: "Can the slides be kept in the Resources section too?",
  },
];

const likes = [
  { post: "Welcome to the IIITA community feed", author: "sathvik" },
  { post: "Welcome to the IIITA community feed", author: "aarav" },
  { post: "A checklist for production ML", author: "sathvik" },
  { post: "A checklist for production ML", author: "priya" },
  { post: "From coursework to a strong first internship", author: "aarav" },
  { post: "From coursework to a strong first internship", author: "riya" },
  { post: "Efficient vision systems: recording and slides", author: "sathvik" },
];

// Sathvik follows a few alumni so the "Following" tab has content.
const follows = {
  sathvik: ["aarav", "college", "sneha"],
};

/*
 * Extra demo content: an additional set of alumni voices plus longer
 * LinkedIn / X-style posts and real comment threads, so the feed and the AI
 * features have enough material to work with.
 */
const demo = require("./demoContent");

const allUsers = [...users, ...demo.users];
const allChannels = [...new Set([...channels, ...demo.channels])];
const allPosts = [...posts, ...demo.posts];
const allComments = [...comments, ...demo.comments];
const allLikes = [...likes, ...demo.likes];

const allFollows = {};
for (const source of [follows, demo.follows]) {
  for (const [key, list] of Object.entries(source)) {
    allFollows[key] = [...new Set([...(allFollows[key] || []), ...list])];
  }
}

// Matching demo data: explicit availability and goals make the recommendation
// screens meaningful without requiring every seeded account to edit a profile.
const matchingProfiles = {
  sathvik: {
    mentee_goals: ["Career", "Placements"],
    internship_preferences: {
      types: ["Internship", "Referral"],
      work_modes: ["Remote", "Hybrid"],
      locations: ["Bengaluru", "Hyderabad", "Remote"],
    },
  },
  aarav: {
    mentorship: { available: true, areas: ["Career", "Placements"], capacity: 3, mode: "Remote" },
  },
  riya: {
    mentorship: { available: true, areas: ["Career", "Placements"], capacity: 2, mode: "Hybrid" },
  },
  sneha: {
    mentorship: { available: true, areas: ["Research", "Higher Studies"], capacity: 2, mode: "Remote" },
  },
  dev: {
    mentorship: { available: true, areas: ["Career", "Entrepreneurship"], capacity: 3, mode: "Remote" },
  },
  priya: {
    mentorship: { available: true, areas: ["Career", "Placements", "Research"], capacity: 3, mode: "Remote" },
  },
  aditya: {
    mentorship: { available: true, areas: ["Career", "Placements"], capacity: 2, mode: "Hybrid" },
  },
  meera: {
    mentorship: { available: true, areas: ["Career", "Entrepreneurship"], capacity: 2, mode: "Remote" },
  },
  kabir: {
    mentorship: { available: true, areas: ["Entrepreneurship", "Career"], capacity: 2, mode: "Remote" },
  },
  ananya: {
    mentorship: { available: true, areas: ["Higher Studies", "Research"], capacity: 2, mode: "Remote" },
  },
  rahul: {
    mentorship: { available: true, areas: ["Career", "Placements"], capacity: 2, mode: "Remote" },
  },
  neha: {
    mentorship: { available: true, areas: ["Research", "Higher Studies"], capacity: 4, mode: "Hybrid" },
  },
  ishaan: {
    mentorship: { available: true, areas: ["Higher Studies", "Career"], capacity: 2, mode: "Remote" },
  },
  tara: {
    mentorship: { available: true, areas: ["Career", "Entrepreneurship"], capacity: 2, mode: "Remote" },
  },
};

const mentorDefaultsFor = (spec) => {
  if (!["alumni", "faculty"].includes(spec.role)) {
    return { available: false, areas: [], capacity: 0, mode: "Remote" };
  }
  const text = `${spec.working_area || ""} ${spec.bio || ""} ${(spec.skills || []).join(" ")}`.toLowerCase();
  const areas = [];
  if (/career|industry|engineer|manager|product|placement|job|hiring|interview/.test(text)) areas.push("Career");
  if (/research|paper|phd|lab|science|professor|faculty/.test(text)) areas.push("Research");
  if (/masters|higher studies|gre|university|admission/.test(text)) areas.push("Higher Studies");
  if (/startup|founder|entrepreneur|business|venture|fundraising/.test(text)) areas.push("Entrepreneurship");
  if (/placement|internship|referral|hiring/.test(text)) areas.push("Placements");
  return {
    available: true,
    areas: [...new Set(areas.length ? areas : ["Career"])],
    capacity: 3,
    mode: "Remote",
  };
};

// Earlier versions of the seed used a short stub with the same title as the
// long-form post. Remove it so the feed does not show both.
const obsoletePosts = [
  { heading: "Frontend to platform engineering: what transferred?", channel: "General" },
];

// ---------------------------------------------------------------------------
// Open Doors demo data. These are capped offers, not calendars. One door is
// intentionally inactive so the default and the owner toggle are visible.
// ---------------------------------------------------------------------------
const demoDoors = [
  {
    key: "aarav-chat",
    owner: "aarav",
    type: "chat15",
    title: "15 minutes on production ML",
    topics: ["Machine Learning", "MLOps", "Careers"],
    monthlyCap: 2,
    active: true,
    daysAgo: 18,
  },
  {
    key: "aarav-question",
    owner: "aarav",
    type: "question",
    title: "Ask about production ML careers",
    topics: ["Machine Learning", "Interviews", "Careers"],
    monthlyCap: 8,
    active: true,
    daysAgo: 16,
  },
  {
    key: "riya-resume",
    owner: "riya",
    type: "resume_review",
    title: "Backend resume review",
    topics: ["Backend", "Resume", "Placements"],
    monthlyCap: 2,
    active: true,
    daysAgo: 14,
  },
  {
    key: "tara-mock",
    owner: "tara",
    type: "mock_interview",
    title: "Design systems mock interview",
    topics: ["Design", "Interviews"],
    monthlyCap: 2,
    active: true,
    daysAgo: 12,
  },
  {
    key: "kabir-referral",
    owner: "kabir",
    type: "referral",
    title: "Referral for fintech backend roles",
    topics: ["Backend", "Referrals", "Fintech"],
    monthlyCap: 1,
    active: true,
    daysAgo: 10,
  },
  {
    key: "sneha-question",
    owner: "sneha",
    type: "question",
    title: "Computer vision research questions",
    topics: ["Computer Vision", "Research", "Higher Studies"],
    monthlyCap: 6,
    active: true,
    daysAgo: 9,
  },
  {
    key: "nikhil-chat",
    owner: "nikhil",
    type: "chat15",
    title: "Search infrastructure at Google",
    topics: ["Search", "Google", "Distributed Systems"],
    monthlyCap: 1,
    active: false,
    daysAgo: 7,
  },
];

const demoDoorRequests = [
  {
    door: "aarav-question",
    from: "sathvik",
    status: "completed",
    message: "How should I evaluate a production ML model before launch?",
    answerText:
      "Demo answer (fictional): freeze a representative evaluation set, report per-slice metrics, and compare against the current production model. Add a monitoring plan before you touch the ranking logic.",
    daysAgo: 20,
    completedDaysAgo: 15,
    helped: true,
  },
  {
    door: "aarav-chat",
    from: "sathvik",
    status: "accepted",
    message: "Demo request (fictional): could we talk about moving from coursework to production ML?",
    daysAgo: 4,
  },
  {
    door: "riya-resume",
    from: "sathvik",
    status: "pending",
    message: "Demo request (fictional): could you review my backend resume before placements?",
    daysAgo: 2,
  },
];

// ---------------------------------------------------------------------------
// Demo story: mentorship requests, Messenger chats, pending join requests and
// event Q&A. Every person and message below is fictional and labelled as such
// in the seeded text.
// ---------------------------------------------------------------------------
const mentorshipRequests = [
  {
    from: "sathvik",
    to: "aarav",
    area: "Career",
    status: "pending",
    message: "Demo request (fictional): I would like guidance on moving from coursework to production ML.",
    daysAgo: 2,
  },
  {
    from: "sathvik",
    to: "riya",
    area: "Placements",
    status: "active",
    message: "Demo request (fictional): could we talk about backend interview preparation?",
    daysAgo: 9,
  },
  {
    from: "sathvik",
    to: "sneha",
    area: "Research",
    status: "completed",
    message: "Demo request (fictional): advice on applying to research roles.",
    daysAgo: 30,
    completedDaysAgo: 12,
  },
  {
    from: "dev",
    to: "aarav",
    area: "Career",
    status: "pending",
    message: "Demo request (fictional): looking for advice on ML internships.",
    daysAgo: 1,
  },
  {
    from: "priya",
    to: "riya",
    area: "Placements",
    status: "accepted",
    message: "Demo request (fictional): referral and interview preparation.",
    daysAgo: 5,
  },
];

const demoConversations = [
  {
    members: ["sathvik", "aarav"],
    isGroup: false,
    messages: [
      { from: "aarav", text: "Demo chat (fictional): happy to help with the ML roadmap. What are you working on this month?", hoursAgo: 26 },
      { from: "sathvik", text: "Demo chat (fictional): building a small recommender for the alumni feed.", hoursAgo: 25 },
      { from: "aarav", text: "Demo chat (fictional): nice. Start with evaluation before adding features.", hoursAgo: 24 },
    ],
  },
  {
    members: ["sathvik", "riya"],
    isGroup: false,
    messages: [
      { from: "sathvik", text: "Demo chat (fictional): could you review my backend interview plan?", hoursAgo: 8 },
      { from: "riya", text: "Demo chat (fictional): yes, send it over and I will add comments.", hoursAgo: 7 },
    ],
  },
  {
    members: ["sathvik", "aarav", "riya", "sneha"],
    isGroup: true,
    groupName: "Demo ML Circle (fictional)",
    groupAdmins: ["aarav"],
    messages: [
      { from: "sneha", text: "Demo chat (fictional): sharing a paper on efficient retrieval later today.", hoursAgo: 50 },
      { from: "riya", text: "Demo chat (fictional): great, I can cover the systems side.", hoursAgo: 49 },
      { from: "sathvik", text: "Demo chat (fictional): I will bring questions from the feed recommender.", hoursAgo: 48 },
    ],
  },
];

const demoJoinRequests = [
  {
    name: "Demo Applicant One (fictional)",
    email: "demo.applicant1@example.com",
    role: "student",
    program: "B.Tech IT",
    starting_year: "2021",
    passing_year: "2025",
  },
  {
    name: "Demo Applicant Two (fictional)",
    email: "demo.applicant2@example.com",
    role: "alumni",
    program: "B.Tech IT",
    starting_year: "2015",
    passing_year: "2019",
    organisation: "Demo Labs (fictional)",
    designation: "Engineer",
    location: "Bengaluru, India",
  },
  {
    name: "Demo Applicant Three (fictional)",
    email: "demo.applicant3@example.com",
    role: "faculty",
    department: "Information Technology",
    designation: "Assistant Professor",
  },
];

const demoEventQuestions = [
  {
    eventTitle: "Career Q&A with Alumni",
    student: "sathvik",
    question: "Demo question (fictional): how early should I start applying for ML internships?",
    hoursAgo: 30,
    replies: [
      {
        alumni: "aarav",
        text: "Demo answer (fictional): start three to four months before the window and build one project you can explain end to end.",
        hoursAgo: 28,
      },
    ],
  },
  {
    eventTitle: "Career Q&A with Alumni",
    student: "dev",
    question: "Demo question (fictional): how do referrals actually work at product companies?",
    hoursAgo: 22,
    replies: [
      {
        alumni: "riya",
        text: "Demo answer (fictional): ask someone who knows your work, share the role link and a two-line summary, and follow up once.",
        hoursAgo: 20,
      },
    ],
  },
  {
    eventTitle: "Career Q&A with Alumni",
    student: "priya",
    question: "Demo question (fictional): is a research master's useful before an industry ML role?",
    hoursAgo: 14,
    replies: [
      {
        alumni: "sneha",
        text: "Demo answer (fictional): it helps for research-heavy teams; for product teams, shipped projects matter more.",
        hoursAgo: 12,
      },
    ],
  },
];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to", mongoose.connection.name);

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const byKey = {};
  let createdUsers = 0;

  for (const spec of allUsers) {
    const matching = matchingProfiles[spec.key] || {};
    const fields = {
      name: spec.name,
      email: spec.email,
      role: spec.role,
      avatar: avatarFor(spec.email),
      program: spec.program,
      starting_year: spec.starting_year,
      passing_year: spec.passing_year,
      location: spec.location,
      designation: spec.designation,
      organisation: spec.organisation,
      working_area: spec.working_area,
      skills: spec.skills || [],
      bio: spec.bio,
      isAdmin: !!spec.isAdmin,
      adminType: spec.adminType,
      mentorship: matching.mentorship || mentorDefaultsFor(spec),
      mentee_goals: matching.mentee_goals || [],
      internship_preferences: matching.internship_preferences || {},
    };

    let user = await User.findOne({ email: spec.email });
    if (!user) {
      user = await User.create({ ...fields, password });
      createdUsers += 1;
    } else {
      Object.assign(user, fields);
      await user.save();
    }
    byKey[spec.key] = user;
  }

  let createdChannels = 0;
  for (const name of allChannels) {
    const existing = await Channel.findOne({ name });
    if (!existing) {
      await Channel.create({ name });
      createdChannels += 1;
    }
  }

  let createdResources = 0;
  for (const spec of resources) {
    const existing = await Resource.findOne({ title: spec.title });
    if (existing) {
      existing.topic = spec.topic;
      existing.fileUrl = spec.fileUrl;
      existing.filePublicId = spec.filePublicId;
      existing.uploadedBy = byKey.sathvik?._id;
      await existing.save();
    } else {
      await Resource.create({
        ...spec,
        uploadedBy: byKey.sathvik?._id,
      });
      createdResources += 1;
    }
  }

  let createdPosts = 0;
  let refreshedPosts = 0;
  const postByHeading = {};

  const demoUserIds = Object.values(byKey).map((user) => user._id);
  for (const spec of obsoletePosts) {
    // Scope the cleanup to seeded accounts so a real member post with the
    // same title is never removed.
    await Post.deleteMany({
      heading: spec.heading,
      channel: spec.channel,
      user: { $in: demoUserIds },
    });
  }

  for (const spec of allPosts) {
    const author = byKey[spec.author];
    let post = await Post.findOne({ heading: spec.heading, channel: spec.channel });

    if (!post) {
      post = await Post.create({
        user: author._id,
        heading: spec.heading,
        text: spec.text,
        name: author.name,
        avatar: author.avatar,
        visibility: spec.visibility,
        channel: spec.channel,
        date: spec.date,
        images: [],
      });
      createdPosts += 1;
    } else if (String(post.user) !== String(author._id)) {
      // Someone else owns a post with this title. Leave it alone and skip the
      // demo comments/likes instead of attaching them to the wrong author.
      console.warn(`Skipping demo post owned by another user: ${spec.heading}`);
      continue;
    } else {
      // Demo timestamps are relative to "now". Refresh them on every seed so
      // the feed and the Top time filters do not silently age out.
      post.date = spec.date;
      await post.save();
      refreshedPosts += 1;
    }

    postByHeading[spec.heading] = post;
  }

  let createdComments = 0;
  let refreshedComments = 0;
  for (const spec of allComments) {
    const post = postByHeading[spec.post];
    const author = byKey[spec.author];
    if (!post || !author) continue;

    const existing = post.comments.find(
      (c) => String(c.user) === String(author._id) && c.text === spec.text
    );
    if (!existing) {
      post.comments.push({
        user: author._id,
        text: spec.text,
        name: author.name,
        avatar: author.avatar,
        date: hoursAgo(spec.hoursAgo),
      });
      await post.save();
      createdComments += 1;
    } else {
      // Keep replies ordered relative to the refreshed post date.
      existing.date = hoursAgo(spec.hoursAgo);
      await post.save();
      refreshedComments += 1;
    }
  }

  let createdLikes = 0;
  for (const spec of allLikes) {
    const post = postByHeading[spec.post];
    const author = byKey[spec.author];
    if (!post || !author) continue;

    const exists = post.likes.some((l) => String(l.user) === String(author._id));
    if (!exists) {
      post.likes.push({ user: author._id });
      await post.save();
      createdLikes += 1;
    }
  }

  let createdFollows = 0;
  for (const [followerKey, followingKeys] of Object.entries(allFollows)) {
    const follower = byKey[followerKey];
    if (!follower) continue;

    for (const followingKey of followingKeys) {
      const target = byKey[followingKey];
      if (!target) continue;

      const alreadyFollowing = (follower.followings || []).some(
        (id) => String(id) === String(target._id)
      );
      if (!alreadyFollowing) {
        follower.followings.push(target._id);
        target.followers.push(follower._id);
        await follower.save();
        await target.save();
        createdFollows += 1;
      }
    }
  }

  let createdEvents = 0;
  let refreshedEvents = 0;
  for (const spec of events) {
    const existing = await Event.findOne({ title: spec.title });
    if (!existing) {
      await Event.create({
        title: spec.title,
        Description: spec.Description,
        Speaker: spec.Speaker,
        Link: spec.Link,
        Event_post_date: new Date(),
        startTime: spec.start,
        endTime: spec.end,
        isPostQueryEnabled: true,
        queryStartTime: spec.queryStart || spec.start,
        queryEndTime: spec.end,
      });
      createdEvents += 1;
    } else {
      // Keep the "upcoming" rail populated on every reseed.
      existing.startTime = spec.start;
      existing.endTime = spec.end;
      existing.queryStartTime = spec.queryStart || spec.start;
      existing.queryEndTime = spec.end;
      await existing.save();
      refreshedEvents += 1;
    }
  }

  let createdJobs = 0;
  let refreshedJobs = 0;
  for (const spec of jobs) {
    const owner = byKey[spec.owner];
    if (!owner) continue;

    const existing = await Job.findOne({ Job_name: spec.title });
    if (!existing) {
      await Job.create({
        created_by_user: owner.name,
        userID: String(owner._id),
        Job_name: spec.title,
        Description: spec.description,
        Link: spec.link || "",
        Job_post_date: new Date(),
        Job_deadline: spec.deadline,
        skills: spec.skills || [],
        requirements: spec.skills || [],
        location: spec.location || "",
        work_mode: spec.work_mode || "",
        job_type: spec.job_type || "Internship",
        is_active: true,
      });
      createdJobs += 1;
    } else if (String(existing.userID) === String(owner._id)) {
      // Refresh deadlines and matching fields so the board stays demoable.
      existing.Job_post_date = new Date();
      existing.Job_deadline = spec.deadline;
      existing.skills = spec.skills || [];
      existing.requirements = spec.skills || [];
      existing.location = spec.location || "";
      existing.work_mode = spec.work_mode || "";
      existing.job_type = spec.job_type || "Internship";
      existing.is_active = true;
      await existing.save();
      refreshedJobs += 1;
    }
  }

  let createdGroups = 0;
  let refreshedGroups = 0;
  let createdDiscussions = 0;
  let refreshedDiscussions = 0;
  let createdGroupComments = 0;

  const initialsOf = (name) =>
    String(name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "II";

  for (const spec of demoGroups) {
    const owner = byKey[spec.owner];
    if (!owner) continue;

    const seededMembers = spec.members
      .filter((key) => byKey[key])
      .map((key) => ({
        user: byKey[key]._id,
        role: key === spec.owner ? "owner" : "member",
      }));

    let group = await Group.findOne({ name: spec.name });
    if (!group) {
      group = await Group.create({
        name: spec.name,
        initials: initialsOf(spec.name),
        description: spec.description,
        guidelines: spec.guidelines,
        category: spec.category,
        access: spec.access,
        owner: owner._id,
        members: seededMembers,
      });
      createdGroups += 1;
    } else {
      group.initials = initialsOf(spec.name);
      group.description = spec.description;
      group.guidelines = spec.guidelines;
      group.category = spec.category;
      group.access = spec.access;
      group.owner = owner._id;

      // Add missing demo members without dropping real members who joined
      // through the UI since the last seed.
      for (const entry of seededMembers) {
        const exists = group.members.some(
          (member) => String(member.user) === String(entry.user)
        );
        if (!exists) group.members.push(entry);
      }
      await group.save();
      refreshedGroups += 1;
    }

    for (const discussion of spec.discussions || []) {
      const author = byKey[discussion.author];
      if (!author) continue;

      let post = await Post.findOne({
        heading: discussion.heading,
        group: group._id,
      });

      if (!post) {
        post = await Post.create({
          user: author._id,
          heading: discussion.heading,
          text: discussion.text,
          name: author.name,
          avatar: author.avatar,
          visibility: ["student", "faculty", "alumni"],
          channel: group.name,
          group: group._id,
          date: hoursAgo(discussion.hoursAgo),
          images: [],
        });
        createdDiscussions += 1;
      } else {
        post.text = discussion.text;
        post.channel = group.name;
        post.date = hoursAgo(discussion.hoursAgo);
        await post.save();
        refreshedDiscussions += 1;
      }

      for (const comment of discussion.comments || []) {
        const commenter = byKey[comment.author];
        if (!commenter) continue;
        const exists = post.comments.some(
          (entry) =>
            String(entry.user) === String(commenter._id) &&
            entry.text === comment.text
        );
        if (!exists) {
          post.comments.push({
            user: commenter._id,
            text: comment.text,
            name: commenter.name,
            avatar: commenter.avatar,
            date: hoursAgo(comment.hoursAgo),
          });
          await post.save();
          createdGroupComments += 1;
        } else {
          const existingComment = post.comments.find(
            (entry) =>
              String(entry.user) === String(commenter._id) &&
              entry.text === comment.text
          );
          existingComment.date = hoursAgo(comment.hoursAgo);
          await post.save();
        }
      }
    }
  }

  // ── Mentorship requests in pending / active / completed states ───────────
  let createdMentorship = 0;
  let refreshedMentorship = 0;
  for (const spec of mentorshipRequests) {
    const from = byKey[spec.from];
    const to = byKey[spec.to];
    if (!from || !to) continue;

    const createdAt = hoursAgo(spec.daysAgo * 24);
    const fields = {
      message: spec.message,
      status: spec.status,
      updatedAt: createdAt,
    };
    if (spec.status === "completed") {
      fields.completedAt = hoursAgo(spec.completedDaysAgo * 24);
    }

    const existing = await MentorShipRequest.findOne({
      requestedBy: from._id,
      requestedTo: to._id,
      areaOfHelp: spec.area,
    });

    if (!existing) {
      await MentorShipRequest.create({
        requestedBy: from._id,
        requestedTo: to._id,
        areaOfHelp: spec.area,
        createdAt,
        ...fields,
      });
      createdMentorship += 1;
    } else {
      Object.assign(existing, fields);
      await existing.save();
      refreshedMentorship += 1;
    }
  }

  // ── Open Doors and their request history ─────────────────────────────────
  let createdDoors = 0;
  let createdDoorRequests = 0;
  const doorByKey = {};
  for (const spec of demoDoors) {
    const owner = byKey[spec.owner];
    if (!owner) continue;

    const fields = {
      type: spec.type,
      topics: spec.topics,
      monthlyCap: spec.monthlyCap,
      active: spec.active,
      updatedAt: hoursAgo(spec.daysAgo * 24),
    };
    let door = await Door.findOne({ owner: owner._id, title: spec.title });
    if (!door) {
      door = await Door.create({
        owner: owner._id,
        title: spec.title,
        createdAt: hoursAgo(spec.daysAgo * 24),
        ...fields,
      });
      createdDoors += 1;
    } else {
      Object.assign(door, fields);
      await door.save();
    }
    doorByKey[spec.key] = door;
  }

  for (const spec of demoDoorRequests) {
    const door = doorByKey[spec.door];
    const from = byKey[spec.from];
    if (!door || !from) continue;

    const createdAt = hoursAgo(spec.daysAgo * 24);
    const fields = {
      status: spec.status,
      message: spec.message,
      answerText: spec.answerText || "",
      helped: spec.helped ?? null,
      updatedAt: createdAt,
    };
    if (spec.status === "completed") {
      fields.completedAt = hoursAgo(
        (spec.completedDaysAgo ?? spec.daysAgo) * 24
      );
    }

    const existing = await DoorRequest.findOne({
      door: door._id,
      requestedBy: from._id,
      message: spec.message,
    });
    if (!existing) {
      await DoorRequest.create({
        door: door._id,
        requestedBy: from._id,
        createdAt,
        ...fields,
      });
      createdDoorRequests += 1;
    } else {
      Object.assign(existing, fields);
      await existing.save();
    }
  }

  // ── Messenger conversations and messages ─────────────────────────────────
  let createdConversations = 0;
  let createdMessages = 0;
  for (const spec of demoConversations) {
    const memberIds = spec.members
      .map((key) => byKey[key]?._id)
      .filter(Boolean);
    if (memberIds.length < 2) continue;

    let conversation = await Conversation.findOne({
      isGroup: !!spec.isGroup,
      members: { $all: memberIds, $size: memberIds.length },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        isGroup: !!spec.isGroup,
        groupName: spec.groupName,
        groupAdmins: (spec.groupAdmins || [])
          .map((key) => byKey[key]?._id)
          .filter(Boolean),
        members: memberIds,
      });
      createdConversations += 1;
    }

    let latest = null;
    for (const entry of spec.messages) {
      const sender = byKey[entry.from];
      if (!sender) continue;

      const when = hoursAgo(entry.hoursAgo);
      let message = await Message.findOne({
        conversation: conversation._id,
        sender: sender._id,
        text: entry.text,
      });

      if (!message) {
        message = await Message.create({
          conversation: conversation._id,
          sender: sender._id,
          text: entry.text,
          readBy: memberIds,
        });
        createdMessages += 1;
      }

      // Mongoose manages timestamps, so set the demo time explicitly.
      await Message.collection.updateOne(
        { _id: message._id },
        { $set: { createdAt: when, updatedAt: when } }
      );

      if (!latest || when > latest.when) {
        latest = { when, sender: sender._id, text: entry.text };
      }
    }

    if (latest) {
      conversation.lastMessage = latest.text;
      conversation.lastMessageAt = latest.when;
      conversation.lastMessageSender = latest.sender;
      await conversation.save();
    }
  }

  // ── Pending join requests for the admin queue ────────────────────────────
  let createdJoinRequests = 0;
  for (const spec of demoJoinRequests) {
    const existing = await JoinRequest.findOne({ email: spec.email });
    if (!existing) {
      await JoinRequest.create({ ...spec, password });
      createdJoinRequests += 1;
    }
  }

  // ── Event Q&A with seeded replies ────────────────────────────────────────
  let createdEventQuestions = 0;
  for (const spec of demoEventQuestions) {
    const event = await Event.findOne({ title: spec.eventTitle });
    const student = byKey[spec.student];
    if (!event || !student) continue;

    const existing = await EventQuestion.findOne({
      eventId: event._id,
      question: spec.question,
    });
    if (!existing) {
      await EventQuestion.create({
        eventId: event._id,
        studentId: student._id,
        question: spec.question,
        createdAt: hoursAgo(spec.hoursAgo),
        replies: (spec.replies || [])
          .map((reply) => ({
            alumniId: byKey[reply.alumni]?._id,
            replyText: reply.text,
            createdAt: hoursAgo(reply.hoursAgo),
          }))
          .filter((reply) => reply.alumniId),
      });
      createdEventQuestions += 1;
    }
  }

  console.log(
    `Seeded: ${createdUsers} users, ${createdChannels} topics, ${createdPosts} posts, ` +
      `${createdComments} comments, ${createdLikes} likes, ${createdFollows} follows, ` +
      `${createdEvents} events, ${createdJobs} jobs, ${createdResources} resources, ` +
      `${createdGroups} groups, ` +
      `${createdDiscussions} group discussions, ${createdGroupComments} group replies, ` +
      `${createdMentorship} mentorship requests, ${createdDoors} doors, ` +
      `${createdDoorRequests} door requests, ${createdConversations} conversations, ` +
      `${createdMessages} messages, ${createdJoinRequests} join requests, ` +
      `${createdEventQuestions} event questions.`
  );
  console.log(
    `Refreshed: ${refreshedPosts} posts, ${refreshedComments} comments, ` +
      `${refreshedEvents} events, ${refreshedJobs} jobs, ${refreshedGroups} groups, ` +
      `${refreshedDiscussions} group discussions, ${refreshedMentorship} mentorship requests.`
  );
  console.log(`Demo password for every seeded account: ${DEMO_PASSWORD}`);
  console.log(
    "All seeded people, messages and questions are fictional demo data, not real alumni records."
  );

  // Keep the unified search index in step with a fresh seed.
  try {
    const { rebuildSearchIndex } = require("../services/searchIndex");
    const stats = await rebuildSearchIndex();
    console.log(
      `Search index: ${stats.indexed} documents (${stats.model}, ${
        stats.semantic ? "semantic" : "text-only"
      }).`
    );
  } catch (err) {
    console.warn("Search index build failed:", err.message);
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
