process.env.NODE_ENV = "test";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Door = require("../models/Door");
const DoorRequest = require("../models/DoorRequest");
const User = require("../models/User");
const {
  QUESTION_MATCH_THRESHOLD,
  QUESTION_WEEKLY_CAP,
  createDoor,
  requestDoor,
  transitionRequest,
  setDoorActive,
  allowedTransition,
  pickQuestionDoors,
  startOfMonth,
  startOfNextMonth,
  startOfWeek,
  startOfNextWeek,
} = require("../services/doors");

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
  const dbName = `alumniconnect_doors_test_${process.pid}_${Date.now()}`;
  return `${base}/${dbName}${query ? `?${query}` : ""}`;
}

let alumni;
let otherAlumni;
let students = [];

before(async () => {
  await mongoose.connect(buildTestUri(), { serverSelectionTimeoutMS: 10000 });
  await Door.init();
  await DoorRequest.init();

  alumni = await User.create({
    name: "Doors Alumni",
    email: `doors-alumni-${process.pid}@test.local`,
    password: "not-used",
    role: "alumni",
    organisation: "Nimbus Labs",
    designation: "ML Engineer",
  });
  otherAlumni = await User.create({
    name: "Doors Other Alumni",
    email: `doors-other-${process.pid}@test.local`,
    password: "not-used",
    role: "alumni",
  });
  students = await Promise.all(
    ["One", "Two", "Three"].map((suffix) =>
      User.create({
        name: `Doors Student ${suffix}`,
        email: `doors-student-${suffix}-${process.pid}@test.local`,
        password: "not-used",
        role: "student",
      })
    )
  );
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

async function openDoor(overrides = {}) {
  const door = await createDoor(alumni, {
    type: "chat15",
    title: "15 minutes on production ML",
    topics: ["Machine Learning", "Placements"],
    monthlyCap: 1,
    ...overrides,
  });
  return setDoorActive(alumni._id, door._id, true);
}

test("doors start inactive and only alumni can create them", async () => {
  const created = await createDoor(alumni, {
    type: "resume_review",
    title: "Resume review for internships",
    topics: ["Placements"],
    monthlyCap: 2,
  });
  assert.equal(created.active, false);

  await assert.rejects(
    () =>
      createDoor(students[0], {
        type: "chat15",
        title: "Student cannot open a door",
      }),
    (err) => err.status === 403
  );

  await assert.rejects(
    () => createDoor(alumni, { type: "unknown", title: "Unknown type" }),
    (err) => err.status === 400
  );
});

test("duplicate open requests are rejected", async () => {
  const door = await openDoor();
  const first = await requestDoor({
    doorId: door._id,
    requester: students[0],
    message: "Could you look at my ML project?",
  });
  assert.equal(first.status, "pending");

  await assert.rejects(
    () =>
      requestDoor({
        doorId: door._id,
        requester: students[0],
        message: "Asking again",
      }),
    (err) => err.status === 409
  );
});

test("parallel accepts against a monthly cap of one create exactly one accepted request", async () => {
  const door = await openDoor({ monthlyCap: 1 });
  const first = await requestDoor({
    doorId: door._id,
    requester: students[0],
    message: "Request one",
  });
  const second = await requestDoor({
    doorId: door._id,
    requester: students[1],
    message: "Request two",
  });

  const results = await Promise.allSettled([
    transitionRequest({
      requestId: first._id,
      actorId: alumni._id,
      status: "accepted",
    }),
    transitionRequest({
      requestId: second._id,
      actorId: alumni._id,
      status: "accepted",
    }),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.equal(rejected.reason.status, 409);

  const accepted = await DoorRequest.countDocuments({
    door: door._id,
    status: "accepted",
  });
  assert.equal(accepted, 1);
});

test("a door at its monthly cap rejects new requests", async () => {
  const door = await openDoor({ monthlyCap: 1 });
  const first = await requestDoor({
    doorId: door._id,
    requester: students[0],
  });
  await transitionRequest({
    requestId: first._id,
    actorId: alumni._id,
    status: "accepted",
  });

  await assert.rejects(
    () => requestDoor({ doorId: door._id, requester: students[1] }),
    (err) => err.status === 409
  );
});

test("door request transitions follow the state machine and actor roles", async () => {
  const door = await openDoor();
  const request = await requestDoor({
    doorId: door._id,
    requester: students[0],
  });

  await assert.rejects(
    () =>
      transitionRequest({
        requestId: request._id,
        actorId: alumni._id,
        status: "completed",
      }),
    (err) => err.status === 400
  );

  await assert.rejects(
    () =>
      transitionRequest({
        requestId: request._id,
        actorId: students[0]._id,
        status: "accepted",
      }),
    (err) => err.status === 400
  );

  const accepted = await transitionRequest({
    requestId: request._id,
    actorId: alumni._id,
    status: "accepted",
  });
  assert.equal(accepted.status, "accepted");

  assert.equal(allowedTransition("accepted", "completed", "owner"), true);
  assert.equal(allowedTransition("accepted", "completed", "requester"), false);
  assert.equal(allowedTransition("completed", "accepted", "owner"), false);
});

test("question routing keeps topic matches, skips full doors and is deterministic", () => {
  const doors = [
    { _id: "b", topics: ["Placements", "Resume"], createdAt: 1 },
    { _id: "a", topics: ["Placements"], createdAt: 2 },
    { _id: "c", topics: ["Research"], createdAt: 3 },
    { _id: "d", topics: ["Placements"], createdAt: 0 },
  ];
  const usage = new Map([["d", QUESTION_WEEKLY_CAP]]);

  const picked = pickQuestionDoors(doors, {
    question: "How should I prepare for placements?",
    topics: ["Placements"],
    usage,
  });

  assert.deepEqual(
    picked.map((door) => door._id),
    ["a", "b"]
  );
  assert.equal(QUESTION_MATCH_THRESHOLD, 0.8);
  assert.equal(startOfMonth(new Date("2026-11-11T10:00:00Z")).toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(startOfNextMonth(new Date("2026-11-11T10:00:00Z")).toISOString(), "2026-12-01T00:00:00.000Z");
  assert.equal(startOfWeek(new Date("2026-11-11T10:00:00Z")).toISOString(), "2026-11-09T00:00:00.000Z");
  assert.equal(startOfNextWeek(new Date("2026-11-11T10:00:00Z")).toISOString(), "2026-11-16T00:00:00.000Z");
});
