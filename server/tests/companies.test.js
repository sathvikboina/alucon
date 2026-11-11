process.env.NODE_ENV = "test";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Company = require("../models/Company");
const Job = require("../models/Jobs");
const User = require("../models/User");
const Door = require("../models/Door");
const {
  normalizeCompany,
  slugifyCompany,
  resolveCompany,
  ensureCompany,
  companySlugMap,
  jobIsVisible,
  buildCompanyHub,
} = require("../services/companies");

function mongoParts(raw) {
  const match = String(raw).match(
    /^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/[^?]*)?(\?.*)?$/
  );
  if (!match) return { base: raw, query: "" };
  return { base: match[1], query: match[2] ? match[2].slice(1) : "" };
}

function buildTestUri() {
  const raw =
    process.env.TEST_MONGO_URI ||
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017";
  const { base, query } = mongoParts(raw);
  const dbName = `alumniconnect_companies_test_${process.pid}_${Date.now()}`;
  return `${base}/${dbName}${query ? `?${query}` : ""}`;
}

const days = (count) => new Date(Date.now() + count * 24 * 60 * 60 * 1000);

let company;

before(async () => {
  await mongoose.connect(buildTestUri(), { serverSelectionTimeoutMS: 10000 });
  await Company.init();
  await Job.init();

  company = await Company.create({
    name: "Nimbus Labs",
    slug: "nimbus-labs",
    aliases: ["Nimbus", "Nimbus Labs India"],
  });
});

beforeEach(async () => {
  await Job.deleteMany({});
  await Door.deleteMany({});
  await Company.deleteMany({ slug: { $ne: "nimbus-labs" } });
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test("normalizeCompany lowercases, strips punctuation and suffixes", () => {
  assert.equal(normalizeCompany("Nimbus Labs Pvt. Ltd."), "nimbus labs");
  assert.equal(normalizeCompany("Google India"), "google");
  assert.equal(normalizeCompany("Arclight Systems, Inc."), "arclight systems");
  assert.equal(normalizeCompany("  VISION   systems  "), "vision systems");
  assert.equal(normalizeCompany("Acme & Co."), "acme and co");
  assert.equal(slugifyCompany("Nimbus Labs Pvt. Ltd."), "nimbus-labs");
  assert.equal(normalizeCompany(""), "");
});

test("aliases resolve to one company and ensureCompany is idempotent", async () => {
  const bySuffix = await resolveCompany("Nimbus Labs Pvt. Ltd.");
  const byAlias = await resolveCompany("Nimbus Labs India");
  const byShortAlias = await resolveCompany("Nimbus");
  assert.equal(String(bySuffix._id), String(company._id));
  assert.equal(String(byAlias._id), String(company._id));
  assert.equal(String(byShortAlias._id), String(company._id));

  const ensured = await ensureCompany("Nimbus Labs Pvt. Ltd.");
  assert.equal(String(ensured._id), String(company._id));
  assert.equal(await Company.countDocuments({ slug: "nimbus-labs" }), 1);

  const created = await ensureCompany("Arclight Systems Inc.");
  assert.equal(created.slug, "arclight-systems");
  const again = await ensureCompany("Arclight Systems");
  assert.equal(String(created._id), String(again._id));
  assert.equal(await Company.countDocuments({ slug: "arclight-systems" }), 1);
});

test("slug map links known aliases and still returns a deterministic slug", async () => {
  const map = await companySlugMap([
    "Nimbus Labs Pvt. Ltd.",
    "Nimbus Labs India",
    "Unknown Works Pvt. Ltd.",
  ]);
  assert.equal(map.get("Nimbus Labs Pvt. Ltd."), "nimbus-labs");
  assert.equal(map.get("Nimbus Labs India"), "nimbus-labs");
  assert.equal(map.get("Unknown Works Pvt. Ltd."), "unknown-works");
});

test("signals hide after expiry while jobs follow the deadline", () => {
  const now = Date.now();
  assert.equal(
    jobIsVisible({ kind: "signal", expiresAt: days(1), is_active: true }, now),
    true
  );
  assert.equal(
    jobIsVisible({ kind: "signal", expiresAt: days(-1), is_active: true }, now),
    false
  );
  assert.equal(
    jobIsVisible({ kind: "signal", is_active: true }, now),
    false
  );
  assert.equal(
    jobIsVisible({ Job_deadline: days(1), is_active: true }, now),
    true
  );
  assert.equal(
    jobIsVisible({ Job_deadline: days(-1), is_active: true }, now),
    false
  );
});

test("hub resolves jobs and alumni at read time and hides expired signals", async () => {
  const currentAlum = await User.create({
    name: "Nimbus Current",
    email: `company-current-${process.pid}@test.local`,
    password: "not-used",
    role: "alumni",
    organisation: "Nimbus Labs Pvt. Ltd.",
    designation: "ML Engineer",
    skills: ["Python"],
  });
  const pastAlum = await User.create({
    name: "Nimbus Past",
    email: `company-past-${process.pid}@test.local`,
    password: "not-used",
    role: "alumni",
    organisation: "Arclight Systems",
    designation: "Backend Engineer",
    experience: [
      {
        title: "ML Intern",
        company: "Nimbus Labs Inc.",
        from: days(-900),
        to: days(-500),
        current: false,
      },
    ],
  });
  const outsider = await User.create({
    name: "Other Alum",
    email: `company-other-${process.pid}@test.local`,
    password: "not-used",
    role: "alumni",
    organisation: "Vision Systems Lab",
  });

  const viewer = await User.create({
    name: "Company Viewer",
    email: `company-viewer-${process.pid}@test.local`,
    password: "not-used",
    role: "student",
    program: "B.Tech IT",
    skills: ["Python", "Machine Learning"],
  });

  // A new job stores the company name; a legacy job has none and must fall
  // back to the poster's organisation without rewriting either document.
  await Job.create({
    created_by_user: "Nimbus Current",
    userID: String(currentAlum._id),
    Job_name: "Applied ML Intern",
    Description: "Work on Python evaluation pipelines.",
    Job_post_date: days(-1),
    Job_deadline: days(10),
    skills: ["Python", "Machine Learning"],
    companyName: "Nimbus Labs",
    is_active: true,
  });
  await Job.create({
    created_by_user: "Nimbus Current",
    userID: String(currentAlum._id),
    Job_name: "Legacy Backend Role",
    Description: "Legacy row with no companyName.",
    Job_post_date: days(-2),
    Job_deadline: days(12),
    skills: ["SQL"],
    is_active: true,
  });
  await Job.create({
    created_by_user: "Nimbus Current",
    userID: String(currentAlum._id),
    Job_name: "Spring internship signal",
    Description: "Hiring window opens next month.",
    Job_post_date: days(-1),
    kind: "signal",
    expectedWindow: "Spring 2027",
    expiresAt: days(20),
    companyName: "Nimbus Labs",
    is_active: true,
  });
  await Job.create({
    created_by_user: "Nimbus Current",
    userID: String(currentAlum._id),
    Job_name: "Expired signal",
    Description: "This should never appear.",
    Job_post_date: days(-30),
    kind: "signal",
    expectedWindow: "Winter 2026",
    expiresAt: days(-2),
    companyName: "Nimbus Labs",
    is_active: true,
  });

  await Door.create({
    owner: currentAlum._id,
    type: "chat15",
    title: "Nimbus ML chat",
    topics: ["Machine Learning"],
    monthlyCap: 2,
    active: true,
  });
  await Door.create({
    owner: currentAlum._id,
    type: "resume_review",
    title: "Inactive Nimbus door",
    topics: ["Resume"],
    monthlyCap: 2,
    active: false,
  });

  const hub = await buildCompanyHub(company, { viewer });

  assert.equal(hub.company.slug, "nimbus-labs");
  assert.equal(hub.model, "algorithm");
  assert.deepEqual(
    hub.jobs.map((job) => job.title).sort(),
    ["Applied ML Intern", "Legacy Backend Role"]
  );
  assert.deepEqual(
    hub.signals.map((signal) => signal.title),
    ["Spring internship signal"]
  );
  assert.equal(hub.signals[0].expectedWindow, "Spring 2027");

  const applied = hub.jobs.find((job) => job.title === "Applied ML Intern");
  assert.equal(applied.score !== null, true);
  assert.equal(applied.model, "algorithm");
  assert.ok(applied.matchedSkills.includes("Python"));

  assert.deepEqual(
    hub.alumni.current.map((person) => person.name),
    ["Nimbus Current"]
  );
  assert.deepEqual(
    hub.alumni.past.map((person) => person.name),
    ["Nimbus Past"]
  );
  assert.equal(hub.alumni.current[0].companySlug, "nimbus-labs");
  assert.equal(hub.alumni.past[0].companySlug, "nimbus-labs");

  assert.deepEqual(
    hub.doors.map((door) => door.title),
    ["Nimbus ML chat"]
  );
  assert.equal(hub.counts.jobs, 2);
  assert.equal(hub.counts.signals, 1);
  assert.equal(hub.counts.currentAlumni, 1);
  assert.equal(hub.counts.pastAlumni, 1);
  assert.equal(hub.counts.doors, 1);

  // Deterministic assembly: a second call has the same shape and order.
  const again = await buildCompanyHub(company, { viewer });
  assert.deepEqual(again.jobs.map((job) => job.id), hub.jobs.map((job) => job.id));
  assert.deepEqual(
    again.alumni.past.map((person) => person.id),
    hub.alumni.past.map((person) => person.id)
  );

  await User.deleteMany({
    _id: { $in: [currentAlum._id, pastAlum._id, outsider._id, viewer._id] },
  });
});
