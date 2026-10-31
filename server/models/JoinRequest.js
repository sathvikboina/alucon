const mongoose = require("mongoose");
const Schema = mongoose.Schema

const JoinRequestSchema = new Schema({
	name: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
		unique: true
	},
	password: {
		type: String,
		required: true,
	},
	role: {
		type: String,
		required: true,
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
});

module.exports = mongoose.model("joinrequest", JoinRequestSchema);
