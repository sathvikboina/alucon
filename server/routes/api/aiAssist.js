const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const { rateLimit } = require("../../middleware/rateLimit");
const {
  AssistError,
  draftDoorRequest,
  importProfileText,
} = require("../../services/aiAssist");

const sendError = (res, err) => {
  if (err instanceof AssistError) {
    return res.status(err.status).json({ msg: err.message });
  }
  console.error("[ai-assist]", err.message);
  return res.status(500).json({ msg: "Server error" });
};

// Model calls cost time and quota, so each member gets a small hourly budget.
// The two assists share one counter.
const assistLimiter = rateLimit({
  scope: "ai-assist",
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: "Too many AI assist requests. Please try again later.",
  key: (req) => String(req.user?.id || ""),
});

// @route   POST api/ai/assist/door-request
// @desc    Draft an editable message for an open door; nothing is sent
router.post("/door-request", auth, assistLimiter, async (req, res) => {
  try {
    const requester = await User.findById(req.user.id)
      .select(
        "name role program passing_year skills mentee_goals"
      )
      .lean();
    if (!requester) return res.status(404).json({ msg: "User not found" });

    const draft = await draftDoorRequest({
      doorId: req.body?.doorId,
      requester,
      hint: req.body?.hint,
    });
    res.json(draft);
  } catch (err) {
    sendError(res, err);
  }
});

// @route   POST api/ai/assist/profile-import
// @desc    Extract editable profile fields from pasted CV / LinkedIn text
router.post("/profile-import", auth, assistLimiter, async (req, res) => {
  try {
    if (req.body?.consent !== true) {
      return res.status(400).json({
        msg: "Confirm that you want to extract fields from this text",
      });
    }

    const result = await importProfileText({
      profileText: req.body?.profileText,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;
