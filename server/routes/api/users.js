const express = require("express");
const router = express.Router();
const gravatar = require("gravatar");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const auth = require("../../middleware/auth");
const authHeadAdmin = require("../../middleware/authHeadAdmin");
const JoinRequest = require("../../models/JoinRequest");
require("dotenv").config();
const sendEmail = require("../../middleware/utils/sendEmail");

// ✅ OTP STORE
const otpStore = new Map();


// ================= REGISTER (SEND OTP) =================
router.post(
  "/register",
  [
    check("name", "Name is required!").not().isEmpty(),
    check("email", "Valid email required").isEmail(),
    check("password", "Min 6 chars").isLength({ min: 6 }),
    check("role", "Role required").not().isEmpty(),

    // ✅ Academic fields validation
    check("program", "Program required for student/alumni").optional(),
    check("starting_year", "Starting year required").optional(),
    check("passing_year", "Passing year required").optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const {
      name,
      email,
      role,
      password,
      program,
      starting_year,
      passing_year,
      organisation,
      designation,
      location,
      department,
      working_area,
    } = req.body;

    try {
      // ✅ Check existing user
      const user = await User.findOne({ email });
      const existingRequest = await JoinRequest.findOne({ email });

      if (user)
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exists" }] });

      if (existingRequest)
        return res
          .status(400)
          .json({ errors: [{ msg: "Already requested" }] });

      // ✅ ROLE-BASED VALIDATION
      if ((role === "student" || role === "alumni")) {
        if (!program || !starting_year || !passing_year) {
          return res.status(400).json({
            errors: [{ msg: "Academic details are required" }],
          });
        }

        if (starting_year > passing_year) {
          return res.status(400).json({
            errors: [{ msg: "Invalid year range" }],
          });
        }
      }

      if (role === "alumni") {
        if (!organisation || !designation || !location) {
          return res.status(400).json({
            errors: [{ msg: "Alumni details required" }],
          });
        }
      }

      if (role === "faculty") {
        if (!designation || !department) {
          return res.status(400).json({
            errors: [{ msg: "Faculty details required" }],
          });
        }
      }

      // ✅ Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // ✅ Store OTP + FULL USER DATA
      otpStore.set(email, {
        otp,
        data: {
          name,
          email,
          role,
          password,
          program,
          starting_year,
          passing_year,
          organisation,
          designation,
          location,
          department,
          working_area,
        },
        expires: Date.now() + 5 * 60 * 1000,
        attempts: 0,
      });

      // ✅ Send OTP Email
      await sendEmail({
        to: email,
        subject: "OTP Verification - AlumniConnect",
        text: `Your OTP is ${otp}`,
        html: `
          <div style="font-family: Arial;">
            <h2>OTP Verification</h2>
            <p>Your OTP is:</p>
            <h1>${otp}</h1>
            <p>This OTP is valid for 5 minutes.</p>
          </div>
        `,
      });

      return res.json({ msg: "OTP sent successfully. If not received, please check your spam folder." });

    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);


// ================= VERIFY OTP =================
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const record = otpStore.get(email);

  if (!record) return res.status(400).json({ msg: "No OTP found" });

  if (record.expires < Date.now()) {
    otpStore.delete(email);
    return res.status(400).json({ msg: "OTP expired" });
  }

  if (record.otp !== otp) {
    record.attempts += 1;

    if (record.attempts >= 5) {
      otpStore.delete(email);
      return res.status(400).json({ msg: "Too many attempts" });
    }

    return res.status(400).json({ msg: "Invalid OTP" });
  }

  try {
    const data = record.data;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // ✅ Create JoinRequest NOW (after OTP)
    const request = new JoinRequest({
      ...data,
      password: hashedPassword,
    });

    await request.save();
    otpStore.delete(email);

    // ✅ Notify admin
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `${data.name} requested access`,
      text: `New verified join request from ${data.name}`,
    });

    res.json({ msg: "OTP verified, request sent for approval" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


// ================= RESEND OTP =================
router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;

  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ msg: "No request found" });

  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

  record.otp = newOtp;
  record.expires = Date.now() + 5 * 60 * 1000;
  record.attempts = 0;

  await sendEmail({
    to: email,
    subject: "Resent OTP",
    text: `Your new OTP is ${newOtp}`,
    html: `<h2>New OTP: ${newOtp}</h2>`,
  });

  res.json({ msg: "OTP resent" });
});


// ================= RESET OTP =================
router.post("/reset-otp", (req, res) => {
  const { email } = req.body;

  otpStore.delete(email);

  res.json({ msg: "OTP reset successful" });
});


// ================= OTHER ROUTES (UNCHANGED) =================

// GET CURRENT USER
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});


// MAKE ADMIN
router.get("/:id/make-admin", authHeadAdmin, async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isAdmin: true, adminType: "sub" },
    { new: true }
  );
  res.json(user);
});


// REMOVE ADMIN
router.get("/:id/remove-admin", authHeadAdmin, async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isAdmin: false, $unset: { adminType: "" } },
    { new: true }
  );
  res.json(user);
});


// @route    GET api/users/me
// @desc     get current user
// @access   Private

router.get("/me", auth, async (req, res) => {
	try {
		const user = await User.findById(req.user.id);
		res.json(user);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ msg: "Server Error in getting current user" });
	}
});
router.get("/search/:query", auth, async (req, res) => {
	try {
		const searchTerm = req.params.query;
		console.log(searchTerm);
		var users = [];
		if (searchTerm === "all") {
			users = await User.find().select("-password").sort({ date: -1 });
			console.log("inside get all user api");
			if (users) {
				console.log("NON ZERO USERS" + users.length);
			}
		} else {
			console.log("inside search users");
			users = await User.find({
				$or: [
					{ name: { $regex: searchTerm, $options: "i" } },
					{ email: { $regex: searchTerm, $options: "i" } },
					{ company: { $regex: searchTerm, $options: "i" } },
					{ organisation: { $regex: searchTerm, $options: "i" } },
				]
			}).select("-password").sort({ date: -1 });
			if (users) {
				console.log("NON zero search USERS" + users.length);
			}
		}
		res.json(users);
	} catch (err) {
		// console.error(err.message);
		res.status(500).json({ msg: "Server Error in getting all Users" });
	}
});

// @route    GET api/users/:user_id
// @desc     get user by id
// @access   Private

router.get("/:user_id", auth, async (req, res) => {
	try {
		const user = await User.findById(req.params.user_id).select(
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



// @route    GET api/users/:id/make-admin
// @desc     make admin
// @access   Private

router.get("/:id/make-admin", authHeadAdmin, async (req, res) => {
	try {
		const updatedUser = await User.findOneAndUpdate(
			{ _id: req.params.id },
			{ isAdmin: true, adminType: "sub" },
			{ new: true }
		);
		res.json(updatedUser);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ msg: "Server Error in Make Admin" });
	}
});

// @route    GET api/users/:id/remove-admin
// @desc     remove admin
// @access   Private

router.get("/:id/remove-admin", authHeadAdmin, async (req, res) => {
	try {
		const updatedUser = await User.findOneAndUpdate(
			{ _id: req.params.id },
			{ isAdmin: false, $unset: { adminType: "" } },
			{ new: true }
		);
		res.json(updatedUser);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ msg: "Server Error in Removing Admin" });
	}
});


// @route    DELETE api/users
// @desc     delete user and his posts
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

// @route    PUT api/users/experience
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

// @route    delete api/users/experience/:exp_id
// @desc     delete profile experience
// @access   Private

router.delete("/experience/:exp_id", auth, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select("-password");
		// get index of experience to remove
		const removeIndex = user.experience
			.map((item) => item.id)
			.indexOf(req.params.exp_id);

		user.experience.splice(removeIndex, 1);
		await user.save();
		res.json(user);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error in Deleting experience");
	}
});

// @route    PUT api/users/education
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

// @route    delete api/users/education/:edu_id
// @desc     delete profile education
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

// @route    GET api/users/:user_id/block
// @desc     Block a user given user_id
// @access   Private

router.get("/:id/block", authHeadAdmin, async (req, res) => {
	try {
		const updatedUser = await User.findOneAndUpdate(
			{ _id: req.params.id },
			{ blocked: true },
			{ new: true }
		);
		if (updatedUser === null) {
			res.json("user is coming null");
		}
		res.json(updatedUser);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ msg: "Server Error in Block User" });
	}
});

// @route    GET api/users/:user_id/unblock
// @desc     UnBlock a user given user_id
// @access   Private

router.get("/:id/unblock", authHeadAdmin, async (req, res) => {
	try {
		const updatedUser = await User.findOneAndUpdate(
			{ _id: req.params.id },
			{ blocked: false },
			{ new: true }
		);
		res.json(updatedUser);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ msg: "Server Error in Unblock user" });
	}
});

//get current user's friends
router.get("/friends/:userId", auth, async (req, res) => {
	try {
		const user = await User.findById(req.params.userId);
		if (!user) {
			return res
				.status(400)
				.json({ errors: [{ msg: "Current User not exists" }] });
		}
		
		// people who I follow and who follow me (common ones)
		let friend_IDs = user.followings.filter((x) =>
			user.followers.includes(x)
		);

		let friends = [];
		for (let i = 0; i < friend_IDs.length; i++) {
			const us = await User.findById(friend_IDs[i]).select("-password");
			friends.push(us);
		}
		res.status(200).json(friends);
	} catch (err) {
		res.status(500).json(err);
	}
});

//follow a user

router.put("/:id/follow", auth, async (req, res) => {
	if (req.user.id !== req.params.id) {
		try {
			const user = await User.findById(req.params.id);

			if (!user.followers.includes(req.user.id)) {
				const updated_profile = await User.findOneAndUpdate(
					{ _id: req.params.id },
					{ $push: { followers: req.user.id } },
					{ new: true }
				);

				const updated_current_user = await User.findOneAndUpdate(
					{ _id: req.user.id },
					{
						$push: { followings: req.params.id },
					},
					{ new: true }
				);

				res.status(200).json({
					followers: updated_profile.followers,
					followings: updated_current_user.followings,
				});
			} else {
				res.status(403).json("you allready follow this user");
			}
		} catch (err) {
			console.log(err);
			res.status(500).json(err);
		}
	} else {
		res.status(403).json("you cant follow yourself");
	}
});

//unfollow a user

router.put("/:id/unfollow", auth, async (req, res) => {
	if (req.user.id !== req.params.id) {
		try {
			const user = await User.findById(req.params.id);

			if (user.followers.includes(req.user.id)) {
				const updated_profile = await User.findOneAndUpdate(
					{ _id: req.params.id },
					{ $pull: { followers: req.user.id } },
					{ new: true }
				);
				const updated_current_user = await User.findOneAndUpdate(
					{ _id: req.user.id },
					{ $pull: { followings: req.params.id } },
					{ new: true }
				);
				res.status(200).json({
					followers: updated_profile.followers,
					followings: updated_current_user.followings,
				});
			} else {
				res.status(403).json("you dont follow this user");
			}
		} catch (err) {
			res.status(500).json(err);
		}
	} else {
		res.status(403).json("you cant unfollow yourself");
	}
});

router.get("/type/:user_type", auth, async (req, res) => {
	try {
		let users = null;
		if (req.params.user_type === "admin") {
			users = await User.find({ isAdmin: true }).select("-password").sort({ date: -1 });
		} else {
			users = await User.find({ role: req.params.user_type }).select(
				"-password"
			).sort({ date: -1 });
		}
		return res.status(200).json(users);
	} catch (err) {
		res.status(500).json("Server Error");
	}
});
module.exports = router;