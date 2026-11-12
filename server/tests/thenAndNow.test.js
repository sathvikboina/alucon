process.env.NODE_ENV = "test";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const User = require("../models/User");
const Group = require("../models/Group");
const {
  MODEL_LABEL,
  MAX_RECONNECT_PROMPTS,
  MAX_SHARED_GROUP_NAMES,
  cityOf,
  buildThenAndNow,
} = require("../services/thenAndNow");

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
  const dbName = `alumniconnect_thennow_test_${process.pid}_${Date.now()}`;
  return `${base}/${dbName}${query ? `?${query}` : ""}`;
}

let sequence = 0;

async function makeUser(name, overrides = {}) {
  sequence += 1;
  return User.create({
    name,
    email: `thennow-${sequence}-${Date.now()}@test.local`,
    password: "not-used",
    role: "alumni",
    ...overrides,
  });
}

async function makeGroup({ name, category = "BATCH", owner, members }) {
  sequence += 1;
  return Group.create({
    name: `${name} ${sequence}`,
    description: "Fictional group used only by Then & Now tests.",
    category,
    access: "OPEN",
    owner: owner._id,
    members: members.map((member) => ({
      user: member._id,
      role: String(member._id) === String(owner._id) ? "owner" : "member",
    })),
  });
}

const MEMBER_SELECT =
  "name avatar role program passing_year designation organisation location show_city blocked";

async function loadGroup(id) {
  return Group.findById(id).populate("members.user", MEMBER_SELECT).lean();
}

before(async () => {
  await mongoose.connect(buildTestUri(), { serverSelectionTimeoutMS: 10000 });
});

beforeEach(async () => {
  sequence = 0;
  await Promise.all([User.deleteMany({}), Group.deleteMany({})]);
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test("show_city defaults false and non-BATCH groups have no panel", async () => {
  const member = await makeUser("Default City Member", {
    location: "Bengaluru, India",
  });
  assert.equal(member.show_city, false);

  const club = await makeGroup({
    name: "Then Now Club",
    category: "CLUB",
    owner: member,
    members: [member],
  });
  const panel = await buildThenAndNow({
    group: await loadGroup(club._id),
    viewerId: member._id,
  });

  assert.equal(panel.enabled, false);
  assert.equal(panel.readOnly, true);
  assert.equal(panel.model, MODEL_LABEL);
  assert.deepEqual(panel.cityCounts, []);
  assert.deepEqual(panel.reconnect, []);
});

test("city totals include only opted-in members and are aggregated case-insensitively", async () => {
  const viewer = await makeUser("City Viewer", {
    location: "Pune, India",
    show_city: true,
  });
  const a = await makeUser("A Member", {
    location: "Bengaluru, India",
    show_city: true,
  });
  const b = await makeUser("B Member", {
    location: "bengaluru, India",
    show_city: true,
  });
  const optedOut = await makeUser("Opted Out", {
    location: "Bengaluru, India",
    show_city: false,
  });
  const blank = await makeUser("Blank City", {
    location: "",
    show_city: true,
  });
  const blocked = await makeUser("Blocked City", {
    location: "Pune, India",
    show_city: true,
    blocked: true,
  });

  const batch = await makeGroup({
    name: "City Batch",
    owner: viewer,
    members: [viewer, a, b, optedOut, blank, blocked],
  });

  const panel = await buildThenAndNow({
    group: await loadGroup(batch._id),
    viewerId: viewer._id,
  });

  assert.equal(panel.enabled, true);
  assert.equal(panel.readOnly, true);
  assert.equal(panel.cityOptIn, true);
  assert.equal(panel.cityOptInCount, 3);
  assert.deepEqual(panel.cityCounts, [
    { city: "Bengaluru", count: 2 },
    { city: "Pune", count: 1 },
  ]);
  assert.equal(cityOf("Bengaluru, India"), "Bengaluru");
  assert.equal(cityOf("Austin / Remote"), "Austin");
  assert.equal(cityOf("  "), "");

  const serialized = JSON.stringify(panel.cityCounts);
  assert.equal(serialized.includes("A Member"), false);
  assert.equal(serialized.includes("Bengaluru, India"), false);
});

test("reconnect prompts use shared groups, cap at six and hide unshared cities", async () => {
  const viewer = await makeUser("Batch Viewer", {
    location: "Pune, India",
    show_city: true,
  });
  const sameCity = await makeUser("Same City", {
    location: "Pune, India",
    show_city: true,
    designation: "Engineer",
  });
  const candidates = [];
  for (let i = 0; i < 7; i += 1) {
    candidates.push(
      await makeUser(`Candidate ${i}`, {
        location: "Hyderabad, India",
        show_city: false,
      })
    );
  }
  const blocked = await makeUser("Blocked Member", {
    location: "Pune, India",
    show_city: true,
    blocked: true,
  });
  const outsider = await makeUser("Not In Batch", {
    location: "Pune, India",
    show_city: true,
  });

  const batch = await makeGroup({
    name: "Reconnect Batch",
    owner: viewer,
    members: [viewer, sameCity, ...candidates, blocked],
  });

  // sameCity shares two groups with the viewer, so it must rank first.
  const sharedAlpha = await makeGroup({
    name: "Shared Alpha",
    category: "CLUB",
    owner: viewer,
    members: [viewer, sameCity, candidates[0], candidates[1], blocked, outsider],
  });
  const sharedBeta = await makeGroup({
    name: "Shared Beta",
    category: "CLUB",
    owner: viewer,
    members: [viewer, sameCity, candidates[2], candidates[3]],
  });
  await makeGroup({
    name: "Shared Gamma",
    category: "CLUB",
    owner: viewer,
    members: [viewer, candidates[4], candidates[5], candidates[6]],
  });

  const loaded = await loadGroup(batch._id);
  const panel = await buildThenAndNow({ group: loaded, viewerId: viewer._id });

  assert.equal(panel.reconnect.length, MAX_RECONNECT_PROMPTS);
  assert.equal(panel.reconnect[0].name, "Same City");
  assert.equal(panel.reconnect[0].sameCity, true);
  assert.equal(panel.reconnect[0].city, "Pune");
  assert.deepEqual(panel.reconnect[0].sharedGroups.sort(), [
    sharedAlpha.name,
    sharedBeta.name,
  ].sort());
  assert.ok(
    panel.reconnect.every(
      (member) => member.sharedGroups.length <= MAX_SHARED_GROUP_NAMES
    )
  );
  assert.equal(
    panel.reconnect.some((member) => member.name === "Blocked Member"),
    false
  );
  assert.equal(
    panel.reconnect.some((member) => member.name === "Not In Batch"),
    false
  );

  const hiddenCity = panel.reconnect.find(
    (member) => member.name === "Candidate 0"
  );
  assert.equal(hiddenCity.city, "");
  assert.equal(hiddenCity.sameCity, false);
  assert.equal(hiddenCity.sharedGroupCount, 1);
  assert.equal(hiddenCity.designation, "");

  const again = await buildThenAndNow({
    group: await loadGroup(batch._id),
    viewerId: viewer._id,
  });
  assert.deepEqual(
    again.reconnect.map((member) => member.id),
    panel.reconnect.map((member) => member.id)
  );
});

test("non-members see aggregate totals but no reconnect prompts", async () => {
  const owner = await makeUser("Batch Owner", {
    location: "Bengaluru, India",
    show_city: true,
  });
  const member = await makeUser("Batch Member", {
    location: "Delhi, India",
    show_city: true,
  });
  const viewer = await makeUser("Outside Viewer", {
    location: "Pune, India",
    show_city: true,
  });

  const batch = await makeGroup({
    name: "Private Prompts Batch",
    owner,
    members: [owner, member],
  });
  await makeGroup({
    name: "Outside Shared Club",
    category: "CLUB",
    owner: viewer,
    members: [viewer, member],
  });

  const panel = await buildThenAndNow({
    group: await loadGroup(batch._id),
    viewerId: viewer._id,
  });

  assert.equal(panel.enabled, true);
  assert.equal(panel.cityOptIn, false);
  assert.deepEqual(panel.cityCounts, [
    { city: "Bengaluru", count: 1 },
    { city: "Delhi", count: 1 },
  ]);
  assert.deepEqual(panel.reconnect, []);
});
