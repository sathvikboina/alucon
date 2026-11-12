const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");



const UserSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	role: {
		type: String,
		required: true,
	},
	linkedinId:{
       type: String,
	   unique: true,
	   sparse: true
	},
	email: {
		type: String,
		required: true,
		unique: true,
	},
	password: {
		type: String,
		required: true,
		// Never return the hash by default. Login and password-reset code opt
		// back in explicitly with .select("+password").
		select: false,
	},
	avatar: {
		type: String,
	},
	blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
	online:{
      type:Boolean,
	  default:false
	},
	isAdmin: {
		type: Boolean,
		default: false,
	},
	adminType: {
		type: String,
		required: false,
	},
	blocked: {
		type: Boolean,
		default: false,
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
	// Opt-in: a member's city is included only in aggregate BATCH counts when
	// this is true. Legacy accounts stay opted out.
	show_city: {
		type: Boolean,
		default: false,
	},
	designation: {
		type: String,
		required: false,
	},
	working_area: {
		type: String,
		required: false,
	},
	notificationID :{
		type : Number
	},
	images: [String],
	skills: {
		type: [String],
		required: false,
	},
	bio: {
		type: String,
	},
	// Matching preferences. Missing values are inferred conservatively so the
	// demo works for existing accounts, but members can set them explicitly.
	mentorship: {
		// Opt-in: new and legacy accounts are not mentors until they enable it.
		available: { type: Boolean, default: false },
		areas: [{ type: String }],
		capacity: { type: Number, default: 3 },
		mode: { type: String, default: "Remote" },
	},
	mentee_goals: [{ type: String }],
	internship_preferences: {
		types: [{ type: String }],
		work_modes: [{ type: String }],
		locations: [{ type: String }],
	},
	followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
	followings: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
	// Opt-in: a member never appears as a connector or warm-path endpoint until
	// they explicitly enable this. Legacy accounts stay opted out.
	connector_opt_in: {
		type: Boolean,
		default: false,
	},
	NotificationID : {
		type : Number,
		default : 0
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
	company: {
		type: String,
	},
	website: {
		type: String,
	},
	status: {
		type: String,
		required: false,
	},
	githubusername: {
		type: String,
	},
});


const adminData = new mongoose.model("user", UserSchema);
// const fun = async() =>{

// 	const salt = await bcrypt.genSalt(10);
// 	const pass = await bcrypt.hash("alumni123#", salt);
// 	const ppp = await new adminData({
// 		email: "iiita.alumniconnect@gmail.com",
// 		password: pass,
// 		isAdmin: true,
// 		adminType : "head",
// 		name: "AlumniConnect",
// 		role :"Admin"
// 	})
// 	const updating2 = await ppp.save();
// }

// 	fun();
// The first head admin is created from environment variables. Local
// development falls back to the shared demo password; production must set
// ADMIN_EMAIL and ADMIN_PASSWORD explicitly, otherwise no admin is created.
// This stops a deployed instance from ever having a known-password account.
const ADMIN_EMAIL =
	process.env.ADMIN_EMAIL || "iiita.alumniconnect@gmail.com";
const ADMIN_PASSWORD =
	process.env.ADMIN_PASSWORD ||
	(process.env.NODE_ENV === "production" ? null : "alumni123#");

const fun = async () => {
	const existingAdmin = await adminData.findOne({ email: ADMIN_EMAIL });

	if (existingAdmin) {
		console.log("Admin already exists");
		return;
	}

	const salt = await bcrypt.genSalt(10);
	const pass = await bcrypt.hash(ADMIN_PASSWORD, salt);

	const admin = new adminData({
		email: ADMIN_EMAIL,
		password: pass,
		isAdmin: true,
		adminType: "head",
		name: "AlumniConnect",
		role: "Admin",
	});

	await admin.save();
	console.log(`Admin created for ${ADMIN_EMAIL}`);
};

// The bootstrap is skipped in tests (avoids a buffered Mongo query with no
// connection) and in production unless an admin password was supplied.
if (process.env.NODE_ENV !== "test") {
	if (ADMIN_PASSWORD) {
		fun().catch((err) =>
			console.error("Admin bootstrap skipped:", err.message)
		);
	} else {
		console.warn(
			"Admin bootstrap skipped: set ADMIN_EMAIL and ADMIN_PASSWORD to create the first head admin."
		);
	}
}
	
	UserSchema.index({ "$**": "text" });
	module.exports = mongoose.model("user", UserSchema);
