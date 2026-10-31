const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth"); // normal auth (NOT head admin)
const User = require("../../models/User");

// @route   GET api/directory/alumni
// @desc    Searchable alumni directory
// @access  Private (all logged-in users)
router.get("/alumni", auth, async (req, res) => {
  try {
    const { search, batch, company, domain, location } = req.query;

    let query = { role: "alumni" };

    // 🔍 Search (name / company / domain)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { organisation: { $regex: search, $options: "i" } },
        { working_area: { $regex: search, $options: "i" } },
      ];
    }

    // 🎯 Filters
    if (batch) query.passing_year = batch;
    if (company)
      query.organisation = { $regex: company, $options: "i" };
    if (domain)
      query.working_area = { $regex: domain, $options: "i" };
    if (location)
      query.location = { $regex: location, $options: "i" };

    const alumni = await User.find(query)
      .select(
        "name email avatar organisation working_area location passing_year"
      )
      .sort({ passing_year: -1 });

    res.json(alumni);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;