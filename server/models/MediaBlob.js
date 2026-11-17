const mongoose = require("mongoose");

// Inline object store used when Cloudinary is not configured (for example on
// Vercel, where the filesystem is read-only). Keeping the bytes in MongoDB is
// not a CDN, but it makes attachments work on a deployment that otherwise
// rejects every upload with a 503.
//
// MongoDB caps a document at 16 MB, so callers must enforce a smaller limit.
const MediaBlobSchema = new mongoose.Schema(
	{
		filename: { type: String, default: "" },
		mimetype: { type: String, required: true },
		size: { type: Number, required: true },
		data: { type: Buffer, required: true },
		uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
	},
	{ timestamps: true }
);

MediaBlobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

module.exports = mongoose.model("media_blob", MediaBlobSchema);
