const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const { buildWarmPaths } = require("../../services/warmPaths");

const sendError = (res, err) => {
  console.error("[warm-paths]", err.message);
  res.status(500).json({ msg: "Server error" });
};

// @route   GET api/warm-paths
// @desc    Up to three deterministic two-hop paths to an active referral door
router.get("/", auth, async (req, res) => {
  try {
    const viewer = await User.findById(req.user.id)
      .select(
        "name avatar role designation organisation passing_year working_area followers followings connector_opt_in"
      )
      .lean();
    if (!viewer) return res.status(404).json({ msg: "User not found" });

    const result = await buildWarmPaths(viewer);
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

// @route   PATCH api/warm-paths/opt-in
// @desc    Explicitly opt in or out of appearing in warm-path results
router.patch("/opt-in", auth, async (req, res) => {
  try {
    if (typeof req.body.optIn !== "boolean") {
      return res.status(400).json({ msg: "optIn must be true or false" });
    }
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { connector_opt_in: req.body.optIn } },
      { new: true }
    ).select("connector_opt_in");
    if (!updated) return res.status(404).json({ msg: "User not found" });
    res.json({ connector_opt_in: updated.connector_opt_in });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;
