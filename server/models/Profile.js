const mongoose = require("mongoose");

const ProfileSchema = new mongoose.Schema({
	user: {
		type: mongoose.Types.ObjectId,
		ref: "user",
	},
	company: {
		type: String,
	},
	website: {
		type: String,
	},
	location: {
		type: String,
	},
	status: {
		type: String,
		required: false,
	},
	skills: {
		type: [String],
		required: false,
	},
	bio: {
		type: String,
	},
	githubusername: {
		type: String,
	},
	program: {
		type: String,
		required: false,
	},
	starting_year: {
		type: String,
		required: false,
	},
	passing_year: {
		type: String,
		required: false,
	},
	organisation: {
		type: String,
		required: false,
	},
	department: {
		type: String,
		required: false,
	},
	location: {
		type: String,
		required: false,
	},
	designation: {
		type: String,
		required: false,
	},
	working_area: {
		type: String,
		required: false,
	},
	experience: [
		{
			title: {
				type: String,
				required: true,
			},
			company: {
				type: String,
				required: true,
			},
			website: {
				type: String,
			},
			location: {
				type: String,
			},
			from: {
				type: Date,
				required: true,
			},
			to: {
				type: Date,
			},
			current: {
				type: Boolean,
				default: false,
			},
			description: {
				type: String,
			},
		},
	],
	education: [
		{
			school: {
				type: String,
				required: true,
			},
			degree: {
				type: String,
				required: true,
			},
			fieldofstudy: {
				type: String,
				required: true,
			},
			from: {
				type: Date,
				required: true,
			},
			to: {
				type: Date,
			},
			current: {
				type: Boolean,
				default: false,
			},
			description: {
				type: String,
			},
		},
	],
	social: {
		youtube: {
			type: String,
		},
		linkedin: {
			type: String,
		},
		twitter: {
			type: String,
		},
		facebook: {
			type: String,
		},
		instagram: {
			type: String,
		},
	},
	date: {
		type: Date,
		default: Date.now,
	},
});

module.exports = Profile = mongoose.model("profile", ProfileSchema);
