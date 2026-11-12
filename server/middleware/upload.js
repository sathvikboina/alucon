const multer = require("multer");

// memoryStorage: files live in req.files[i].buffer
// No disk writes, no fs.unlinkSync needed anywhere
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
  fileFilter: function (req, file, cb) {
    const allowed = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported file type. Upload an image, PDF, Word or PowerPoint file."
        ),
        false
      );
    }
  },
});

module.exports = upload;