const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const auth = require("../../middleware/auth");
const { rateLimit } = require("../../middleware/rateLimit");
const Resource = require("../../models/Resource");
const multer = require("multer");
const {
  storeBuffer,
  destroyMedia,
} = require("../../services/mediaStore");
const {
  queueSearchRefresh,
  removeSearchDocument,
} = require("../../services/searchIndex");

// Files are held in memory and handed to the shared media store, which uses
// Cloudinary when configured and the inline MongoDB store on Vercel.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Unsupported file type"));
  },
});


const resourceUploadLimiter = rateLimit({
  scope: "resource-upload",
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: "Too many resource uploads. Please try again later.",
  key: (req) => req.user?.id || req.ip || "unknown",
});

// ================= UPLOAD =================
router.post("/upload", auth, resourceUploadLimiter, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ msg: err.message });
    }
    try {

    const { title, topic } = req.body;

    if (!req.file) {
      return res.status(400).json({
        msg: "No file uploaded"
      });
    }

    const stored = await storeBuffer({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
      folder: "resources",
      baseUrl: `${req.protocol}://${req.get("host")}`,
      uploadedBy: req.user.id,
    });

    const resource = new Resource({
      title,
      topic,
      fileUrl: stored.url,
      filePublicId: stored.publicId,
      uploadedBy: req.user.id
    });

    await resource.save();
    queueSearchRefresh("resource", resource._id);

    res.json(resource);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
  });
});


// ================= GET =================
router.get("/", async (req, res) => {
  try {

    const { topic } = req.query;

    const filter = topic
      ? { topic }
      : {};

    const resources = await Resource.find(filter)
      .populate("uploadedBy", ["name", "_id"])
      .sort({ createdAt: -1 });

    res.json(resources);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


// ================= DELETE =================
router.delete("/:id", auth, async (req, res) => {
  try {

    const resource = await Resource.findById(
      req.params.id
    );

    if (!resource) {
      return res.status(404).json({
        msg: "Resource not found"
      });
    }

    if (
      resource.uploadedBy.toString() !== req.user.id
    ) {
      return res.status(401).json({
        msg: "Not authorized"
      });
    }


    // Decide whether image or raw
    const resourceType =
      resource.fileUrl.includes("/raw/")
        ? "raw"
        : "image";

    await destroyMedia(resource.filePublicId, { resourceType });


    await resource.deleteOne();
    await removeSearchDocument("resource", req.params.id);

    res.json({
      msg: "Resource deleted successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


module.exports = router;