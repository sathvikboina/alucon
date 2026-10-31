const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PostSchema = new Schema({
	created_by_user: {
		type: String,
		required: true
	},
	userID: {
		type: String,
		required: true
	},
	Job_name: {
		type: String,
		required: true,
	},
	Description: {
		type: String,
	},
	Link: {
		type: String,
	},
    Job_post_date: {
		type: Date,
	},
    Job_deadline: {
		type: Date,
	},

	// Additive fields used by the AI fit score and richer job cards.
	skills: [{ type: String }],
	location: { type: String },
	work_mode: { type: String },
	job_type: { type: String },

	// Matching fields. Skills and description are used to extract requirements;
	// the eligibility fields are hard constraints applied before ranking.
	requirements: [{ type: String }],
	eligible_programs: [{ type: String }],
	eligible_graduation_years: [{ type: String }],
	eligible_roles: [{ type: String }],
	duration: { type: String },
	stipend: { type: String },
	openings: { type: Number },
	is_active: { type: Boolean, default: true },
});

// PostSchema.index({ "$**": "text" });
module.exports = Job = mongoose.model("job", PostSchema);
