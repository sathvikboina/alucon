// Explainable matching for internships and mentors.
//
// The ranking follows the pipeline described in the project deck:
//   hard constraints -> skill / text overlap -> contextual signals -> explanation
//
// Ranking is deterministic. No model re-ranks candidates, so a score is
// reproducible and the same role scores the same on the job board and on
// /internship-matches. The UI labels the result as algorithmic.

const Job = require("../models/Jobs");
const User = require("../models/User");
const MentorShipRequest = require("../models/MentorShipRequest");

const DAY = 24 * 60 * 60 * 1000;

const MENTORSHIP_AREAS = [
  "Career",
  "Research",
  "Higher Studies",
  "Entrepreneurship",
  "Placements",
  "Other",
];

const SKILL_ALIASES = {
  "machine learning": ["machine learning", "ml", "applied ml"],
  "deep learning": ["deep learning", "dl"],
  "computer vision": ["computer vision", "vision", "cv"],
  nlp: ["nlp", "natural language processing", "language models", "llm", "llms"],
  "distributed systems": ["distributed systems", "distributed system", "distributed"],
  python: ["python"],
  javascript: ["javascript", "js"],
  typescript: ["typescript", "ts"],
  react: ["react", "react.js", "reactjs"],
  "node.js": ["node.js", "nodejs", "node"],
  api: ["api", "apis", "rest", "rest api"],
  sql: ["sql", "databases", "database", "postgres", "postgresql", "mysql"],
  mongodb: ["mongodb", "mongo"],
  docker: ["docker", "containers"],
  kubernetes: ["kubernetes", "k8s"],
  aws: ["aws", "amazon web services"],
  gcp: ["gcp", "google cloud"],
  "c++": ["c++", "cpp"],
  java: ["java"],
  go: ["go", "golang"],
  mlops: ["mlops", "ml ops", "model monitoring", "model serving"],
  evaluation: ["evaluation", "evaluate", "eval", "benchmarking"],
  research: ["research", "paper", "papers", "publication", "publications"],
  pytorch: ["pytorch", "torch"],
  tensorflow: ["tensorflow", "tf"],
  statistics: ["statistics", "statistical", "probability"],
  "product strategy": ["product strategy", "product management"],
  "user research": ["user research", "ux research"],
  fintech: ["fintech", "payments"],
  startups: ["startups", "startup", "founder", "entrepreneurship"],
  fundraising: ["fundraising", "fundraising", "venture capital", "vc"],
  sre: ["sre", "site reliability", "reliability"],
  observability: ["observability", "logging", "metrics"],
  "incident response": ["incident response", "on-call", "postmortem"],
  "design systems": ["design systems", "design system"],
  accessibility: ["accessibility", "a11y"],
  figma: ["figma"],
  healthcare: ["healthcare", "health"],
  "causal inference": ["causal inference", "causal"],
  "time series": ["time series", "forecasting"],
  "market microstructure": ["market microstructure", "quant", "quantitative"],
  "backend": ["backend", "back-end", "server"],
  frontend: ["frontend", "front-end", "ui"],
  deployment: ["deployment", "deploy", "ci/cd", "devops"],
  kafka: ["kafka", "streaming"],
  "product engineering": ["product engineering", "product engineer"],
  "hci": ["hci", "human-computer interaction", "human computer interaction"],
  "applied ml": ["applied ml", "applied machine learning"],
  "research methods": ["research methods", "research method"],
};

const SKILL_ENTRIES = Object.entries(SKILL_ALIASES);

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "your", "you", "our",
  "are", "was", "were", "will", "have", "has", "had", "into", "about", "over",
  "under", "more", "most", "some", "any", "all", "can", "may", "not", "but",
  "who", "what", "when", "where", "why", "how", "their", "them", "they", "its",
  "work", "working", "role", "team", "student", "students", "alumni", "iiita",
  "iiit", "allahabad", "india", "intern", "internship", "internships", "project",
  "projects", "apply", "application", "applications", "candidate", "candidates",
  "experience", "experienced", "strong", "good", "plus", "using", "use", "used",
  "build", "building", "looking", "looking for", "please", "job", "jobs",
]);

const AREA_KEYWORDS = {
  Career: [
    "career", "job", "interview", "resume", "industry", "switch", "promotion",
    "referral", "hiring", "recruiter", "offer", "salary", "growth", "manager",
  ],
  Research: [
    "research", "paper", "publication", "phd", "experiment", "thesis", "lab",
    "academic", "science", "conference", "professor", "faculty", "methods",
  ],
  "Higher Studies": [
    "higher studies", "masters", "ms", "phd", "gre", "gmat", "university",
    "admission", "abroad", "graduate school", "application", "statement",
  ],
  Entrepreneurship: [
    "startup", "founder", "entrepreneur", "business", "fundraising", "venture",
    "go-to-market", "gtm", "product", "market", "customers", "revenue",
  ],
  Placements: [
    "placement", "internship", "job", "interview", "resume", "recruiter",
    "referral", "offer", "hiring", "salary", "company", "role",
  ],
  Other: [],
};

const cleanString = (value, max = 240) => {
  if (typeof value !== "string") return "";
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

const cleanList = (value, maxItems, maxLen) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(typeof item === "string" ? item : item?.text, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
};

const toArray = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasPhrase = (text, phrase) => {
  const normalizedPhrase = normalize(phrase);
  if (!normalizedPhrase) return false;
  return new RegExp(
    `(^|[^a-z0-9+#.])${escapeRegExp(normalizedPhrase)}([^a-z0-9+#.]|$)`,
    "i"
  ).test(text);
};

const tokenize = (value) =>
  normalize(value)
    .split(" ")
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

const tokenSet = (value) => new Set(tokenize(value));

function textSimilarity(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((word) => {
    if (right.has(word)) intersection += 1;
  });
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function aliasesFor(skill) {
  const key = normalize(skill);
  const direct = SKILL_ALIASES[key];
  if (direct) return new Set([key, ...direct.map(normalize)]);
  const entry = Object.entries(SKILL_ALIASES).find(([canonical, aliases]) =>
    [canonical, ...aliases].some((alias) => normalize(alias) === key)
  );
  if (entry) return new Set([normalize(entry[0]), ...entry[1].map(normalize)]);
  return new Set([key]);
}

function skillsMatch(a, b) {
  const left = aliasesFor(a);
  const right = aliasesFor(b);
  for (const alias of left) {
    if (right.has(alias)) return true;
  }
  return false;
}

function uniqueSkills(skills) {
  const seen = [];
  const result = [];
  for (const skill of skills) {
    const label = cleanString(skill, 50);
    if (!label) continue;
    const aliases = aliasesFor(label);
    const duplicate = seen.some((existing) =>
      [...aliases].some((alias) => existing.has(alias))
    );
    if (duplicate) continue;
    seen.push(aliases);
    result.push(label);
  }
  return result;
}

function profileSkills(user) {
  // Only skills the member actually lists. Internship preferences describe
  // desired context, not evidence of experience.
  return uniqueSkills(toArray(user?.skills));
}

function profileText(user) {
  return [
    user?.name,
    user?.program,
    user?.department,
    user?.designation,
    user?.organisation,
    user?.working_area,
    user?.bio,
    ...profileSkills(user),
    ...(Array.isArray(user?.experience) ? user.experience : []).flatMap((item) => [
      item?.title,
      item?.company,
      item?.description,
    ]),
    ...(Array.isArray(user?.education) ? user.education : []).flatMap((item) => [
      item?.school,
      item?.degree,
      item?.fieldofstudy,
      item?.description,
    ]),
  ]
    .filter(Boolean)
    .join(" ");
}

function extractSkillsFromText(text) {
  const normalized = ` ${normalize(text)} `;
  const found = [];
  for (const [canonical, aliases] of SKILL_ENTRIES) {
    if ([canonical, ...aliases].some((alias) => hasPhrase(normalized, alias))) {
      found.push(canonical);
    }
  }
  return uniqueSkills(found);
}

function requirementsFor(job) {
  return uniqueSkills([
    ...toArray(job?.skills),
    ...toArray(job?.requirements),
    ...extractSkillsFromText(
      `${job?.Job_name || ""} ${job?.Description || ""} ${job?.job_type || ""}`
    ),
  ]);
}

function inferJobType(job) {
  const explicit = cleanString(job?.job_type, 40);
  if (explicit) return explicit;
  const text = normalize(`${job?.Job_name || ""} ${job?.Description || ""}`);
  if (text.includes("intern")) return "Internship";
  if (text.includes("research")) return "Research";
  if (text.includes("referral")) return "Referral";
  if (text.includes("project")) return "Project";
  return "Opportunity";
}

function isEligible(user, job) {
  const programs = toArray(job?.eligible_programs);
  if (programs.length) {
    const program = normalize(user?.program);
    if (!program || !programs.some((item) => normalize(item) === program)) {
      return { ok: false, reason: `Open to ${programs.join(", ")}` };
    }
  }

  const years = toArray(job?.eligible_graduation_years);
  if (years.length) {
    const year = String(user?.passing_year || "");
    if (!year || !years.includes(year)) {
      return { ok: false, reason: `Graduation year ${years.join(", ")} only` };
    }
  }

  const roles = toArray(job?.eligible_roles);
  if (roles.length) {
    const role = normalize(user?.role);
    if (!roles.some((item) => normalize(item) === role)) {
      return { ok: false, reason: `Open to ${roles.join(", ")}` };
    }
  }

  return { ok: true };
}

function preferredModes(user) {
  return toArray(user?.internship_preferences?.work_modes).map(normalize);
}

function preferredLocations(user) {
  return toArray(user?.internship_preferences?.locations).map(normalize);
}

function locationMatches(user, job) {
  const location = normalize(job?.location);
  if (!location) return false;
  return preferredLocations(user).some(
    (preference) =>
      preference === "remote" ? location.includes("remote") : location.includes(preference)
  );
}

function modeMatches(user, job) {
  const mode = normalize(job?.work_mode);
  if (!mode) return false;
  const preferred = preferredModes(user);
  return preferred.some((item) => item === mode || item === "any" || (item === "remote" && mode.includes("remote")));
}

function daysUntil(date) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  return Math.ceil((value.getTime() - Date.now()) / DAY);
}

function daysSince(date) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - value.getTime()) / DAY));
}

function clampScore(value, min = 30, max = 98) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function internshipVerdict(score) {
  if (score >= 82) return "Strong match";
  if (score >= 68) return "Good match";
  if (score >= 52) return "Worth exploring";
  return "Stretch";
}

function internshipSummary({ matched, missing, jobType, domain }) {
  const type = jobType || "role";
  if (matched.length >= 2) {
    const missingText = missing.length
      ? ` Build ${missing.slice(0, 2).join(" and ")} to close the remaining gap.`
      : " Your profile already covers the listed requirements.";
    return `Your ${matched.slice(0, 3).join(", ")} experience lines up with this ${type.toLowerCase()}.${missingText}`;
  }
  if (matched.length === 1) {
    const missingText = missing.length
      ? ` The main gap is ${missing.slice(0, 2).join(" and ")}.`
      : " The rest of your profile is still relevant.";
    return `${matched[0]} overlaps with this ${type.toLowerCase()}${domain ? ` in ${domain}` : ""}.${missingText}`;
  }
  if (missing.length) {
    return `No direct skill overlap yet, so this is a stretch. Start with ${missing.slice(0, 2).join(" and ")} before applying.`;
  }
  return `This ${type.toLowerCase()} is adjacent to your profile; use the description to decide whether the direction is useful.`;
}

function matchInternship(user, job, poster) {
  const eligibility = isEligible(user, job);
  if (!eligibility.ok) return null;

  const requirements = requirementsFor(job);
  const userSkills = profileSkills(user);
  const userText = profileText(user);
  const jobText = `${job.Job_name || ""} ${job.Description || ""} ${requirements.join(" ")} ${job.organisation || ""}`;

  const matched = [];
  const missing = [];
  for (const requirement of requirements) {
    const matchesSkill = userSkills.some((skill) => skillsMatch(skill, requirement));
    const matchesText = hasPhrase(normalize(userText), requirement);
    if (matchesSkill || matchesText) matched.push(requirement);
    else missing.push(requirement);
  }

  const skillCoverage = requirements.length ? matched.length / requirements.length : 0;
  const domainSimilarity = textSimilarity(jobText, userText);
  const jobType = inferJobType(job);
  const isInternship = /intern|placement/i.test(`${jobType} ${job.Job_name || ""}`);
  const freshDays = daysSince(job.Job_post_date);
  const deadlineDays = daysUntil(job.Job_deadline);
  const mode = modeMatches(user, job);
  const location = locationMatches(user, job);
  const preferredTypes = toArray(user?.internship_preferences?.types).map(normalize);
  const typeMatches = preferredTypes.some((item) => item === normalize(jobType));
  const posterRole = normalize(poster?.role);

  let score = 35 + skillCoverage * 35 + domainSimilarity * 15;
  const reasons = [];
  const contextBits = [];

  if (isInternship) {
    score += 5;
    contextBits.push("internship");
  }
  if (typeMatches) {
    score += 4;
    contextBits.push(`matches your preferred ${jobType.toLowerCase()} type`);
  }
  if (mode) {
    score += 4;
    contextBits.push(`matches your ${normalize(job.work_mode)} preference`);
  }
  if (location) {
    score += 4;
    contextBits.push(`location fits ${cleanString(job.location, 50)}`);
  }
  if (freshDays !== null && freshDays <= 14) {
    score += 3;
    contextBits.push("recently posted");
  }
  if (posterRole === "alumni" || posterRole === "faculty") {
    score += 2;
    contextBits.push("posted by a verified member");
  }
  if (deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7) {
    score += 1;
    contextBits.push("closing soon");
  }
  score = clampScore(score);

  if (matched.length) {
    reasons.push(
      `${matched.length} of ${requirements.length} listed requirement${
        requirements.length === 1 ? "" : "s"
      } match your profile: ${matched.slice(0, 4).join(", ")}`
    );
  }
  if (domainSimilarity >= 0.08) {
    reasons.push(`Your ${cleanString(user.working_area || user.program || "background", 40)} background overlaps with the role description`);
  }
  if (contextBits.length) {
    reasons.push(contextBits.slice(0, 3).join(" · "));
  }
  if (!reasons.length) {
    reasons.push("Ranked from your profile skills and the role description");
  }

  const gaps = missing.slice(0, 4);
  return {
    id: String(job._id),
    title: job.Job_name || "Untitled opportunity",
    poster: {
      id: job.userID ? String(job.userID) : "",
      name: job.created_by_user || poster?.name || "IIITA member",
      role: poster?.role || "",
    },
    type: jobType,
    description: cleanString(job.Description, 700),
    location: cleanString(job.location, 80),
    workMode: cleanString(job.work_mode, 40),
    deadline: job.Job_deadline || null,
    postedAt: job.Job_post_date || null,
    applyLink: job.Link || "",
    requirements,
    matchedSkills: matched.slice(0, 6),
    missingSkills: missing.slice(0, 5),
    score,
    verdict: internshipVerdict(score),
    summary: internshipSummary({
      matched,
      missing,
      jobType,
      domain: cleanString(user.working_area, 40),
    }),
    reasons,
    gaps,
    breakdown: {
      skills: Math.round(skillCoverage * 100),
      domain: Math.round(domainSimilarity * 100),
      context: Math.min(100, 35 + contextBits.length * 16),
    },
    deadlineDays,
  };
}

function rankInternships(user, jobs, { posters = {}, limit = 12, type = "", mode = "" } = {}) {
  const typeFilter = normalize(type);
  const modeFilter = normalize(mode);

  return jobs
    .map((job) => {
      const jobType = inferJobType(job);
      if (typeFilter && typeFilter !== "all" && normalize(jobType) !== typeFilter) return null;
      if (modeFilter && modeFilter !== "all" && normalize(job.work_mode) !== modeFilter) return null;

      const deadlineDays = daysUntil(job.Job_deadline);
      if (deadlineDays !== null && deadlineDays < 0) return null;
      if (job.is_active === false) return null;

      return matchInternship(user, job, posters[String(job.userID)] || null);
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || (a.deadlineDays ?? 999) - (b.deadlineDays ?? 999))
    .slice(0, limit)
    .map((match, index) => ({ ...match, rank: index + 1 }));
}

function inferGoals(user) {
  const explicit = toArray(user?.mentee_goals);
  if (explicit.length) return explicit;
  return ["Career"];
}

function inferAreas(person) {
  const explicit = toArray(person?.mentorship?.areas).filter((area) =>
    MENTORSHIP_AREAS.includes(area)
  );
  if (explicit.length) return explicit;

  const text = normalize(
    `${person?.working_area || ""} ${person?.designation || ""} ${person?.bio || ""} ${(person?.skills || []).join(" ")}`
  );
  const areas = MENTORSHIP_AREAS.filter((area) =>
    (AREA_KEYWORDS[area] || []).some((keyword) => hasPhrase(text, keyword))
  );
  if (!areas.length) areas.push("Career");
  return areas;
}

function areaAlignment(user, person, goal) {
  const areas = inferAreas(person);
  const personText = normalize(
    `${person?.working_area || ""} ${person?.designation || ""} ${person?.bio || ""} ${(person?.skills || []).join(" ")}`
  );
  const keywords = AREA_KEYWORDS[goal] || [];
  const keywordHit = keywords.some((keyword) => hasPhrase(personText, keyword));
  if (areas.includes(goal)) return { score: 25, areas, keywordHit };
  if (keywordHit) return { score: 16, areas, keywordHit };
  return { score: 5, areas, keywordHit };
}

function sameBackground(user, person) {
  const userProgram = normalize(user?.program);
  const personProgram = normalize(person?.program);
  const userDepartment = normalize(user?.department);
  const personDepartment = normalize(person?.department);
  if (userProgram && personProgram && userProgram === personProgram) return true;
  if (userDepartment && personDepartment && userDepartment === personDepartment) return true;
  return false;
}

function historyFor(candidateId, requests, userId) {
  const received = requests.filter((request) => String(request.requestedTo) === candidateId);
  const fromUser = requests.find(
    (request) =>
      String(request.requestedBy) === String(userId) &&
      String(request.requestedTo) === candidateId &&
      ["pending", "accepted", "active"].includes(request.status)
  );
  const accepted = received.filter((request) =>
    ["accepted", "active", "completed"].includes(request.status)
  ).length;
  const active = received.filter((request) =>
    ["accepted", "active"].includes(request.status)
  ).length;
  return {
    existingRequest: fromUser || null,
    received: received.length,
    accepted,
    active,
    acceptanceRate: received.length ? accepted / received.length : 0.5,
  };
}

function mentorVerdict(score) {
  if (score >= 82) return "Excellent match";
  if (score >= 68) return "Strong match";
  if (score >= 52) return "Good match";
  return "Explore";
}

function suggestedMessage(user, person, goal) {
  const firstName = String(person?.name || "there").split(" ")[0];
  const focus = cleanString(
    person?.working_area || (person?.skills || [])[0] || "your work",
    60
  );
  const program = cleanString(user?.program, 40);
  const intro = program ? `I'm a student in ${program}` : "I'm an IIITA student";
  return `Hi ${firstName}, ${intro} exploring ${goal.toLowerCase()}. I'd value a short conversation about your path in ${focus}. Is there a 20-minute slot in the next two weeks?`;
}

function matchMentor(user, person, { goal, requests }) {
  const mentorship = person?.mentorship || {};
  // Mentoring is opt-in. A legacy or new account without an explicit
  // `available: true` should not be recommended or requestable.
  const available = mentorship.available === true;
  if (!available) return null;

  const capacity = Number.isFinite(Number(mentorship.capacity))
    ? Math.max(0, Math.floor(Number(mentorship.capacity)))
    : 3;
  const history = historyFor(String(person._id), requests, user?._id);
  if (history.active >= capacity) return null;
  if (history.existingRequest) return null;

  const alignment = areaAlignment(user, person, goal);
  const userSkills = profileSkills(user);
  const mentorSkills = uniqueSkills([...(person?.skills || []), person?.working_area]);
  const matchingSkills = userSkills.filter((skill) =>
    mentorSkills.some((mentorSkill) => skillsMatch(skill, mentorSkill))
  );
  const skillScore = userSkills.length
    ? Math.min(1, matchingSkills.length / Math.min(3, userSkills.length))
    : 0;
  const domainSimilarity = textSimilarity(profileText(user), profileText(person));
  const background = sameBackground(user, person);
  const slots = Math.max(0, capacity - history.active);

  let score =
    30 +
    alignment.score +
    skillScore * 20 +
    domainSimilarity * 15 +
    (background ? 5 : 0) +
    (slots > 0 ? 5 : 0) +
    history.acceptanceRate * 5;
  score = clampScore(score);

  const reasons = [];
  if (alignment.areas.length) {
    reasons.push(`Mentors in ${alignment.areas.slice(0, 2).join(" and ")}`);
  }
  if (matchingSkills.length) {
    reasons.push(
      `${matchingSkills.length} shared skill${matchingSkills.length === 1 ? "" : "s"}: ${matchingSkills
        .slice(0, 4)
        .join(", ")}`
    );
  }
  if (person?.organisation || person?.working_area) {
    reasons.push(
      `${cleanString(person.working_area || person.designation || "Industry", 50)}${
        person.organisation ? ` at ${cleanString(person.organisation, 50)}` : ""
      }`
    );
  }
  if (background) reasons.push("Shares your academic background");
  reasons.push(`${slots} mentoring slot${slots === 1 ? "" : "s"} open`);
  if (history.received >= 2) {
    reasons.push(`${Math.round(history.acceptanceRate * 100)}% request acceptance`);
  }

  return {
    id: String(person._id),
    name: person.name,
    avatar: person.avatar || "",
    role: person.role,
    designation: cleanString(person.designation, 70),
    organisation: cleanString(person.organisation, 70),
    location: cleanString(person.location, 70),
    workingArea: cleanString(person.working_area, 60),
    skills: mentorSkills.slice(0, 8),
    matchingSkills: matchingSkills.slice(0, 6),
    areas: alignment.areas,
    capacity,
    activeMentees: history.active,
    slots,
    available,
    score,
    verdict: mentorVerdict(score),
    summary: `${cleanString(person.name, 50)} mentors ${alignment.areas
      .slice(0, 2)
      .join(" and ")} and works in ${cleanString(
      person.working_area || person.designation || "industry",
      50
    )}.`,
    reasons,
    suggestedMessage: suggestedMessage(user, person, goal),
  };
}

function rankMentors(user, people, { area = "", requests = [], limit = 8 } = {}) {
  const selectedGoal = MENTORSHIP_AREAS.includes(area)
    ? area
    : inferGoals(user).find((goal) => MENTORSHIP_AREAS.includes(goal)) || "Career";

  return people
    .filter((person) => ["alumni", "faculty"].includes(normalize(person.role)))
    .filter((person) => String(person._id) !== String(user?._id))
    .filter((person) => !person.blocked)
    .map((person) => matchMentor(user, person, { goal: selectedGoal, requests }))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((match, index) => ({ ...match, rank: index + 1, goal: selectedGoal }));
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

async function getInternshipMatches(user, options = {}) {
  const { limit = 6, type = "", mode = "" } = options;
  const boundedLimit = Math.max(1, Math.min(12, Number(limit) || 6));

  const jobs = await Job.find({}).lean();
  const posterIds = [...new Set(jobs.map((job) => job.userID).filter(Boolean))];
  let posters = [];
  if (posterIds.length) {
    posters = await User.find({ _id: { $in: posterIds } })
      .select("name role")
      .lean();
  }
  const posterById = Object.fromEntries(posters.map((poster) => [String(poster._id), poster]));

  const ranked = rankInternships(user, jobs, {
    posters: posterById,
    limit: 12,
    type,
    mode,
  });
  const finalMatches = ranked.slice(0, boundedLimit);
  const payload = {
    matches: finalMatches,
    total: ranked.length,
    summary: `${ranked.length} open ${
      ranked.length === 1 ? "opportunity" : "opportunities"
    } ranked from your skills, goals and preferences.`,
    profile: {
      name: user.name,
      role: user.role,
      program: user.program,
      workingArea: user.working_area || "",
      skills: profileSkills(user).slice(0, 8),
      goals: inferGoals(user),
      preferences: user.internship_preferences || {},
    },
  };

  return {
    ...payload,
    model: "algorithm",
    generatedAt: new Date(),
    cached: false,
  };
}

async function getMentorMatches(user, options = {}) {
  const { limit = 8, area = "" } = options;
  const boundedLimit = Math.max(1, Math.min(12, Number(limit) || 8));

  const people = await User.find({
    // Role values are stored lowercase today, but match case-insensitively so a
    // manually edited account is not silently dropped.
    role: { $in: [/^alumni$/i, /^faculty$/i] },
    _id: { $ne: user._id },
  })
    .select(
      "name avatar role program department passing_year designation organisation location working_area skills bio blocked mentorship"
    )
    .lean();

  const requests = await MentorShipRequest.find({
    $or: [
      { requestedTo: { $in: people.map((person) => person._id) } },
      { requestedBy: user._id },
    ],
  })
    .select("requestedBy requestedTo status")
    .lean();

  const ranked = rankMentors(user, people, { area, requests, limit: 12 });
  const finalMatches = ranked.slice(0, boundedLimit);
  const payload = {
    matches: finalMatches,
    total: ranked.length,
    goal: finalMatches[0]?.goal || (MENTORSHIP_AREAS.includes(area) ? area : inferGoals(user)[0]),
    goals: inferGoals(user),
    summary: `${ranked.length} available ${
      ranked.length === 1 ? "mentor" : "mentors"
    } ranked by goal, skills and availability.`,
    profile: {
      name: user.name,
      role: user.role,
      program: user.program,
      skills: profileSkills(user).slice(0, 8),
      goals: inferGoals(user),
    },
  };

  return {
    ...payload,
    model: "algorithm",
    generatedAt: new Date(),
    cached: false,
  };
}

module.exports = {
  MENTORSHIP_AREAS,
  getInternshipMatches,
  getMentorMatches,
  // Exported for focused tests and future reuse.
  rankInternships,
  rankMentors,
  matchInternship,
  isEligible,
  extractSkillsFromText,
  requirementsFor,
  skillsMatch,
  textSimilarity,
};
