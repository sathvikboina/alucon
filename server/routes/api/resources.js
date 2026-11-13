const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const auth = require("../../middleware/auth");
const { rateLimit } = require("../../middleware/rateLimit");
const Resource = require("../../models/Resource");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const CloudinaryStorageModule = require("multer-storage-cloudinary");
const CloudinaryStorage =
  CloudinaryStorageModule.CloudinaryStorage || CloudinaryStorageModule;
const {
  queueSearchRefresh,
  removeSearchDocument,
} = require("../../services/searchIndex");


// ================= CLOUDINARY CONFIG =================
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// ================= STORAGE =================
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {

    let resourceType = "image";

    // PDFs should be raw
    if (file.mimetype === "application/pdf") {
      resourceType = "raw";
    }

    // Never derive the public id from the user-supplied filename. A random
    // id prevents path/metadata injection and guessable resource URLs.
    const extension = String(file.originalname || "")
      .toLowerCase()
      .match(/\.[a-z0-9]{1,8}$/)?.[0] || "";

    return {
      folder: "resources",
      resource_type: resourceType,
      public_id: `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${extension}`
    };
  }
});

const upload = multer({
  storage,
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

    const resource = new Resource({
      title,
      topic,
      fileUrl: req.file.path,
      filePublicId: req.file.filename,
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


    await cloudinary.uploader.destroy(
      resource.filePublicId,
      {
        resource_type: resourceType
      }
    );


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