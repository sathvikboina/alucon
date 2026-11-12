process.env.NODE_ENV = "test";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Door = require("../models/Door");
const DoorRequest = require("../models/DoorRequest");
const User = require("../models/User");
const {
  MAX_DOOR_MESSAGE,
  MIN_PROFILE_TEXT,
  AssistError,
  fallbackDoorMessage,
  fallbackProfileFields,
  normalizeDoorDraft,
  normalizeProfileFields,
  countFields,
  draftDoorRequest,
  importProfileText,
} = require("../services/aiAssist");

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
  const dbName = `alumniconnect_aiassist_test_${process.pid}_${Date.now()}`;
  return `${base}/${dbName}${query ? `?${query}` : ""}`;
}

let owner;
let student;

async function makeDoor(overrides = {}) {
  return Door.create({
    owner: owner._id,
    type: "chat15",
    title: "15 minutes on production ML",
    topics: ["Machine Learning", "Careers"],
    monthlyCap: 2,
    active: true,
    ...overrides,
  });
}

before(async () => {
  await mongoose.connect(buildTestUri(), { serverSelectionTimeoutMS: 10000 });
  await Door.init();
  await DoorRequest.init();

  owner = await User.create({
    name: "Asha Menon",
    email: `aiassist-owner-${process.pid}@test.local`,
    password: "not-used",
    role: "alumni",
    designation: "ML Engineer",
    organisation: "Nimbus Labs",
  });
  student = await User.create({
    name: "Ravi Kumar",
    email: `aiassist-student-${process.pid}@test.local`,
    password: "not-used",
    role: "student",
    program: "B.Tech IT",
    passing_year: "2026",
    skills: ["Python"],
    mentee_goals: ["Get an ML internship"],
  });
});

beforeEach(async () => {
  await DoorRequest.deleteMany({});
  await Door.deleteMany({});
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

const offlineGenerate = async () => null;

test("door draft falls back offline, never sends, and creates no request", async () => {
  const door = await makeDoor();
  const result = await draftDoorRequest(
    {
      doorId: door._id,
      requester: student.toObject(),
      hint: "I am preparing for an ML internship.",
    },
    { generate: offlineGenerate }
  );

  assert.equal(result.fallback, true);
  assert.equal(result.model, "offline");
  assert.equal(result.autoSent, false);
  assert.equal(result.door.id, String(door._id));
  assert.match(result.message, /^Hi Asha,/);
  assert.match(result.message, /production ML/);
  assert.match(result.message, /ML internship/);
  assert.ok(result.message.length <= MAX_DOOR_MESSAGE);
  assert.equal(await DoorRequest.countDocuments({}), 0);
});

test("door draft uses model text only when it is long enough and trims it", async () => {
  const door = await makeDoor();
  const generate = async () => ({
    model: "gemini-test",
    data: {
      message:
        "  Hi Asha,\n\nI would like to request a short chat about production ML because I am preparing for internships. Thank you for considering it.  ",
      extra: "ignored",
    },
  });

  const result = await draftDoorRequest(
    { doorId: door._id, requester: student.toObject() },
    { generate }
  );

  assert.equal(result.fallback, false);
  assert.equal(result.model, "gemini-test");
  assert.equal(result.autoSent, false);
  assert.equal(result.message.includes("\n"), false);
  assert.equal(result.message.startsWith("Hi Asha,"), true);

  const short = normalizeDoorDraft(
    { message: "Too short" },
    { ...door.toObject(), owner: { name: "Asha Menon" } },
    student.toObject(),
    ""
  );
  assert.equal(short.valid, false);
  assert.match(short.message, /^Hi Asha,/);
  assert.equal(await DoorRequest.countDocuments({}), 0);
});

test("door draft enforces student, active-door and not-own-door rules", async () => {
  const door = await makeDoor();

  await assert.rejects(
    draftDoorRequest(
      { doorId: door._id, requester: owner.toObject() },
      { generate: offlineGenerate }
    ),
    (err) => err instanceof AssistError && err.status === 403
  );

  const ownDoor = await makeDoor({
    owner: student._id,
    title: "Student's own door",
  });
  await assert.rejects(
    draftDoorRequest(
      { doorId: ownDoor._id, requester: student.toObject() },
      { generate: offlineGenerate }
    ),
    (err) => err instanceof AssistError && err.status === 400
  );

  const inactive = await makeDoor({ active: false, title: "Inactive door" });
  await assert.rejects(
    draftDoorRequest(
      { doorId: inactive._id, requester: student.toObject() },
      { generate: offlineGenerate }
    ),
    (err) => err instanceof AssistError && err.status === 404
  );

  await assert.rejects(
    draftDoorRequest(
      { doorId: new mongoose.Types.ObjectId(), requester: student.toObject() },
      { generate: offlineGenerate }
    ),
    (err) => err instanceof AssistError && err.status === 404
  );

  assert.equal(await DoorRequest.countDocuments({}), 0);
});

function cvText() {
  return [
    "Ravi Kumar",
    "Location: Bengaluru, India",
    "https://www.linkedin.com/in/ravi-kumar",
    "",
    "About:",
    "Final-year IT student focused on machine learning and backend systems.",
    "",
    "Skills:",
    "Python, PyTorch, Node.js, MongoDB",
    "",
    "Experience:",
    "ML Intern at Nimbus Labs",
    "",
    "This text is deliberately long enough to pass the minimum length check.",
  ].join("\n");
}

test("profile import falls back to deterministic extraction and never stores text", async () => {
  const result = await importProfileText(
    { profileText: cvText() },
    { generate: offlineGenerate }
  );

  assert.equal(result.fallback, true);
  assert.equal(result.model, "offline");
  assert.equal(result.stored, false);
  assert.ok(result.fieldCount >= 3);
  assert.equal(result.fields.location, "Bengaluru, India");
  assert.equal(result.fields.social.linkedin, "https://www.linkedin.com/in/ravi-kumar");
  assert.equal(result.fields.organisation, "Nimbus Labs");
  assert.equal(result.fields.status, "ML Intern");
  assert.ok(result.fields.skills.includes("PyTorch"));
  assert.match(result.fields.bio, /machine learning/i);
  assert.equal(JSON.stringify(result).includes("deliberately long enough"), false);
});

test("profile import keeps only whitelisted model fields and labels the model", async () => {
  const generate = async () => ({
    model: "gemini-test",
    data: {
      bio: "Backend engineer.",
      skills: ["Node.js", "MongoDB", ""],
      location: "Pune",
      organisation: "Acme",
      status: "Developer",
      website: "https://ravi.dev",
      githubusername: "ravi",
      mentee_goals: ["Find a mentor"],
      internship_types: ["Internship"],
      internship_work_modes: ["Remote"],
      internship_locations: ["Bengaluru"],
      social: { linkedin: "https://linkedin.com/in/ravi", evil: "drop me" },
      evilTopLevel: "drop me too",
      password: "never-copy-this",
    },
  });

  const result = await importProfileText(
    { profileText: cvText() },
    { generate }
  );

  assert.equal(result.fallback, false);
  assert.equal(result.model, "gemini-test");
  assert.equal(result.stored, false);
  assert.equal(result.fields.social.evil, undefined);
  assert.equal(result.fields.evilTopLevel, undefined);
  assert.equal(result.fields.password, undefined);
  assert.deepEqual(result.fields.skills, ["Node.js", "MongoDB"]);
  assert.equal(countFields(result.fields), 12);
});

test("profile import rejects short and oversized pastes with a 400", async () => {
  await assert.rejects(
    importProfileText(
      { profileText: "too short" },
      { generate: offlineGenerate }
    ),
    (err) =>
      err instanceof AssistError &&
      err.status === 400 &&
      err.message.includes(String(MIN_PROFILE_TEXT))
  );

  await assert.rejects(
    importProfileText(
      { profileText: "x".repeat(12001) },
      { generate: offlineGenerate }
    ),
    (err) => err instanceof AssistError && err.status === 400
  );
});

test("fallback helpers are deterministic and respect length caps", () => {
  const door = {
    title: "Resume review",
    topics: ["Placements"],
    owner: { name: "Asha Menon" },
  };
  const requester = { name: "Ravi Kumar", program: "B.Tech IT" };
  const first = fallbackDoorMessage(door, requester, "");
  const second = fallbackDoorMessage(door, requester, "");
  assert.equal(first, second);
  assert.ok(first.length <= MAX_DOOR_MESSAGE);

  const fields = fallbackProfileFields(cvText());
  assert.deepEqual(fields, fallbackProfileFields(cvText()));
  assert.deepEqual(normalizeProfileFields(null), {
    bio: "",
    skills: [],
    location: "",
    organisation: "",
    status: "",
    website: "",
    githubusername: "",
    social: {},
    mentee_goals: [],
    internship_types: [],
    internship_work_modes: [],
    internship_locations: [],
  });
});
