const express = require("express");
const router = express.Router();
const AchievementCategory = require("../../models/AchievementCategory");
const authenticate = require("../../middleware/auth");

const isAdmin = (u) => u?.isAdmin === true;

// GET /achievement-categories
router.get("/", authenticate, async (req, res) => {
  try {
    const categories = await AchievementCategory.find({ isActive: true }).sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST /achievement-categories
router.post("/", authenticate, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Admins only" });
  }
  try {
    const { name, description, icon, color } = req.body;
    const category = await AchievementCategory.create({
      name, description, icon, color,
      createdBy: req.user.id,
    });
    res.status(201).json({ category });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: "Category already exists" });
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PUT /achievement-categories/:id
router.put("/:id", authenticate, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Admins only" });
  }
  try {
    const category = await AchievementCategory.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ message: "Not found" });
    res.json({ category });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE /achievement-categories/:id
router.delete("/:id", authenticate, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Admins only" });
  }
  try {
    await AchievementCategory.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "Category deactivated" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;