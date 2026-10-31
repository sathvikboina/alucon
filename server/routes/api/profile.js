const express = require("express");
const router = express.Router();
const config = require("config");
const auth = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");

const Profile = require("../../models/Profile");
const User = require("../../models/User");
const Post = require("../../models/Post");

// @route    GET api/profile/me
// @desc     get current user's profile
// @access   Private
router.get("/me", auth, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select("-password");
		if (!user) {
			return res.status(400).json({ msg: "User not found" });
		}

		res.json(user);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server error");
	}
});

// @route    POST api/profile/
// @desc     create/update current users profile
// @access   Private
router.post(
	"/",
	auth,
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			console.log("error1 = ", errors)
			return res.status(400).json({ errors: errors.array() });
		}

		const {
			organisation,
			website,
			bio,
			location,
			status,
			skills,
			githubusername,
			youtube,
			instagram,
			facebook,
			twitter,
			linkedin,
			timages
		} = req.body;

		// build profile object. The authenticated token is the only source of
		// identity: a caller can never update another member's profile.
		const profileFields = {};
		profileFields.user = req.user.id;

		if (organisation !== undefined) profileFields.organisation = organisation;
		if (website !== undefined) profileFields.website = website;
		if (location !== undefined) profileFields.location = location;
		if (bio !== undefined) profileFields.bio = bio;
		if (status !== undefined) profileFields.status = status;
		if (githubusername !== undefined) profileFields.githubusername = githubusername;
		if (timages && timages.length > 0) {
			console.log("img found", timages)
			profileFields.images = timages;
		}
		// if (skills) {
		// 	profileFields.skills = skills
		// 		.split(",")
		// 		.map((skill) => skill.trim());
		// }
		if (skills) {
			profileFields.skills = Array.isArray(skills)
				? skills
				: skills.split(",").map((skill) => skill.trim());
		}

		// Mentorship and matching preferences. These are optional so older
		// clients keep working; the matching service infers sensible defaults.
		const asList = (value) => {
			if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
			if (typeof value === "string") {
				return value.split(",").map((item) => item.trim()).filter(Boolean);
			}
			return [];
		};

		if (req.body.mentor_available !== undefined) {
			profileFields["mentorship.available"] =
				req.body.mentor_available === true || req.body.mentor_available === "true";
		}
		if (req.body.mentor_areas !== undefined) {
			profileFields["mentorship.areas"] = asList(req.body.mentor_areas);
		}
		if (req.body.mentor_capacity !== undefined && req.body.mentor_capacity !== "") {
			const capacity = Number(req.body.mentor_capacity);
			if (Number.isFinite(capacity)) profileFields["mentorship.capacity"] = Math.max(1, capacity);
		}
		if (req.body.mentor_mode !== undefined) {
			profileFields["mentorship.mode"] = req.body.mentor_mode;
		}
		if (req.body.mentee_goals !== undefined) {
			profileFields.mentee_goals = asList(req.body.mentee_goals);
		}
		if (req.body.internship_types !== undefined) {
			profileFields["internship_preferences.types"] = asList(req.body.internship_types);
		}
		if (req.body.internship_work_modes !== undefined) {
			profileFields["internship_preferences.work_modes"] = asList(req.body.internship_work_modes);
		}
		if (req.body.internship_locations !== undefined) {
			profileFields["internship_preferences.locations"] = asList(req.body.internship_locations);
		}

		// build social object
		profileFields.social = {};
		// profileFields.experience = [];
		// profileFields.education = [];
		if (youtube) profileFields.social.youtube = youtube;
		if (linkedin) profileFields.social.linkedin = linkedin;
		if (twitter) profileFields.social.twitter = twitter;
		if (facebook) profileFields.social.facebook = facebook;
		if (instagram) profileFields.social.instagram = instagram;

		try {
			let profile = await User.findById(req.user.id);

			// update
			if (profile) {
				profile = await User.findByIdAndUpdate(
					req.user.id,
					{ $set: profileFields },   // $set is safer — only updates provided fields
					{ new: true, runValidators: true }
				).select("-password");
				return res.json(profile);
			}
			else {
				console.log("User not found !!!!");
			}

			// create
			// profile = new User(profileFields);
			// await profile.save();
			// console.log("Created ",profileFields)
			res.json(profile);
		} catch (error) {
			console.error(error.message);
			res.status(500).json({
				msg: "Server Error in update/create profile",
			});
		}
	}
);

// @route    GET api/profile/
// @desc     get all Users
// @access   Public

router.get("/all", auth, async (req, res) => {
	try {
		console.log("All Users route");
		const users = await User.find().select("-password");
		res.json(users);
		// console.log(users);
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: "Server Error in getting all profiles" });
	}
});

// @route    GET api/profile/user/:user_id
// @desc     get user by id
// @access   Public

router.get("/:user_id", async (req, res) => {
	try {
		console.log("User id = ", req.params.user_id)
		const user = await Profile.findById(req.params.user_id).select(
			"-password"
		);

		if (!user) {

			return res.status(400).json({ msg: "User profile not found!" });
		}

		res.json(user);
	} catch (error) {
		console.error(error.message);
		if (error.kind == "ObjectId") {
			return res
				.status(400)
				.json({ msg: "catch block: Profile not found!" });
		}
		res.status(500).json({
			msg: "Server Error in catch block get user by id",
		});
	}
});

// @route    DELETE api/profile
// @desc     delete profile, user, posts
// @access   Private

router.delete("/", auth, async (req, res) => {
	try {
		await Post.deleteMany({ user: req.user.id });
		await User.findOneAndRemove({ _id: req.user.id });
		res.json({ msg: "User Deleted" });
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ msg: "Server Error in catch block delete" });
	}
});

// @route    PUT api/profile/experience
// @desc     add profile experience
// @access   Private

router.put(
	"/experience",
	[
		auth,
		[
			check("title", "Title is Required").not().isEmpty(),
			check("company", "Company name required").not().isEmpty(),
			check("from", "From date is required").not().isEmpty(),
		],
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { title, company, location, from, to, current, description } =
			req.body;

		const newExp = {
			title,
			company,
			location,
			from,
			to,
			current,
			description,
		};

		try {
			const user = await User.findById(req.user.id).select("-password");
			// unshift adds to beginning of array
			user.experience.unshift(newExp);
			await user.save();
			res.json(user);
		} catch (error) {
			console.error(error.message);
			res.status(500).send("Server Error in experience");
		}
	}
);

// @route    delete api/profile/experience/:exp_id
// @desc     delete profile experience
// @access   Private

router.delete("/experience/:exp_id", auth, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select("-password");
		// get index of experience to remove
		const removeIndex = user.experience.map((item) => item.id).indexOf(req.params.exp_id);

		user.experience.splice(removeIndex, 1);
		await user.save();
		res.json(user);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error in Deleting experience");
	}
});

// @route    PUT api/profile/education
// @desc     add education
// @access   Private

router.put(
	"/education",
	[
		auth,
		[
			check("school", "School is Required").not().isEmpty(),
			check("degree", "Degree is required").not().isEmpty(),
			check("fieldofstudy", "Field of Study is required").not().isEmpty(),
			check("from", "From date is required").not().isEmpty(),
		],
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}
		const { school, degree, fieldofstudy, from, to, current, description } =
			req.body;

		const newEducation = {
			school,
			degree,
			fieldofstudy,
			from,
			to,
			current,
			description,
		};

		try {
			const user = await User.findById(req.user.id).select("-password");
			// unshift adds to beginning of array
			user.education.unshift(newEducation);
			await user.save();
			res.json(user);
		} catch (error) {
			console.error(error.message);
			res.status(500).send("Server Error in education");
		}
	}
);

// @route    delete api/profile/education/:edu_id
// @desc     delete profile experience
// @access   Private

router.delete("/education/:edu_id", auth, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select("-password");
		// get index of experience to remove
		const removeIndex = user.education
			.map((item) => item.id)
			.indexOf(req.params.edu_id);

		user.education.splice(removeIndex, 1);
		await user.save();
		res.json(user);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error in Deleting Education");
	}
});

// router.get("/github/:username", (req, res) => {
// 	try {
// 		const options = {
// 			uri: `https://api.github.com/users/${
// 				req.params.username
// 			}/repos?per_page=5&sort=created:asc&client_id=${config.get(
// 				"githubClientId"
// 			)}&client_secret=${config.get("githubSecret")}`,
// 			method: "GET",
// 			headers: { "user-agent": "node.js" },
// 		};

// 		request(options, (error, response, body) => {
// 			if (error) console.log(error);
// 			if (response.statusCode !== 200) {
// 				return res.status(404).json({ msg: "Github User not found" });
// 			}
// 			res.json(JSON.parse(body));
// 		});
// 	} catch (err) {
// 		console.error(err.message);
// 		res.status(500).send("Server Error");
// 	}
// });

module.exports = router;
