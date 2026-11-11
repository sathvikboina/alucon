process.env.NODE_ENV = "test";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const User = require("../models/User");
const Group = require("../models/Group");
const Door = require("../models/Door");
const MentorShipRequest = require("../models/MentorShipRequest");
const { buildWarmPaths } = require("../services/warmPaths");
const {
  EDGE_WEIGHTS,
  MAX_PATH_DEPTH,
  MAX_PATHS,
} = require("../services/warmPathWeights");

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
  const dbName = `alumniconnect_warmpaths_test_${process.pid}_${Date.now()}`;
  return `${base}/${dbName}${query ? `?${query}` : ""}`;
}

async function makeUser(name, role, overrides = {}) {
  return User.create({
    name,
    email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}@test.local`,
    password: "not-used",
    role,
    ...overrides,
  });
}

before(async () => {
  await mongoose.connect(buildTestUri(), { serverSelectionTimeoutMS: 10000 });
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Group.deleteMany({}),
    Door.deleteMany({}),
    MentorShipRequest.deleteMany({}),
  ]);
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test("connector opt-in defaults to false and weights live in one constants file", async () => {
  const person = await makeUser("Default Person", "alumni");
  assert.equal(person.connector_opt_in, false);
  assert.equal(MAX_PATH_DEPTH, 2);
  assert.equal(MAX_PATHS, 3);
  assert.deepEqual(Object.keys(EDGE_WEIGHTS).sort(), [
    "mentorship",
    "mutualFollow",
    "oneWayFollow",
    "sameCompany",
    "sharedGroup",
  ]);
});

test("two-hop path exposes only opted-in members and ignores inactive doors", async () => {
  const viewer = await makeUser("Viewer Student", "student");
  const connector = await makeUser("A Connector", "alumni", {
    connector_opt_in: true,
  });
  const backupConnector = await makeUser("Z Connector", "alumni", {
    connector_opt_in: true,
  });
  const target = await makeUser("B Target", "alumni", {
    connector_opt_in: true,
    designation: "ML Engineer",
    organisation: "Nimbus Labs",
  });
  const optedOut = await makeUser("C Opted Out", "alumni", {
    connector_opt_in: false,
  });
  const inactiveDoorOwner = await makeUser("D No Active Door", "alumni", {
    connector_opt_in: true,
  });

  await User.findByIdAndUpdate(viewer._id, {
    $set: {
      followings: [connector._id, backupConnector._id, optedOut._id],
    },
  });
  await User.findByIdAndUpdate(connector._id, {
    $set: { followings: [target._id] },
  });
  await User.findByIdAndUpdate(backupConnector._id, {
    $set: { followings: [target._id] },
  });
  await User.findByIdAndUpdate(optedOut._id, {
    $set: { followings: [target._id] },
  });

  const activeDoor = await Door.create({
    owner: target._id,
    type: "referral",
    title: "Referral for applied ML roles",
    topics: ["Machine Learning"],
    monthlyCap: 1,
    active: true,
  });
  await Door.create({
    owner: inactiveDoorOwner._id,
    type: "referral",
    title: "Inactive referral door",
    topics: ["Backend"],
    monthlyCap: 1,
    active: false,
  });

  const viewerDoc = await User.findById(viewer._id).lean();
  const result = await buildWarmPaths(viewerDoc);

  assert.equal(result.model, "algorithm");
  assert.equal(result.depth, 2);
  assert.equal(result.optedIn, false);
  assert.equal(result.paths.length, 1);
  assert.equal(result.paths[0].target.name, "B Target");
  assert.equal(result.paths[0].connector.name, "A Connector");
  assert.equal(result.paths[0].door.id, String(activeDoor._id));
  assert.equal(result.paths[0].askThrough, "referral_door");
  assert.equal(result.paths[0].score, 0.25);
  assert.deepEqual(
    result.paths[0].hops.map((hop) => hop.reason),
    ["You follow A Connector", "A Connector follows B Target"]
  );
  assert.deepEqual(
    result.paths[0].hops.map((hop) => hop.weight),
    [EDGE_WEIGHTS.oneWayFollow, EDGE_WEIGHTS.oneWayFollow]
  );

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("C Opted Out"), false);
  assert.equal(serialized.includes("D No Active Door"), false);

  const again = await buildWarmPaths(viewerDoc);
  assert.deepEqual(
    again.paths.map((path) => `${path.connector.id}:${path.target.id}`),
    result.paths.map((path) => `${path.connector.id}:${path.target.id}`)
  );
});

test("mentorship edges outrank follows and same-company edges are available", async () => {
  const viewer = await makeUser("Mentee Viewer", "student");
  const mentor = await makeUser("Mentor Connector", "alumni", {
    connector_opt_in: true,
  });
  const target = await makeUser("Mentor Target", "alumni", {
    connector_opt_in: true,
  });

  await MentorShipRequest.create({
    requestedBy: viewer._id,
    requestedTo: mentor._id,
    areaOfHelp: "Career",
    status: "active",
  });
  await User.findByIdAndUpdate(mentor._id, {
    $set: { followings: [target._id] },
  });
  await Door.create({
    owner: target._id,
    type: "referral",
    title: "Referral through mentorship",
    monthlyCap: 1,
    active: true,
  });

  const result = await buildWarmPaths(await User.findById(viewer._id).lean());
  assert.equal(result.paths.length, 1);
  assert.equal(result.paths[0].score, 0.45);
  assert.equal(result.paths[0].hops[0].type, "mentorship");
  assert.equal(result.paths[0].hops[0].weight, EDGE_WEIGHTS.mentorship);
  assert.equal(result.paths[0].hops[1].type, "oneWayFollow");
});

test("no path returns deterministic group suggestions instead", async () => {
  const viewer = await makeUser("Group Viewer", "student");
  const alumnus = await makeUser("Group Alumnus", "alumni", {
    connector_opt_in: true,
  });
  const group = await Group.create({
    name: "Warm Path Test Group",
    description: "Fictional group used only by tests.",
    owner: alumnus._id,
    category: "CLUB",
    access: "OPEN",
    members: [
      { user: viewer._id, role: "member" },
      { user: alumnus._id, role: "owner" },
    ],
  });

  const result = await buildWarmPaths(await User.findById(viewer._id).lean());
  assert.equal(result.paths.length, 0);
  assert.equal(result.fallback.groups.length, 1);
  assert.equal(result.fallback.groups[0].id, String(group._id));
  assert.equal(result.fallback.groups[0].optedInMembers, 1);
  assert.equal(result.fallback.groups[0].referralOwners, 0);
});
