const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PostSchema = new Schema({
	user: {
		type: Schema.Types.ObjectId,
		ref: "user",
	},
	heading: {
		type: String,
		required: true,
	},
	text: {
		type: String,
		required: true,
	},
	name: {
		type: String,
	},
	avatar: {
		type: String,
	},
	visibility: [
		{
			type: String,
		},
	],
	likes: [
		{
			user: {
				type: Schema.Types.ObjectId,
				ref: "user",
			},
		},
	],
	channel: {
		type: String,
		required: true,
	},
	// Set when the post is a discussion inside a community group. Group posts
	// are deliberately kept out of the main feed and AI briefing; readers reach
	// them through /api/groups/:id/discussions.
	group: {
		type: Schema.Types.ObjectId,
		ref: "group",
		default: null,
	},
	dislikes: [
		{
			user: {
				type: Schema.Types.ObjectId,
				ref: "user",
			},
		},
	],
	comments: [
		{
			user: {
				type: Schema.Types.ObjectId,
				ref: "user",
			},
			text: {
				type: String,
				required: true,
			},
			name: {
				type: String,
			},
			avatar: {
				type: String,
			},
			date: {
				type: Date,
				default: Date.now,
			},
		},
	],
	images: [String],
	date: {
		type: Date,
		default: Date.now,
	},
});

PostSchema.index({ "$**": "text" });
PostSchema.index({ group: 1, date: -1 });
module.exports = Post = mongoose.model("post", PostSchema);
