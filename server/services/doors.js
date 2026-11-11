// Open Doors business rules.
//
// A door is an explicit, capped offer from one alumnus. Requests are the only
// booking primitive; accepting a request is what consumes the monthly cap.
// Question doors are routed with the existing local BGE embeddings: the
// closest answered questions are shown first, otherwise the question is sent
// to at most three opted-in question doors. No LLM is involved.

const Door = require("../models/Door");
const DoorRequest = require("../models/DoorRequest");
const Notification = require("../models/Notifications");
const { withLock } = require("../utils/keyedMutex");
const {
  embedQuery,
  embedTexts,
  cosineSimilarity,
} = require("./embeddings");

const QUESTION_MATCH_THRESHOLD = 0.8;
const QUESTION_WEEKLY_CAP = 3;
const MAX_QUESTION_ROUTES = 3;
const ANSWERED_QUESTION_LIMIT = 200;

const DOOR_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "completed",
  "cancelled",
];

class DoorError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "DoorError";
    this.status = status;
  }
}

const ownerKey = (ownerId) =>
  `door:owner:${String(ownerId).trim().toLowerCase()}`;

const isAlumni = (user) => String(user?.role || "").toLowerCase() === "alumni";
const isStudent = (user) => String(user?.role || "").toLowerCase() === "student";

function normalizeTopics(topics) {
  const list = Array.isArray(topics)
    ? topics
    : String(topics || "").split(",");
  const seen = new Set();
  const result = [];
  for (const item of list) {
    const value = String(item || "").trim().replace(/\s+/g, " ");
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value.slice(0, 40));
  }
  return result.slice(0, 8);
}

function startOfMonth(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfNextMonth(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

// Weeks start on Monday, in UTC, so the cap is deterministic for tests.
function startOfWeek(now = new Date()) {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

function startOfNextWeek(now = new Date()) {
  const start = startOfWeek(now);
  start.setUTCDate(start.getUTCDate() + 7);
  return start;
}

async function countUsage(doorId, from, to) {
  return DoorRequest.countDocuments({
    door: doorId,
    status: { $in: ["accepted", "completed"] },
    createdAt: { $gte: from, $lt: to },
  });
}

async function countMonthlyUsage(doorId, now = new Date()) {
  return countUsage(doorId, startOfMonth(now), startOfNextMonth(now));
}

// A question door's weekly limit covers open asks too, so three pending
// questions already prevent a fourth from being routed that week.
async function countWeeklyUsage(doorId, now = new Date()) {
  return DoorRequest.countDocuments({
    door: doorId,
    status: { $in: ["pending", "accepted", "completed"] },
    createdAt: { $gte: startOfWeek(now), $lt: startOfNextWeek(now) },
  });
}

async function usageByDoor(doorIds, from, to) {
  const rows = await DoorRequest.aggregate([
    {
      $match: {
        door: { $in: doorIds },
        status: { $in: ["pending", "accepted", "completed"] },
        createdAt: { $gte: from, $lt: to },
      },
    },
    { $group: { _id: "$door", count: { $sum: 1 } } },
  ]);
  const usage = new Map();
  for (const row of rows) usage.set(String(row._id), row.count);
  return usage;
}

function allowedTransition(current, next, role) {
  const transitions = {
    pending: ["accepted", "declined", "cancelled"],
    accepted: ["completed", "cancelled"],
    declined: [],
    completed: [],
    cancelled: [],
  };
  if (!transitions[current] || !transitions[current].includes(next)) {
    return false;
  }
  if (["accepted", "declined", "completed"].includes(next)) {
    return role === "owner";
  }
  if (next === "cancelled") {
    return role === "owner" || role === "requester";
  }
  return false;
}

function roleFor(request, userId) {
  const actor = String(userId || "");
  if (String(request.requestedBy) === actor) return "requester";
  if (String(request.door?.owner || request.requestedByOwner) === actor) {
    return "owner";
  }
  return "";
}

function topicScore(question, topics, doorTopics) {
  const normalizedQuestion = String(question || "").toLowerCase();
  const wanted = new Set(normalizeTopics(topics).map((topic) => topic.toLowerCase()));
  let score = 0;
  for (const raw of doorTopics || []) {
    const topic = String(raw || "").trim().toLowerCase();
    if (!topic) continue;
    if (wanted.has(topic)) score += 2;
    else if (normalizedQuestion.includes(topic)) score += 1;
  }
  return score;
}

// Pure and deterministic so the routing order can be tested without Mongo.
function pickQuestionDoors(
  doors,
  { question = "", topics = [], usage = new Map(), limit = MAX_QUESTION_ROUTES } = {}
) {
  return (doors || [])
    .map((door) => ({
      door,
      score: topicScore(question, topics, door.topics),
      usage: usage.get(String(door._id)) || 0,
    }))
    .filter((entry) => entry.score > 0 && entry.usage < QUESTION_WEEKLY_CAP)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.usage - b.usage ||
        String(a.door._id).localeCompare(String(b.door._id))
    )
    .slice(0, limit)
    .map((entry) => entry.door);
}

async function notifyUser(userId, actorName, name, description, link) {
  if (!userId) return;
  try {
    await Notification.create({
      created_by_user: String(actorName || "AlumniConnect").slice(0, 80),
      userID: userId,
      Notification_name: name,
      Notification_description: description,
      Notification_link: link,
    });
  } catch (err) {
    console.warn("[doors] notification failed:", err.message);
  }
}

async function createDoor(owner, payload = {}) {
  if (!isAlumni(owner)) {
    throw new DoorError(403, "Only alumni can open a door");
  }
  const type = String(payload.type || "").trim();
  if (!Door.DOOR_TYPES.includes(type)) {
    throw new DoorError(400, "Unknown door type");
  }
  const title = String(payload.title || "").trim();
  if (title.length < 4 || title.length > 120) {
    throw new DoorError(400, "Title must be 4–120 characters");
  }
  const monthlyCap = Number(payload.monthlyCap ?? 2);
  if (!Number.isInteger(monthlyCap) || monthlyCap < 1 || monthlyCap > 20) {
    throw new DoorError(400, "Monthly cap must be a whole number from 1 to 20");
  }
  return Door.create({
    owner: owner._id,
    type,
    title,
    topics: normalizeTopics(payload.topics),
    monthlyCap,
    // Creation never publishes a door automatically.
    active: false,
  });
}

async function setDoorActive(ownerId, doorId, active) {
  if (typeof active !== "boolean") {
    throw new DoorError(400, "active must be true or false");
  }
  const door = await Door.findOneAndUpdate(
    { _id: doorId, owner: ownerId },
    { $set: { active, updatedAt: new Date() } },
    { new: true }
  );
  if (!door) throw new DoorError(404, "Door not found");
  return door;
}

async function listDoors({ userId, mine = false, type = "", topic = "", q = "" } = {}) {
  const filter = mine ? { owner: userId } : { active: true };
  const cleanType = String(type || "").trim();
  if (cleanType) filter.type = cleanType;

  const cleanTopic = String(topic || "").trim();
  if (cleanTopic) {
    const escaped = cleanTopic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.topics = { $regex: new RegExp(`^${escaped}$`, "i") };
  }

  const cleanQuery = String(q || "").trim();
  if (cleanQuery) {
    const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { topics: { $regex: escaped, $options: "i" } },
    ];
  }

  return Door.find(filter)
    .populate(
      "owner",
      "name avatar role program passing_year designation organisation location working_area skills bio"
    )
    .sort({ createdAt: -1 })
    .lean();
}

async function requestDoor({ doorId, requester, message = "" }) {
  if (!isStudent(requester)) {
    throw new DoorError(403, "Only students can request a door");
  }

  const door = await Door.findById(doorId);
  if (!door || !door.active) {
    throw new DoorError(404, "This door is not open right now");
  }
  if (String(door.owner) === String(requester._id)) {
    throw new DoorError(400, "You cannot request your own door");
  }

  try {
    return await withLock(ownerKey(door.owner), async () => {
      const existing = await DoorRequest.findOne({
        door: door._id,
        requestedBy: requester._id,
        status: { $in: ["pending", "accepted"] },
      });
      if (existing) {
        throw new DoorError(409, "You already have an open request for this door");
      }

      const used = await countMonthlyUsage(door._id);
      if (used >= door.monthlyCap) {
        throw new DoorError(409, "This door has reached its monthly cap");
      }

      const created = await DoorRequest.create({
        door: door._id,
        requestedBy: requester._id,
        message: String(message || "").slice(0, 1200),
        status: "pending",
      });

      await notifyUser(
        door.owner,
        requester.name,
        `New door request: ${door.title}`,
        `${requester.name || "A student"} asked for ${door.title}.`,
        "/doors"
      );
      return created;
    });
  } catch (err) {
    if (err && err.code === 11000) {
      throw new DoorError(409, "You already have an open request for this door");
    }
    throw err;
  }
}

async function transitionRequest({
  requestId,
  actorId,
  status,
  answerText = "",
}) {
  if (!DOOR_STATUSES.includes(status)) {
    throw new DoorError(400, "Invalid door request status");
  }

  const existing = await DoorRequest.findById(requestId).populate("door");
  if (!existing || !existing.door) {
    throw new DoorError(404, "Door request not found");
  }
  const role = roleFor(existing, actorId);
  if (!role) {
    throw new DoorError(403, "You are not part of this door request");
  }
  if (!allowedTransition(existing.status, status, role)) {
    throw new DoorError(
      400,
      `Cannot move this ${existing.status} request to ${status}`
    );
  }

  return withLock(ownerKey(existing.door.owner), async () => {
    const fresh = await DoorRequest.findById(requestId).populate("door");
    if (!fresh || !fresh.door) {
      throw new DoorError(404, "Door request not found");
    }
    const freshRole = roleFor(fresh, actorId);
    if (!allowedTransition(fresh.status, status, freshRole)) {
      throw new DoorError(
        400,
        `Cannot move this ${fresh.status} request to ${status}`
      );
    }

    if (status === "accepted") {
      const used = await DoorRequest.countDocuments({
        door: fresh.door._id,
        status: { $in: ["accepted", "completed"] },
        createdAt: {
          $gte: startOfMonth(),
          $lt: startOfNextMonth(),
        },
        _id: { $ne: fresh._id },
      });
      if (used >= fresh.door.monthlyCap) {
        throw new DoorError(
          409,
          "This door is already at its monthly cap. Complete an accepted request before accepting another."
        );
      }
    }

    if (status === "completed") {
      if (fresh.door.type === "question") {
        const answer = String(answerText || "").trim();
        if (!answer) {
          throw new DoorError(
            400,
            "An answer is required to complete a question door request"
          );
        }
        fresh.answerText = answer.slice(0, 4000);
      } else if (String(answerText || "").trim()) {
        fresh.answerText = String(answerText).trim().slice(0, 4000);
      }
      fresh.completedAt = new Date();
    }

    fresh.status = status;
    fresh.updatedAt = new Date();
    await fresh.save();

    const ownerId = fresh.door.owner;
    const requesterId = fresh.requestedBy;
    const targetId = freshRole === "owner" ? requesterId : ownerId;
    const targetName = freshRole === "owner" ? "The alumnus" : "The student";
    if (status !== "cancelled") {
      await notifyUser(
        targetId,
        targetName,
        `Door request ${status}: ${fresh.door.title}`,
        `Your request for ${fresh.door.title} is now ${status}.`,
        "/doors"
      );
    }

    return DoorRequest.findById(requestId)
      .populate("door")
      .populate("requestedBy", "name avatar program passing_year")
      .populate("door.owner", "name avatar designation organisation");
  });
}

// Cache answered-question vectors in-process. Completed question requests are
// immutable in this step, so the key is the request id plus question length.
const answeredQuestionCache = new Map();

async function answeredQuestionVectors(answered) {
  const missing = answered.filter(
    (item) =>
      !answeredQuestionCache.has(`${item._id}:${item.message.length}`)
  );
  if (missing.length) {
    const vectors = await embedTexts(missing.map((item) => item.message));
    missing.forEach((item, index) => {
      if (vectors[index]) {
        answeredQuestionCache.set(
          `${item._id}:${item.message.length}`,
          vectors[index]
        );
      }
    });
  }
}

async function findAnsweredQuestionMatches(question) {
  const answered = await DoorRequest.find({
    status: "completed",
    answerText: { $nin: ["", null] },
  })
    .populate({
      path: "door",
      match: { type: "question" },
      select: "title type owner",
      populate: {
        path: "owner",
        select: "name avatar designation organisation role",
      },
    })
    .sort({ completedAt: -1 })
    .limit(ANSWERED_QUESTION_LIMIT)
    .lean();

  const usable = answered.filter(
    (item) =>
      item.door &&
      item.door.type === "question" &&
      String(item.message || "").trim() &&
      String(item.answerText || "").trim()
  );
  if (!usable.length) return [];

  const queryVector = await embedQuery(question);
  if (!queryVector.length) return [];

  // Compare question to question, then return the answer that was given.
  await answeredQuestionVectors(usable);
  const scored = usable
    .map((item) => {
      const vector = answeredQuestionCache.get(
        `${item._id}:${item.message.length}`
      );
      return {
        id: item._id,
        question: item.message,
        answer: item.answerText,
        doorTitle: item.door.title,
        owner: item.door.owner
          ? {
              name: item.door.owner.name,
              designation: item.door.owner.designation,
              organisation: item.door.owner.organisation,
              avatar: item.door.owner.avatar,
            }
          : null,
        similarity: Number(cosineSimilarity(queryVector, vector).toFixed(4)),
        createdAt: item.completedAt || item.createdAt,
      };
    })
    .filter((item) => item.similarity >= QUESTION_MATCH_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  return scored;
}

async function askQuestion({ question, topics = [], requester }) {
  if (!isStudent(requester)) {
    throw new DoorError(403, "Only students can ask through a question door");
  }
  const cleanQuestion = String(question || "").trim();
  if (cleanQuestion.length < 8 || cleanQuestion.length > 1000) {
    throw new DoorError(400, "Question must be 8–1000 characters");
  }

  let matches = [];
  try {
    matches = await findAnsweredQuestionMatches(cleanQuestion);
  } catch (err) {
    console.warn("[doors] question similarity unavailable:", err.message);
  }

  if (matches.length) {
    return {
      model: "algorithm",
      matched: true,
      threshold: QUESTION_MATCH_THRESHOLD,
      matches,
      routed: [],
      skipped: [],
    };
  }

  const doors = await Door.find({ active: true, type: "question" })
    .populate(
      "owner",
      "name avatar role designation organisation passing_year program"
    )
    .lean();
  const eligible = doors.filter(
    (door) => door.owner && String(door.owner.role).toLowerCase() === "alumni"
  );
  const usage = await usageByDoor(
    eligible.map((door) => door._id),
    startOfWeek(),
    startOfNextWeek()
  );
  const selected = pickQuestionDoors(eligible, {
    question: cleanQuestion,
    topics,
    usage,
  });

  const routed = [];
  const skipped = [];
  for (const door of selected) {
    try {
      const created = await withLock(ownerKey(door.owner._id), async () => {
        const existing = await DoorRequest.findOne({
          door: door._id,
          requestedBy: requester._id,
          status: { $in: ["pending", "accepted"] },
        });
        if (existing) {
          throw new DoorError(409, "You already have an open request for this door");
        }
        const used = await countWeeklyUsage(door._id);
        if (used >= QUESTION_WEEKLY_CAP) {
          throw new DoorError(409, "This question door is full for this week");
        }
        const request = await DoorRequest.create({
          door: door._id,
          requestedBy: requester._id,
          message: cleanQuestion,
          status: "pending",
        });
        await notifyUser(
          door.owner._id,
          requester.name,
          `New question: ${door.title}`,
          `${requester.name || "A student"} asked: ${cleanQuestion.slice(0, 160)}`,
          "/doors"
        );
        return request;
      });
      routed.push({
        id: created._id,
        doorId: door._id,
        doorTitle: door.title,
        owner: door.owner,
      });
    } catch (err) {
      skipped.push({
        doorId: door._id,
        doorTitle: door.title,
        reason: err.message,
      });
    }
  }

  return {
    model: "algorithm",
    matched: false,
    threshold: QUESTION_MATCH_THRESHOLD,
    matches: [],
    routed,
    skipped,
  };
}

module.exports = {
  DoorError,
  QUESTION_MATCH_THRESHOLD,
  QUESTION_WEEKLY_CAP,
  MAX_QUESTION_ROUTES,
  normalizeTopics,
  startOfMonth,
  startOfNextMonth,
  startOfWeek,
  startOfNextWeek,
  countMonthlyUsage,
  countWeeklyUsage,
  allowedTransition,
  roleFor,
  pickQuestionDoors,
  createDoor,
  setDoorActive,
  listDoors,
  requestDoor,
  transitionRequest,
  askQuestion,
};
