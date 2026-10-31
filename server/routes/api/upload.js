const express = require("express");
const auth = require("../../middleware/auth");
const router = express.Router();
const upload = require("../../middleware/upload");
const cloudinary = require("../../config/cloudinary");
const streamifier = require("streamifier");

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
      const result = await streamUpload(req.file.buffer, "SHOWCASE");
      const mediaType = detectMediaType(req.file.mimetype);
return res.json({ url: result.secure_url, mediaType, originalName: req.file.originalname });
      // return res.json({ url: result.secure_url });
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
        req.files.map((file) => streamUpload(file.buffer, "UPLOADS"))
      );
      return res.json({ images: urls.map((r) => r.secure_url) });
    } catch (error) {
      console.error("Multiple upload error:", error);
      return res.status(500).json({ msg: "Upload failed" });
    }
  });
});

module.exports = router;