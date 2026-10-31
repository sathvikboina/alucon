const mongoose = require("mongoose");

const FeedBackSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
	},
	role: {
        type: String,
        required: true,
    },
    feedback: {
        type: String,
        required: true,
    },
	date: {
		type: Date,
		default: Date.now,
	},
});

module.exports = FeedBack = mongoose.model("feedback", FeedBackSchema);
