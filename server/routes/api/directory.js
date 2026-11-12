const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth"); // normal auth (NOT head admin)
const User = require("../../models/User");
const { companySlugMap } = require("../../services/companies");
const escapeRegex = require("../../middleware/utils/escapeRegex");

const DEFAULT_PAGE_SIZE = 40;
const MAX_PAGE_SIZE = 40;

const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

// @route   GET api/directory/alumni
// @desc    Searchable alumni directory
// @access  Private (all logged-in users)
router.get("/alumni", auth, async (req, res) => {
  try {
    const { search, batch, company, domain, location } = req.query;
    const page = positiveInt(req.query.page, 1);
    const pageSize = Math.min(
      positiveInt(req.query.pageSize, DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    );

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
    // Filters run before skip/limit so total reflects the filtered set.
    const total = await User.countDocuments(query);
    const alumni = await User.find(query)
      .select("name avatar organisation working_area location passing_year")
      .sort({ passing_year: -1, _id: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    // Link each card to its company hub without changing the stored profile.
    const slugByName = await companySlugMap(
      alumni.map((person) => person.organisation).filter(Boolean)
    );

    const items = alumni.map((person) => ({
      ...person.toObject(),
      companySlug: slugByName.get(person.organisation) || "",
    }));

    res.json({
      items,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;