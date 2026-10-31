const mongoose = require("mongoose");

const ResourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  topic: { type: String, required: true },
  fileUrl: { type: String, required: true },

  // 🔥 MUST HAVE
  filePublicId: { type: String, required: true },

  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("resource", ResourceSchema);