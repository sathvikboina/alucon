const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth"); // normal auth (NOT head admin)
const User = require("../../models/User");
const { companySlugMap } = require("../../services/companies");
const escapeRegex = require("../../middleware/utils/escapeRegex");

// @route   GET api/directory/alumni
// @desc    Searchable alumni directory
// @access  Private (all logged-in users)
router.get("/alumni", auth, async (req, res) => {
  try {
    const { search, batch, company, domain, location } = req.query;

    let query = { role: "alumni" };

    // 🔍 Search (name / company / domain)
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { organisation: { $regex: safeSearch, $options: "i" } },
        { working_area: { $regex: safeSearch, $options: "i" } },
      ];
    }

    // 🎯 Filters
    if (batch) query.passing_year = batch;
    if (company)
      query.organisation = { $regex: escapeRegex(company), $options: "i" };
    if (domain)
      query.working_area = { $regex: escapeRegex(domain), $options: "i" };
    if (location)
      query.location = { $regex: escapeRegex(location), $options: "i" };

    // Email stays private; members can reach out through the platform.
    const alumni = await User.find(query)
      .select("name avatar organisation working_area location passing_year")
      .sort({ passing_year: -1 });

    // Link each card to its company hub without changing the stored profile.
    const slugByName = await companySlugMap(
      alumni.map((person) => person.organisation).filter(Boolean)
    );
    res.json(
      alumni.map((person) => ({
        ...person.toObject(),
        companySlug: slugByName.get(person.organisation) || "",
      }))
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;