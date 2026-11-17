const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const gravatar = require("gravatar");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const auth = require("../../middleware/auth");
const authHeadAdmin = require("../../middleware/authHeadAdmin");
const JoinRequest = require("../../models/JoinRequest");
const OtpRequest = require("../../models/OtpRequest");
require("dotenv").config();
const sendEmail = require("../../middleware/utils/sendEmail");
const jwt = require("jsonwebtoken");
const { rateLimit } = require("../../middleware/rateLimit");
const {
	queueSearchRefresh,
	removeSearchDocument,
	removeSearchDocumentsForUser,
} = require("../../services/searchIndex");

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_TOKEN_TTL = "15m";

// Only these roles can be self-registered. Privileged roles are granted by an
// admin after approval and never copied from the registration payload.
const ALLOWED_ROLES = ["student", "alumni", "faculty"];

// Fields that are safe to show on another member's profile. Email, blocked
// lists, device IDs and matching preferences stay private to the owner.
const PUBLIC_USER_FIELDS = [
	"name",
	"avatar",
	"role",
	"program",
	"starting_year",
	"passing_year",
	"organisation",
	"department",
	"designation",
	"location",
	"working_area",
	"skills",
	"bio",
	"images",
	"experience",
	"education",
	"social",
	"website",
	"status",
	"githubusername",
	"company",
	"followers",
	"followings",
	"isAdmin",
	"adminType",
	"blocked",
	"online",
	"date",
	"mentorship.available",
].join(" ");

// Same response for new and already-registered addresses so the endpoint
// cannot be used to enumerate accounts.
const GENERIC_REGISTER_MESSAGE =
	"If these details are valid, an OTP has been sent. Check your inbox and spam folder.";

const normalizeEmail = (value) =>
	String(value || "").trim().toLowerCase().slice(0, 254);

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const hashOtp = (otp) =>
	crypto.createHash("sha256").update(String(otp)).digest("hex");

const otpMatches = (record, otp) => {
	if (!record?.otpHash) return false;
	const provided = hashOtp(otp);
	const stored = String(record.otpHash);
	if (stored.length !== provided.length) return false;
	return crypto.timingSafeEqual(
		Buffer.from(stored, "utf8"),
		Buffer.from(provided, "utf8")
	);
};

const otpKey = (req) =>
	`${req.ip || req.connection?.remoteAddress || "unknown"}:${normalizeEmail(req.body?.email)}`;

// One row per email. Upserting replaces any previous pending code so a resend
// cannot leave two valid OTPs behind.
const saveOtp = (email, fields) =>
	OtpRequest.findOneAndUpdate(
		{ email },
		{
			$set: {
				email,
				expiresAt: new Date(Date.now() + OTP_TTL_MS),
				attempts: 0,
				...fields,
			},
		},
		{ upsert: true, new: true, setDefaultsOnInsert: true }
	);

const registerLimiter = rateLimit({
	scope: "register",
	windowMs: 60 * 60 * 1000,
	max: 5,
	message: "Too many registration attempts. Please try again later.",
});

const verifyOtpLimiter = rateLimit({
	scope: "verify-otp",
	windowMs: 15 * 60 * 1000,
	max: 10,
	message: "Too many OTP attempts. Please request a new code later.",
});

const resendOtpLimiter = rateLimit({
	scope: "resend-otp",
	windowMs: 15 * 60 * 1000,
	max: 3,
	message: "Too many OTP resend requests. Please wait before trying again.",
	key: otpKey,
});

const resetOtpLimiter = rateLimit({
	scope: "reset-otp",
	windowMs: 15 * 60 * 1000,
	max: 10,
	message: "Too many OTP reset requests. Please wait before trying again.",
	key: otpKey,
});

function signOtpToken(email) {
	return jwt.sign(
		{ email: normalizeEmail(email), purpose: "otp-reset" },
		process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET,
		{ expiresIn: OTP_TOKEN_TTL }
	);
}

function verifyOtpToken(token, email) {
	if (!token) return false;
	try {
		const payload = jwt.verify(
			token,
			process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET
		);
		return (
			payload.purpose === "otp-reset" &&
			payload.email === normalizeEmail(email)
		);
	} catch (err) {
		return false;
	}
}


// ================= REGISTER (SEND OTP) =================
router.post(
  "/register",
  registerLimiter,
  [
    check("name", "Name is required!").not().isEmpty(),
    check("email", "Valid email required").isEmail(),
    check("password", "Password must be 10-128 characters")
      .isLength({ min: 10, max: 128 }),
    check("role", "Role must be student, alumni or faculty")
      .isIn(ALLOWED_ROLES),

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

    const email = normalizeEmail(req.body.email);
    const role = String(req.body.role || "").trim().toLowerCase();

    try {
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({
          errors: [{ msg: "Role must be student, alumni or faculty" }],
        });
      }

      // ✅ Check existing user / pending request without revealing which.
      const [user, existingRequest] = await Promise.all([
        User.findOne({ email }).select("_id").lean(),
        JoinRequest.findOne({ email }).select("_id").lean(),
      ]);
      const accountExists = Boolean(user || existingRequest);

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

      // ✅ Generate a cryptographically random OTP. Only its hash is stored;
      // the plaintext code exists just long enough to send the email.
      const otp = generateOtp();

      if (accountExists) {
        // Decoy record: an attacker cannot tell whether the address was
        // already registered. No OTP is delivered and no request is created.
        await saveOtp(email, {
          otpHash: hashOtp(otp),
          data: null,
          decoy: true,
        });
        return res.json({
          msg: GENERIC_REGISTER_MESSAGE,
          otp_token: signOtpToken(email),
        });
      }

      // Hash the password before keeping it in the OTP record.
      const hashedPassword = await bcrypt.hash(password, 10);

      // ✅ Store OTP hash + verified user data (password already hashed)
      await saveOtp(email, {
        otpHash: hashOtp(otp),
        data: {
          name,
          email,
          role,
          password: hashedPassword,
          program,
          starting_year,
          passing_year,
          organisation,
          designation,
          location,
          department,
          working_area,
        },
        decoy: false,
      });

      // ✅ Send OTP Email. A deployment without BREVO_API_KEY cannot deliver
      // mail, so fail loudly instead of claiming that a code was sent.
      const delivered = await sendEmail({
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

      if (!delivered) {
        await OtpRequest.deleteOne({ email });
        return res.status(503).json({
          msg: "Email delivery is not configured on this deployment. Ask the administrator to set BREVO_API_KEY.",
        });
      }

      return res.json({
        msg: GENERIC_REGISTER_MESSAGE,
        otp_token: signOtpToken(email),
      });

    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);


// ================= VERIFY OTP =================
router.post("/verify-otp", verifyOtpLimiter, async (req, res) => {
  const { email, otp } = req.body;

  const normalizedEmail = normalizeEmail(email);
  const record = await OtpRequest.findOne({ email: normalizedEmail });

  // Missing, expired and wrong codes all return the same message so the
  // endpoint does not reveal whether an address is already registered.
  if (!record) {
    return res.status(400).json({ msg: "Invalid or expired OTP" });
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await OtpRequest.deleteOne({ _id: record._id });
    return res.status(400).json({ msg: "Invalid or expired OTP" });
  }

  if (!otpMatches(record, otp)) {
    record.attempts += 1;

    if (record.attempts >= 5) {
      await OtpRequest.deleteOne({ _id: record._id });
      return res.status(400).json({ msg: "Too many attempts" });
    }

    await record.save();
    return res.status(400).json({ msg: "Invalid or expired OTP" });
  }

  if (record.decoy) {
    await OtpRequest.deleteOne({ _id: record._id });
    return res.json({ msg: "OTP verified, request sent for approval" });
  }

  try {
    const data = record.data;

    // ✅ Create JoinRequest NOW (after OTP). The password was hashed before
    // it was placed in the OTP record.
    const request = new JoinRequest(data);

    await request.save();
    await OtpRequest.deleteOne({ _id: record._id });

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
router.post("/resend-otp", resendOtpLimiter, async (req, res) => {
  const { email, otp_token } = req.body;

  if (!verifyOtpToken(otp_token, email)) {
    return res.status(401).json({ msg: "Invalid or expired OTP session" });
  }

  const normalizedEmail = normalizeEmail(email);
  const record = await OtpRequest.findOne({ email: normalizedEmail });
  if (!record) return res.status(400).json({ msg: "Invalid or expired OTP" });

  const newOtp = generateOtp();

  record.otpHash = hashOtp(newOtp);
  record.expiresAt = new Date(Date.now() + OTP_TTL_MS);
  record.attempts = 0;
  await record.save();

  // Do not deliver a fresh code for a decoy record; the address already has
  // an account or a pending request.
  if (!record.decoy) {
    const delivered = await sendEmail({
      to: normalizedEmail,
      subject: "Resent OTP",
      text: `Your new OTP is ${newOtp}`,
      html: `<h2>New OTP: ${newOtp}</h2>`,
    });
    if (!delivered) {
      return res.status(503).json({
        msg: "Email delivery is not configured on this deployment. Ask the administrator to set BREVO_API_KEY.",
      });
    }
  }

  res.json({ msg: "OTP resent", otp_token: signOtpToken(normalizedEmail) });
});


// ================= RESET OTP =================
router.post("/reset-otp", resetOtpLimiter, async (req, res) => {
  const { email, otp_token } = req.body;

  if (!verifyOtpToken(otp_token, email)) {
    return res.status(401).json({ msg: "Invalid or expired OTP session" });
  }

  await OtpRequest.deleteOne({ email: normalizeEmail(email) });

  res.json({ msg: "OTP reset successful" });
});


// ================= OTHER ROUTES (UNCHANGED) =================

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
		const searchTerm = String(req.params.query || "").trim().slice(0, 64);
		let users = [];

		if (!searchTerm) {
			return res
				.status(400)
				.json({ msg: "Search query is required" });
		}

		if (searchTerm === "all") {
			users = await User.find()
				.select(PUBLIC_USER_FIELDS)
				.sort({ date: -1 })
				.limit(200);
		} else {
			// Escape regex metacharacters so a query cannot change the match
			// semantics or trigger expensive backtracking.
			const safeTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			users = await User.find({
				$or: [
					{ name: { $regex: safeTerm, $options: "i" } },
					{ company: { $regex: safeTerm, $options: "i" } },
					{ organisation: { $regex: safeTerm, $options: "i" } },
				]
			})
				.select(PUBLIC_USER_FIELDS)
				.sort({ date: -1 })
				.limit(200);
		}

		res.json(users);
	} catch (err) {
		res.status(500).json({ msg: "Server Error in getting all Users" });
	}
});

// @route    GET api/users/following
// @desc     get the people the current user follows
// @access   Private

router.get("/following", auth, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).populate("followings", [
			"name",
			"avatar",
			"role",
			"program",
			"starting_year",
			"passing_year",
			"organisation",
			"location",
		]);

		if (!user) {
			return res.status(404).json({ msg: "User not found" });
		}

		res.json(user.followings);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ msg: "Server error in following list" });
	}
});

// @route    GET api/users/:user_id
// @desc     get user by id
// @access   Private

router.get("/:user_id", auth, async (req, res) => {
	try {
		const isSelf = String(req.params.user_id) === String(req.user.id);
		const canSeePrivate = isSelf || req.user.isAdmin === true;

		// Owners and admins get the editable profile; everyone else gets the
		// directory-safe projection so emails and private arrays never leak.
		const user = await User.findById(req.params.user_id).select(
			canSeePrivate ? "-password" : PUBLIC_USER_FIELDS
		);

		if (!user) {
			return res.status(400).json({ msg: "User profile not found!" });
		}

		res.json(user);
	} catch (error) {
		console.error(error.message);
		if (error.kind == "ObjectId") {
			return res.status(400).json({ msg: "Profile not found!" });
		}
		res.status(500).json({ msg: "Server Error" });
	}
});



// @route    POST api/users/:id/make-admin
// @desc     make admin
// @access   Private

router.post("/:id/make-admin", authHeadAdmin, async (req, res) => {
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

// @route    POST api/users/:id/remove-admin
// @desc     remove admin
// @access   Private

router.post("/:id/remove-admin", authHeadAdmin, async (req, res) => {
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
		await removeSearchDocumentsForUser(req.user.id);
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

// @route    POST api/users/:user_id/block
// @desc     Block a user given user_id
// @access   Private

router.post("/:id/block", authHeadAdmin, async (req, res) => {
	try {
		const updatedUser = await User.findOneAndUpdate(
			{ _id: req.params.id },
			{ blocked: true },
			{ new: true }
		);
		if (!updatedUser) {
			return res.status(404).json({ msg: "User not found" });
		}
		await removeSearchDocument("alumni", req.params.id);
		res.json(updatedUser);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ msg: "Server Error in Block User" });
	}
});

// @route    POST api/users/:user_id/unblock
// @desc     UnBlock a user given user_id
// @access   Private

router.post("/:id/unblock", authHeadAdmin, async (req, res) => {
	try {
		const updatedUser = await User.findOneAndUpdate(
			{ _id: req.params.id },
			{ blocked: false },
			{ new: true }
		);
		queueSearchRefresh("alumni", req.params.id);
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
		const followerIds = new Set(user.followers.map((id) => id.toString()));
		let friend_IDs = user.followings.filter((id) =>
			followerIds.has(id.toString())
		);

		const friends = await User.find({ _id: { $in: friend_IDs } }).select(
			"-password"
		);
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

			const alreadyFollowing = user.followers.some(
				(id) => id.toString() === req.user.id
			);

			if (!alreadyFollowing) {
				const updated_profile = await User.findOneAndUpdate(
					{ _id: req.params.id },
					{ $addToSet: { followers: req.user.id } },
					{ new: true }
				);

				const updated_current_user = await User.findOneAndUpdate(
					{ _id: req.user.id },
					{
						$addToSet: { followings: req.params.id },
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
			console.error(err);
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

			const alreadyFollowing = user.followers.some(
				(id) => id.toString() === req.user.id
			);

			if (alreadyFollowing) {
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