const express = require("express");
const router = express.Router();
const FeaturedAchievement = require("../../models/FeaturedAchievement");
const Achievement = require("../../models/Achievement");
const authenticate = require("../../middleware/auth");

const isAdmin = (u) => u?.isAdmin === true;

// GET /featured-achievements
router.get("/", authenticate, async (req, res) => {
  try {
    const now = new Date();
    const featured = await FeaturedAchievement.find({
      $or: [{ featuredUntil: null }, { featuredUntil: { $gt: now } }],
    })
      .populate({
        path: "achievement",
        match: { status: "approved" },
        populate: { path: "category", select: "name slug icon color" },
      })
      .sort({ displayOrder: 1, createdAt: -1 });

    const filtered = featured.filter((f) => f.achievement !== null);
    res.json({ featured: filtered });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST /featured-achievements
router.post("/", authenticate, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Admins only" });
  }
  try {
    const { achievementId, displayOrder, featuredUntil, note } = req.body;

    const achievement = await Achievement.findById(achievementId);
    if (!achievement)
      return res.status(404).json({ message: "Achievement not found" });
    if (achievement.status !== "approved")
      return res.status(400).json({ message: "Only approved achievements can be featured" });

    const featured = await FeaturedAchievement.findOneAndUpdate(
      { achievement: achievementId },
      {
        achievement: achievementId,
        displayOrder: displayOrder || 0,
        featuredFrom: new Date(),
        featuredUntil: featuredUntil || null,
        featuredBy: req.user.id,
        note,
      },
      { upsert: true, new: true }
    ).populate({
      path: "achievement",
      populate: { path: "category", select: "name slug icon color" },
    });

    await Achievement.findByIdAndUpdate(achievementId, { isFeatured: true });
    res.status(201).json({ featured });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE /featured-achievements/:id
router.delete("/:id", authenticate, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Admins only" });
  }
  try {
    const featured = await FeaturedAchievement.findByIdAndDelete(req.params.id);
    if (!featured) return res.status(404).json({ message: "Not found" });
    await Achievement.findByIdAndUpdate(featured.achievement, { isFeatured: false });
    res.json({ message: "Removed from featured" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;