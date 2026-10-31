// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;

// const PostRequestSchema = new Schema({
// 	user: {
// 		type: Schema.Types.ObjectId,
// 		ref: "user",
// 	},
// 	heading: {
// 		type: String,
// 		required: true,
// 	},
// 	text: {
// 		type: String,
// 		required: true,
// 	},
// 	avatar: {
// 		type: String,
// 	},
// 	date: {
// 		type: Date,
// 		default: Date.now,
// 	},
// 	name: {
// 		type: String,
// 		required: true,
// 	},
// 	visibility: [
// 		{
// 			type: String,
// 		},
// 	],
// 	channel: {
// 		type: String,
// 		required: true,
// 	},
// 	images: [String]
// });

// module.exports = mongoose.model("post-requests", PostRequestSchema);
const mongoose = require("mongoose");

const PostRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  heading: String,
  text: String,
  visibleStudent: Boolean,
  visibleFaculty: Boolean,
  visibleAlumni: Boolean,
  channel: String,
  images: Array,
  status: {
    type: String,
    default: "pending", // pending / approved / rejected
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("post_requests", PostRequestSchema);