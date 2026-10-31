const mongoose = require("mongoose");

const FriendRequestSchema = new mongoose.Schema({
	sender: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "user",
		required: true,
	},
	receiver: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "user",
		required: true,
	},
	status: {
		type: String,
		enum: ["pending", "accepted", "declined"],
		default: "pending",
	},
	createdAt: { type: Date, default: Date.now },
});

// ✅ Prevent duplicate requests at DB level and speed up lookup queries
FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
FriendRequestSchema.index({ receiver: 1, status: 1 });

module.exports = mongoose.model("friendRequest", FriendRequestSchema);