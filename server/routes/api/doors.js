const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Door = require("../../models/Door");
const DoorRequest = require("../../models/DoorRequest");
const {
  DoorError,
  createDoor,
  setDoorActive,
  listDoors,
  requestDoor,
  transitionRequest,
  askQuestion,
} = require("../../services/doors");

const sendError = (res, err) => {
  if (err instanceof DoorError) {
    return res.status(err.status).json({ msg: err.message });
  }
  console.error("[doors]", err.message);
  return res.status(500).json({ msg: "Server error" });
};

// @route   GET api/doors
// @desc    List open doors, or the signed-in alumnus's own doors with ?mine=1
router.get("/", auth, async (req, res) => {
  try {
    const doors = await listDoors({
      userId: req.user.id,
      mine: req.query.mine === "1",
      type: req.query.type,
      topic: req.query.topic,
      q: req.query.q,
    });
    res.json(doors);
  } catch (err) {
    sendError(res, err);
  }
});

// @route   GET api/doors/requests?scope=sent|received
// @desc    Requests the member sent, or requests received on their doors
router.get("/requests", auth, async (req, res) => {
  try {
    const scope = String(req.query.scope || "sent").toLowerCase();
    let filter;
    if (scope === "received") {
      const owned = await Door.find({ owner: req.user.id }).select("_id").lean();
      filter = { door: { $in: owned.map((door) => door._id) } };
    } else {
      filter = { requestedBy: req.user.id };
    }

    const requests = await DoorRequest.find(filter)
      .populate({
        path: "door",
        select: "title type topics monthlyCap active owner createdAt",
        populate: {
          path: "owner",
          select: "name avatar role designation organisation",
        },
      })
      .populate("requestedBy", "name avatar role program passing_year")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    sendError(res, err);
  }
});

// @route   POST api/doors/questions/ask
// @desc    Match an answered question first, otherwise route to up to 3 question doors
router.post("/questions/ask", auth, async (req, res) => {
  try {
    const User = require("../../models/User");
    const requester = await User.findById(req.user.id).select("name role").lean();
    if (!requester) return res.status(404).json({ msg: "User not found" });

    const result = await askQuestion({
      question: req.body.question,
      topics: req.body.topics,
      requester,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

// @route   POST api/doors
// @desc    Create a door. New doors start inactive until explicitly switched on.
router.post("/", auth, async (req, res) => {
  try {
    const owner = {
      _id: req.user.id,
      name: req.body.name,
      role: req.body.role,
    };
    // The role in the request body is never trusted. Load the signed-in user.
    const User = require("../../models/User");
    const current = await User.findById(req.user.id).select("name role").lean();
    if (!current) return res.status(404).json({ msg: "User not found" });
    owner.role = current.role;
    owner.name = current.name;

    const door = await createDoor(owner, req.body);
    res.status(201).json(door);
  } catch (err) {
    sendError(res, err);
  }
});

// @route   PATCH api/doors/:id/active
// @desc    Switch a door on or off. Only the owner can change it.
router.patch("/:id/active", auth, async (req, res) => {
  try {
    const door = await setDoorActive(req.user.id, req.params.id, req.body.active);
    res.json(door);
  } catch (err) {
    sendError(res, err);
  }
});

// @route   POST api/doors/:id/request
// @desc    Ask for a slot on an active door. Students only.
router.post("/:id/request", auth, async (req, res) => {
  try {
    const User = require("../../models/User");
    const requester = await User.findById(req.user.id)
      .select("name role")
      .lean();
    if (!requester) return res.status(404).json({ msg: "User not found" });

    const request = await requestDoor({
      doorId: req.params.id,
      requester,
      message: req.body.message,
    });
    res.status(201).json(request);
  } catch (err) {
    sendError(res, err);
  }
});

// @route   PUT api/doors/requests/:id/transition
// @desc    Accept, decline, complete or cancel a door request
router.put("/requests/:id/transition", auth, async (req, res) => {
  try {
    const request = await transitionRequest({
      requestId: req.params.id,
      actorId: req.user.id,
      status: String(req.body.status || "").toLowerCase(),
      answerText: req.body.answerText,
    });
    res.json(request);
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;
