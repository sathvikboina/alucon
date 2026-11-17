const express = require("express");
const auth = require("../../middleware/auth");
const { rateLimit } = require("../../middleware/rateLimit");
const router = express.Router();
const upload = require("../../middleware/upload");
const { storeBuffer } = require("../../services/mediaStore");

// Per-account upload budget. The limit is high enough for normal posting but
// stops one authenticated account from filling memory/disk or Cloudinary quota.
const uploadLimiter = rateLimit({
  scope: "upload",
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: "Too many uploads. Please try again later.",
  key: (req) => req.user?.id || req.ip || "unknown",
});

// Cloudinary returns an absolute URL; the inline (MongoDB) store returns a
// path, which must be expanded to an absolute URL for the client.
const absoluteUrl = (req, url) => {
  if (!url || !url.startsWith("/")) return url;
  return `${req.protocol}://${req.get("host")}${url}`;
};

//detect media type
const detectMediaType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  return "file";
};

const storeFile = (req, file, folder) =>
  storeBuffer({
    buffer: file.buffer,
    mimetype: file.mimetype,
    originalName: file.originalname,
    folder,
    baseUrl: `${req.protocol}://${req.get("host")}`,
    uploadedBy: req.user?.id,
  });

router.post("/", auth, uploadLimiter, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      // multer errors (file too large, wrong type, etc.)
      return res.status(400).json({ msg: err.message });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ msg: "No file provided" });
      }
      const result = await storeFile(req, req.file, "SHOWCASE");
      const mediaType = detectMediaType(req.file.mimetype);
      return res.json({
        url: absoluteUrl(req, result.url),
        mediaType,
        originalName: req.file.originalname,
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res
        .status(error.status || 500)
        .json({ msg: error.status ? error.message : "Upload failed" });
    }
  });
});

// POST /api/upload/multiple — up to 5 files
router.post("/multiple", auth, uploadLimiter, (req, res) => {
  upload.array("files", 5)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ msg: err.message });
    }
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ msg: "No files provided" });
      }
      const results = await Promise.all(
        req.files.map((file) => storeFile(req, file, "UPLOADS"))
      );
      return res.json({
        images: results.map((r) => absoluteUrl(req, r.url)),
        media: results.map((r, index) => ({
          url: absoluteUrl(req, r.url),
          mediaType: detectMediaType(req.files[index].mimetype),
          originalName: req.files[index].originalname,
        })),
      });
    } catch (error) {
      console.error("Multiple upload error:", error);
      return res
        .status(error.status || 500)
        .json({ msg: error.status ? error.message : "Upload failed" });
    }
  });
});

module.exports = router;
