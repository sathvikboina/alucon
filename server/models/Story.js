const mongoose = require("mongoose");

const StorySchema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
	text: { type: String, required: true },
	name: { type: String },
	image: { type: String },
	likes: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "user" } }],
	date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("story", StorySchema);
