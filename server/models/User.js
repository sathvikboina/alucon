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
	friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
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
	followers: {
		type: Array,
		default: [],
	},
	followings: {
		type: Array,
		default: [],
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
	const fun = async () => {

 const existingAdmin = await adminData.findOne({
   email: "iiita.alumniconnect@gmail.com"
 });

 if (existingAdmin) {
   console.log("Admin already exists");
   return;
 }

 const salt = await bcrypt.genSalt(10);
 const pass = await bcrypt.hash("alumni123#", salt);

 const admin = new adminData({
   email: "iiita.alumniconnect@gmail.com",
   password: pass,
   isAdmin: true,
   adminType: "head",
   name: "AlumniConnect",
   role: "Admin"
 });

 await admin.save();
 console.log("Admin created");
}

// The default head admin is only bootstrapped outside the test runner. Keeping
// this side effect out of unit tests avoids a buffered Mongo query when no
// database connection is opened.
if (process.env.NODE_ENV !== "test") {
  fun().catch((err) => console.error("Admin bootstrap skipped:", err.message));
}
	
	UserSchema.index({ "$**": "text" });
	module.exports = mongoose.model("user", UserSchema);
