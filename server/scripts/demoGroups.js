/*
 * Demo community hubs for the Groups & Cohorts page.
 *
 * Each hub mirrors a prototype category (batch, programme, club, chapter,
 * cohort, invite-only) so the filters, access states and owner controls can be
 * demonstrated without hand-creating data. Discussions are ordinary Post
 * documents with a `group` ref; the seed below adds a few replies to one
 * thread so the in-group AI TL;DR has something to summarise.
 */

const groups = [
  {
    name: "Class of 2024",
    category: "BATCH",
    access: "OPEN",
    owner: "sathvik",
    description:
      "Undergraduate and postgraduate students graduating in 2024. Placement updates, farewell planning and convocation prep live here.",
    guidelines:
      "Keep placement threads factual and anonymise other people's offers. Official notices from the placement cell override anything posted here.",
    members: ["sathvik", "rahul", "ananya", "priya"],
    discussions: [
      {
        author: "sathvik",
        heading: "Placement drive slides are on the resource hub",
        hoursAgo: 6,
        text: "<p>The slides from this week's placement briefing are uploaded to the Resource Hub. The short version: update your resume PDF, keep one project story ready, and check the eligibility sheet before applying.</p>",
        comments: [
          {
            author: "rahul",
            heading: null,
            text: "Thanks. Is the eligibility sheet the same one shared in the cohort mail?",
            hoursAgo: 4,
          },
          {
            author: "priya",
            heading: null,
            text: "Yes, but the CGPA cutoff column was corrected yesterday, so re-download it.",
            hoursAgo: 3,
          },
        ],
      },
      {
        author: "ananya",
        heading: "Convocation photo volunteers?",
        hoursAgo: 28,
        text: "<p>We need four volunteers to coordinate the batch photo after the ceremony. Reply here if you are free for thirty minutes.</p>",
        comments: [],
      },
    ],
  },
  {
    name: "Class of 2023 Alumni",
    category: "BATCH",
    access: "OPEN",
    owner: "aditya",
    description:
      "The 2023 graduating class, now spread across companies and campuses. A low-volume space for reunions, referrals and life updates.",
    guidelines:
      "No recruiter spam. Referral posts should include the role, location and a working link.",
    members: ["aditya", "meera", "kabir", "tara"],
    discussions: [
      {
        author: "meera",
        heading: "Bengaluru meetup in November",
        hoursAgo: 20,
        text: "<p>A few of us are planning a casual dinner in Indiranagar in the second week of November. Bringing the 2023 batch together first, but nearby alumni are welcome.</p>",
        comments: [],
      },
    ],
  },
  {
    name: "B.Tech IT Programme",
    category: "PROGRAMME",
    access: "OPEN",
    owner: "neha",
    description:
      "Students, faculty and alumni of the B.Tech IT programme. Curriculum feedback, elective advice and project supervision questions.",
    guidelines:
      "Academic questions are welcome. Do not share internal exam papers or confidential course material.",
    members: ["neha", "sathvik", "priya", "dev", "ananya"],
    discussions: [
      {
        author: "neha",
        heading: "Elective advice for the 2026 batch",
        hoursAgo: 9,
        text: "<p>If you are choosing between distributed systems and advanced databases, pick based on the project you want to build, not the grading pattern. Both are heavy in the second half of the semester.</p>",
        comments: [],
      },
    ],
  },
  {
    name: "Competitive Programming Society",
    category: "CLUB",
    access: "OPEN",
    owner: "dev",
    description:
      "Weekly contests, problem discussions and interview prep for the IIITA programming community. Beginners are explicitly welcome.",
    guidelines:
      "Use spoiler tags for contest solutions until the contest ends. Explain the idea before pasting code.",
    members: ["dev", "sathvik", "ishaan", "rahul"],
    discussions: [
      {
        author: "dev",
        heading: "Sunday ladder: graphs and shortest paths",
        hoursAgo: 14,
        text: "<p>This Sunday we are running a four-problem ladder on graphs. Two problems are standard Dijkstra variants; the last one needs a small observation about edge weights. Post your approach after the contest, not during it.</p>",
        comments: [],
      },
      {
        author: "ishaan",
        heading: "Good resources for DP on trees?",
        hoursAgo: 46,
        text: "<p>I understand rerooting in theory but keep messing up the merge step. Any notes or problem lists that worked for you?</p>",
        comments: [],
      },
    ],
  },
  {
    name: "Bay Area Alumni Chapter",
    category: "CHAPTER",
    access: "OPEN",
    owner: "meera",
    description:
      "IIITA alumni living and working in the San Francisco Bay Area. Meetups, housing leads and visa questions from people a few years ahead.",
    guidelines:
      "Housing and referral posts must include a contact method. Keep visa discussion personal-experience based, not legal advice.",
    members: ["meera", "kabir", "tara", "aditya"],
    discussions: [
      {
        author: "kabir",
        heading: "Housing leads near South Bay offices",
        hoursAgo: 33,
        text: "<p>Two rooms are opening up in a shared apartment in Santa Clara next month. Walking distance to the Caltrain, current tenants are two IIITA alumni. DM me for details.</p>",
        comments: [],
      },
    ],
  },
  {
    name: "Product Internship Cohort 2026",
    category: "COHORT",
    access: "REQUEST",
    owner: "riya",
    description:
      "Students applying to product management internships in the 2026 cycle. Weekly application check-ins, mock interviews and resume reviews.",
    guidelines:
      "Applications are reviewed by the cohort owner. Share timelines and rejections honestly; no fake referrals.",
    members: ["riya", "sneha", "dev"],
    discussions: [
      {
        author: "riya",
        heading: "Week 3 check-in: where is everyone applying?",
        hoursAgo: 11,
        text: "<p>Drop your top three applications and current stage below. We will pair people for mock product-sense interviews on Friday evening.</p>",
        comments: [],
      },
    ],
  },
  {
    name: "Research & Higher Studies Circle",
    category: "INVITE",
    access: "INVITE",
    owner: "neha",
    description:
      "A small working group for alumni and students preparing PhD applications, papers and research internships. Membership is by invitation.",
    guidelines:
      "Feedback on drafts stays inside the group. Do not circulate other people's unpublished work.",
    members: ["neha", "ananya", "ishaan"],
    discussions: [
      {
        author: "neha",
        heading: "SOP review round this weekend",
        hoursAgo: 52,
        text: "<p>I have three slots for statement-of-purpose reviews on Saturday. Post a short summary of your research question and target programme, and I will pick the three that need the most structural help.</p>",
        comments: [],
      },
    ],
  },
];

module.exports = { groups };
