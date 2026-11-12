const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const auth = require("../../middleware/auth");
const router = express.Router();
const upload = require("../../middleware/upload");
const cloudinary = require("../../config/cloudinary");
const streamifier = require("streamifier");

const LOCAL_UPLOAD_DIR = path.join(__dirname, "../../uploads");

// Cloudinary is the production store, but local development often runs without
// credentials. Falling back to disk keeps image uploads usable instead of
// failing every request with "Must supply api_key".
const cloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const EXTENSION_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
};

// helper: stream buffer to Cloudinary
const streamUpload = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// helper: write the buffer under server/uploads and expose it via /uploads
const localUpload = async (buffer, mimetype, originalName) => {
  await fs.promises.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const extension =
    EXTENSION_BY_MIME[mimetype] || path.extname(originalName || "") || "";
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
  await fs.promises.writeFile(path.join(LOCAL_UPLOAD_DIR, filename), buffer);
  return { secure_url: `/uploads/${filename}` };
};

const storeFile = async (req, file, folder) => {
  if (cloudinaryConfigured()) {
    return streamUpload(file.buffer, folder);
  }
  return localUpload(file.buffer, file.mimetype, file.originalname);
};

// Return an absolute URL when the local fallback is used, so the client can
// display the image even when it is served from a different dev port.
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


router.post("/", auth, (req, res) => {
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
        url: absoluteUrl(req, result.secure_url),
        mediaType,
        originalName: req.file.originalname,
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ msg: "Upload failed" });
    }
  });
});

// POST /api/upload/multiple — up to 5 files
router.post("/multiple", auth, (req, res) => {
  upload.array("files", 5)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ msg: err.message });
    }
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ msg: "No files provided" });
      }
      const urls = await Promise.all(
        req.files.map((file) => storeFile(req, file, "UPLOADS"))
      );
      return res.json({
        images: urls.map((r) => absoluteUrl(req, r.secure_url)),
      });
    } catch (error) {
      console.error("Multiple upload error:", error);
      return res.status(500).json({ msg: "Upload failed" });
    }
  });
});

module.exports = router;
