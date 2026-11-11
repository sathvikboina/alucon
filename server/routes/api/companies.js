const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const { getCompanyHub } = require("../../services/companies");

// The company hub is readable without signing in, the same way the job board
// is. When a token is present, matching is personalised for that member.
function optionalUserId(req) {
  const token = req.header("x-auth-token");
  if (!token) return null;
  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET
    );
    return decoded?.user?.id || null;
  } catch (err) {
    return null;
  }
}

// @route   GET api/companies/:slug
// @desc    One company hub: jobs, signals, current and past alumni, active doors
router.get("/:slug", async (req, res) => {
  try {
    const userId = optionalUserId(req);
    const viewer = userId ? await User.findById(userId).lean() : null;

    const hub = await getCompanyHub(req.params.slug, { viewer });
    if (!hub) return res.status(404).json({ msg: "Company not found" });
    res.json(hub);
  } catch (err) {
    console.error("[companies]", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
