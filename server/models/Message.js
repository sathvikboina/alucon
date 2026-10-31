const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
	{
		conversation: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "conversation",
			required: true,
		},
		sender: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "user",
			required: true,
		},
		text: { type: String },
		media: { type: String },       // URL to uploaded file/image
		mediaType: {
			type: String,
			enum: ["image", "video", "file", "audio", null],
			default: null,
		},

		// ✅ Read receipts
		readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],

		// ✅ Reactions: [{ userId, emoji }]
		reactions: [
			{
				user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
				emoji: { type: String },
			},
		],

		// ✅ Soft-delete per user (e.g. "delete for me")
		deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],

		// ✅ Reply-to support
		replyTo: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "message",
			default: null,
		},

		// ✅ Edited flag
		isEdited: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

// ✅ Critical: index on conversation + createdAt for fast paginated fetches
MessageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model("message", MessageSchema);