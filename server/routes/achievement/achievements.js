const express = require("express");
const router = express.Router();
const Achievement = require("../../models/Achievement");
const FeaturedAchievement = require("../../models/FeaturedAchievement");
const authenticate = require("../../middleware/auth"); // default export
const { Parser } = require("json2csv");
const User = require("../../models/User"); 
const escapeRegex = require("../../middleware/utils/escapeRegex");

// ─── Role helpers (matches your JWT: { id, isAdmin, adminType, role }) ────────
const isAdmin     = (u) => u?.isAdmin === true;
const isHeadAdmin = (u) => u?.isAdmin === true && u?.adminType === "head";
const isSubmitter = (u) => !u?.isAdmin; // any non-admin can submit

// ─── GET /achievements ── browse approved achievements (all authenticated) ───
router.get("/",  async (req, res) => {
  try {
    const { category, recipientType, search, page = 1, limit = 12 } = req.query;

    const filter = { status: "approved" };
    if (category)      filter.category = category;
    if (recipientType) filter.recipientType = recipientType;
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { title:         { $regex: safeSearch, $options: "i" } },
        { recipientName: { $regex: safeSearch, $options: "i" } },
        { awardingBody:  { $regex: safeSearch, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [achievements, total] = await Promise.all([
      Achievement.find(filter)
        .populate("category", "name slug icon color")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Achievement.countDocuments(filter),
    ]);

    res.json({ achievements, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─── GET /achievements/my ── own submissions ──────────────────────────────────
router.get("/my", authenticate, async (req, res) => {
  try {
    const achievements = await Achievement.find({ submittedBy: req.user.id })
      .populate("category", "name slug icon color")
      .sort({ createdAt: -1 });
    res.json({ achievements });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─── GET /achievements/pending ── admin review queue ─────────────────────────
router.get("/pending", authenticate, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Admins only" });
  }
  try {
    const achievements = await Achievement.find({ status: "pending" })
      .populate("category", "name slug")
      .populate("submittedBy", "name email")
      .sort({ createdAt: 1 });
    res.json({ achievements });
  } catch (err) {
    console.error("❌ /pending error:", err); // ADD THIS
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─── GET /achievements/download ── HEAD ADMIN only ───────────────────────────
router.get("/download", authenticate, async (req, res) => {
  if (!isHeadAdmin(req.user)) {
    return res.status(403).json({ message: "Head admin only" });
  }
  try {
    const { status, recipientType, category, format = "csv" } = req.query;

    const filter = {};
    if (status)        filter.status = status;
    if (recipientType) filter.recipientType = recipientType;
    if (category)      filter.category = category;

    const achievements = await Achievement.find(filter)
      .populate("category", "name")
      .populate("submittedBy", "name email")
      .populate("approvedBy", "name email")
      .lean();

    const rows = achievements.map((a) => ({
      ID:             a._id.toString(),
      Title:          a.title,
      Recipient:      a.recipientName,
      RecipientType:  a.recipientType,
      Email:          a.email || "",
      CourseName:     a.courseName || "",
      PassoutYear:    a.passoutYear || "",
      CurrentDesignation: a.currentDesignation || "",
      CurrentOrganization: a.currentOrganization || "",
      HigherQualification: a.higherQualification || "",
      ContactPhone:   a.contactPhone || "",
      AwardPeriod:    a.awardPeriod || "",
      RollNumber:     a.rollNumber || "",
      Category:       a.category?.name || "",
      AwardingBody:   a.awardingBody || "",
      AchievementDate: a.achievementDate ? new Date(a.achievementDate).toISOString().split("T")[0] : "",
      Status:         a.status,
      IsFeatured:     a.isFeatured ? "Yes" : "No",
      Tags:           (a.tags || []).join("; "),
      SubmittedBy:    a.submittedBy?.name || "",
      SubmitterEmail: a.submittedBy?.email || "",
      ApprovedBy:     a.approvedBy?.name || "",
      ApprovedAt:     a.approvedAt ? new Date(a.approvedAt).toISOString().split("T")[0] : "",
      CreatedAt:      new Date(a.createdAt).toISOString().split("T")[0],
    }));

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=achievements.json");
      return res.json(rows);
    }

    const parser = new Parser({ fields: Object.keys(rows[0] || {}) });
    const csv = parser.parse(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=achievements.csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─── GET /achievements/:id ── single achievement ──────────────────────────────
router.get("/:id", authenticate, async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id)
      .populate("category", "name slug icon color")
      .populate("submittedBy", "name")
      .populate("approvedBy", "name");

    if (!achievement) return res.status(404).json({ message: "Not found" });

    const admin = isAdmin(req.user);
    const isOwner = achievement.submittedBy?._id.toString() === req.user.id;
    if (achievement.status !== "approved" && !admin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ achievement });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─── POST /achievements ── submit (any logged-in user) ───────────────────────
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      awardingBody,
      achievementDate,
      imageUrl,
      proofDocumentUrl,
      tags,
      email,
      recipientName: submittedName,
      courseName,
      passoutYear,
      currentDesignation,
      currentOrganization,
      higherQualification,
      contactPhone,
      awardPeriod,
      rollNumber,
    } = req.body;

    const admin = isAdmin(req.user);

    const userDoc = await User.findById(req.user.id)
      .select("name email program passing_year designation organisation location");

    const recipientType =
      req.user.role === "faculty" || req.user.role === "professor"
        ? "faculty"
        : "alumni";

    const achievement = await Achievement.create({
      title,
      description,
      recipientType,
      recipient: req.user.id,
      recipientName: submittedName || userDoc?.name || "Unknown",
      email: email || userDoc?.email || "",
      courseName: courseName || userDoc?.program || "",
      passoutYear: passoutYear || userDoc?.passing_year || "",
      currentDesignation: currentDesignation || userDoc?.designation || "",
      currentOrganization:
        currentOrganization ||
        [userDoc?.organisation, userDoc?.location].filter(Boolean).join(", ") ||
        "",
      higherQualification: higherQualification || "",
      contactPhone: contactPhone || "",
      awardPeriod: awardPeriod || "",
      rollNumber: rollNumber || "",
      category,
      awardingBody,
      achievementDate,
      imageUrl,
      proofDocumentUrl,
      tags,
      submittedBy: req.user.id,
      status: admin ? "approved" : "pending",
      ...(admin && { approvedBy: req.user.id, approvedAt: new Date() }),
    });

    res.status(201).json({ achievement });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─── PATCH /achievements/:id/approve ── admin approves ───────────────────────
router.patch("/:id/approve", authenticate, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Admins only" });
  }
  try {
    const achievement = await Achievement.findByIdAndUpdate(
      req.params.id,
      { status: "approved", approvedBy: req.user.id, approvedAt: new Date() },
      { new: true }
    ).populate("category", "name slug icon color");

    if (!achievement) return res.status(404).json({ message: "Not found" });
    res.json({ achievement });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─── PATCH /achievements/:id/reject ── admin rejects ─────────────────────────
router.patch("/:id/reject", authenticate, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Admins only" });
  }
  try {
    const { reason } = req.body;
    const achievement = await Achievement.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", rejectionReason: reason },
      { new: true }
    );
    if (!achievement) return res.status(404).json({ message: "Not found" });
    res.json({ achievement });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─── PUT /achievements/:id ── update ─────────────────────────────────────────
router.put("/:id", authenticate, async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) return res.status(404).json({ message: "Not found" });

    const admin   = isAdmin(req.user);
    const isOwner = achievement.submittedBy.toString() === req.user.id;

    if (!admin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (!admin && achievement.status === "approved") {
      return res.status(400).json({ message: "Cannot edit an approved achievement" });
    }

    const allowed = [
      "title", "description", "category", "awardingBody",
      "achievementDate", "imageUrl", "proofDocumentUrl", "tags",
      "email", "recipientName", "courseName", "passoutYear",
      "currentDesignation", "currentOrganization", "higherQualification",
      "contactPhone", "awardPeriod", "rollNumber",
    ];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) achievement[field] = req.body[field];
    });

    if (!admin) achievement.status = "pending";
    await achievement.save();
    res.json({ achievement });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─── DELETE /achievements/:id ── owner or head admin ─────────────────────────
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) return res.status(404).json({ message: "Not found" });

    const isOwner   = achievement.submittedBy.toString() === req.user.id;
    const headAdmin = isHeadAdmin(req.user);

    if (!isOwner && !headAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Achievement.findByIdAndDelete(req.params.id);
    await FeaturedAchievement.deleteOne({ achievement: req.params.id });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;