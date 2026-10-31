const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
	{
		isGroup: { type: Boolean, default: false },
		groupName: { type: String },
		groupAvatar: { type: String },
		groupAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
		members: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],

		// ✅ Fixed: actually updated on every new message (was never updated before)
		lastMessage: { type: String, default: "" },
		lastMessageAt: { type: Date, default: null },
		lastMessageSender: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "user",
			default: null,
		},

		// ✅ Muted members list (per-user mute)
		mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
	},
	{ timestamps: true } // ✅ adds createdAt + updatedAt automatically
);

// ✅ Index for sidebar query: "get all my conversations sorted by latest message"
ConversationSchema.index({ members: 1, lastMessageAt: -1 });

module.exports = mongoose.model("conversation", ConversationSchema);