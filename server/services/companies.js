// Company hubs.
//
// `normalizeCompany` is the single definition of "same company": lowercase,
// punctuation removed, common legal suffixes dropped, then alias lookup. Jobs
// and profiles are never rewritten. A hub is assembled at read time from the
// company record plus whatever the existing documents already say.
//
// Matching reuses the internship engine for matched/missing skills; there is no
// new score and no model ranking here.

const Company = require("../models/Company");
const Job = require("../models/Jobs");
const User = require("../models/User");
const Door = require("../models/Door");
const { requirementsFor, matchInternship } = require("./matching");

const COMPANY_SUFFIXES = new Set([
  "pvt",
  "ltd",
  "inc",
  "india",
  "private",
  "limited",
]);

const MODEL_LABEL = "algorithm";

function normalizeCompany(value) {
  const text = String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!text) return "";

  const tokens = text.split(/\s+/).filter(Boolean);
  const kept = tokens.filter((token) => !COMPANY_SUFFIXES.has(token));
  // A name made entirely of suffixes is still more useful than an empty key.
  return (kept.length ? kept : tokens).join(" ");
}

function slugifyCompany(value) {
  const normalized = normalizeCompany(value);
  return normalized ? normalized.replace(/\s+/g, "-") : "";
}

function companyIndex(companies) {
  const index = new Map();
  for (const company of companies || []) {
    index.set(normalizeCompany(company.name), company.slug);
    for (const alias of company.aliases || []) {
      index.set(normalizeCompany(alias), company.slug);
    }
  }
  return index;
}

function companyMatches(name, company) {
  const normalized = normalizeCompany(name);
  if (!normalized || !company) return false;
  if (normalizeCompany(company.name) === normalized) return true;
  return (company.aliases || []).some(
    (alias) => normalizeCompany(alias) === normalized
  );
}

async function resolveCompany(name) {
  const normalized = normalizeCompany(name);
  if (!normalized) return null;

  const slug = slugifyCompany(name);
  if (slug) {
    const exact = await Company.findOne({ slug }).lean();
    if (exact) return exact;
  }

  const companies = await Company.find().lean();
  return (
    companies.find(
      (company) =>
        normalizeCompany(company.name) === normalized ||
        (company.aliases || []).some(
          (alias) => normalizeCompany(alias) === normalized
        )
    ) || null
  );
}

async function ensureCompany(name) {
  const display = String(name || "").replace(/\s+/g, " ").trim();
  if (!display) return null;

  const existing = await resolveCompany(display);
  if (existing) return existing;

  const slug = slugifyCompany(display);
  if (!slug) return null;

  try {
    return await Company.create({ name: display, slug, aliases: [] });
  } catch (err) {
    if (err && err.code === 11000) {
      return Company.findOne({ slug }).lean();
    }
    throw err;
  }
}

// Maps display names to the hub slug to link to. Unknown names still get a
// deterministic slug so a card can always point somewhere instead of nowhere.
async function companySlugMap(names) {
  const unique = [...new Set((names || []).filter(Boolean))];
  const result = new Map();
  if (!unique.length) return result;

  let index = new Map();
  try {
    index = companyIndex(await Company.find().lean());
  } catch (err) {
    console.warn("[companies] slug lookup failed:", err.message);
  }

  for (const name of unique) {
    result.set(name, index.get(normalizeCompany(name)) || slugifyCompany(name));
  }
  return result;
}

function jobCompanyName(job, poster) {
  return String(job?.companyName || poster?.organisation || "").trim();
}

function jobIsVisible(job, now = Date.now()) {
  if (job?.is_active === false) return false;
  if (job?.kind === "signal") {
    return Boolean(job.expiresAt) && new Date(job.expiresAt).getTime() >= now;
  }
  if (!job?.Job_deadline) return true;
  return new Date(job.Job_deadline).getTime() >= now;
}

function serializeJob(job, poster, viewer) {
  const requirements = requirementsFor(job);
  let fit = null;
  if (viewer) {
    try {
      fit = matchInternship(viewer, job, poster);
    } catch (err) {
      fit = null;
    }
  }

  return {
    id: String(job._id),
    title: job.Job_name || "Untitled opportunity",
    description: job.Description || "",
    type: job.job_type || "",
    location: job.location || "",
    workMode: job.work_mode || "",
    deadline: job.Job_deadline || null,
    postedAt: job.Job_post_date || null,
    applyLink: job.Link || "",
    companyName: jobCompanyName(job, poster),
    kind: job.kind === "signal" ? "signal" : "job",
    expectedWindow: job.expectedWindow || "",
    expiresAt: job.expiresAt || null,
    poster: {
      id: job.userID ? String(job.userID) : "",
      name: job.created_by_user || poster?.name || "IIITA member",
      role: poster?.role || "",
    },
    requirements,
    matchedSkills: fit?.matchedSkills || [],
    missingSkills: fit?.missingSkills || [],
    score: fit?.score ?? null,
    verdict: fit?.verdict || "",
    model: MODEL_LABEL,
  };
}

function personSummary(user) {
  return {
    id: String(user._id),
    name: user.name || "IIITA alumnus",
    avatar: user.avatar || "",
    designation: user.designation || "",
    organisation: user.organisation || "",
    location: user.location || "",
    passing_year: user.passing_year || "",
    working_area: user.working_area || "",
    program: user.program || "",
  };
}

function serializeDoor(door) {
  const owner = door.owner || {};
  return {
    id: String(door._id),
    type: door.type,
    title: door.title,
    topics: door.topics || [],
    monthlyCap: door.monthlyCap,
    owner: {
      id: owner._id ? String(owner._id) : "",
      name: owner.name || "IIITA alumnus",
      avatar: owner.avatar || "",
      designation: owner.designation || "",
      organisation: owner.organisation || "",
    },
  };
}

// Pure-ish assembly: every input is passed in, so the ordering is testable and
// the same data always produces the same hub.
async function buildCompanyHub(company, { viewer = null, now = Date.now() } = {}) {
  if (!company) return null;

  const [jobs, alumni, companies] = await Promise.all([
    Job.find().lean(),
    User.find({ role: /^alumni$/i })
      .select(
        "name avatar role program passing_year designation organisation location working_area skills bio experience mentorship internship_preferences"
      )
      .lean(),
    Company.find().lean(),
  ]);

  const posterIds = [...new Set(jobs.map((job) => job.userID).filter(Boolean))];
  const posters = posterIds.length
    ? await User.find({ _id: { $in: posterIds } })
        .select("name role organisation")
        .lean()
    : [];
  const posterById = Object.fromEntries(
    posters.map((poster) => [String(poster._id), poster])
  );

  const slugIndex = companyIndex(companies);
  const slugForName = (name) =>
    slugIndex.get(normalizeCompany(name)) || slugifyCompany(name);
  const jobSlug = (job) =>
    slugForName(jobCompanyName(job, posterById[String(job.userID)]));

  const hubJobs = [];
  const signals = [];
  for (const job of jobs) {
    if (!companyMatches(jobCompanyName(job, posterById[String(job.userID)]), company)) {
      continue;
    }
    if (!jobIsVisible(job, now)) continue;
    const payload = serializeJob(job, posterById[String(job.userID)], viewer);
    if (payload.kind === "signal") signals.push(payload);
    else hubJobs.push(payload);
  }

  hubJobs.sort(
    (a, b) =>
      new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime() ||
      a.id.localeCompare(b.id)
  );
  signals.sort(
    (a, b) =>
      new Date(a.expiresAt || 0).getTime() - new Date(b.expiresAt || 0).getTime() ||
      a.id.localeCompare(b.id)
  );

  const current = [];
  const past = [];
  const alumniIds = new Set();
  for (const person of alumni) {
    const isCurrent = companyMatches(person.organisation, company);
    const history = (person.experience || []).filter((entry) =>
      companyMatches(entry.company, company)
    );
    if (!isCurrent && !history.length) continue;

    alumniIds.add(String(person._id));
    const summary = {
      ...personSummary(person),
      companySlug: slugForName(person.organisation),
    };
    if (isCurrent) current.push(summary);

    if (history.length) {
      for (const entry of history) {
        if (
          isCurrent &&
          normalizeCompany(entry.company) === normalizeCompany(person.organisation)
        ) {
          continue;
        }
        past.push({
          ...summary,
          role: entry.title || "",
          from: entry.from || null,
          to: entry.to || null,
          currentRole: Boolean(entry.current),
          companySlug: slugForName(entry.company),
        });
      }
    }
  }
  current.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  past.sort(
    (a, b) =>
      a.name.localeCompare(b.name) ||
      String(a.role).localeCompare(String(b.role)) ||
      a.id.localeCompare(b.id)
  );

  const doors = alumniIds.size
    ? await Door.find({ active: true, owner: { $in: [...alumniIds] } })
        .populate("owner", "name avatar designation organisation")
        .sort({ createdAt: -1 })
        .lean()
    : [];
  const hubDoors = doors
    .map(serializeDoor)
    .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));

  return {
    company: {
      name: company.name,
      slug: company.slug,
      aliases: company.aliases || [],
    },
    model: MODEL_LABEL,
    jobs: hubJobs,
    signals,
    alumni: { current, past },
    doors: hubDoors,
    counts: {
      jobs: hubJobs.length,
      signals: signals.length,
      currentAlumni: current.length,
      pastAlumni: past.length,
      doors: hubDoors.length,
    },
  };
}

async function getCompanyHub(slug, options = {}) {
  const key = String(slug || "").trim();
  if (!key) return null;
  const company = await Company.findOne({ slug: key }).lean();
  if (!company) {
    const resolved = await resolveCompany(key.replace(/-/g, " "));
    if (!resolved) return null;
    return buildCompanyHub(resolved, options);
  }
  return buildCompanyHub(company, options);
}

module.exports = {
  COMPANY_SUFFIXES,
  MODEL_LABEL,
  normalizeCompany,
  slugifyCompany,
  companyIndex,
  companyMatches,
  resolveCompany,
  ensureCompany,
  companySlugMap,
  jobCompanyName,
  jobIsVisible,
  buildCompanyHub,
  getCompanyHub,
};
