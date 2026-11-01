const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const sendEmail = require("../../middleware/utils/sendEmail");
const { check, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const config = require("config");
const {
	rateLimit,
	loginLockout,
	recordLoginFailure,
	clearLoginFailures,
} = require("../../middleware/rateLimit");

const loginLimiter = rateLimit({
	scope: "login",
	windowMs: 10 * 60 * 1000,
	max: 10,
	message: "Too many login attempts. Please try again later.",
});

const forgotPasswordLimiter = rateLimit({
	scope: "forgot-password",
	windowMs: 15 * 60 * 1000,
	max: 5,
	message: "Too many reset requests. Please try again later.",
});

const resetPasswordLimiter = rateLimit({
	scope: "reset-password",
	windowMs: 15 * 60 * 1000,
	max: 10,
	message: "Too many reset attempts. Please try again later.",
});

// @route    GET api/auth
// @desc     Test route
// @access   Public
router.get("/", auth, async (req, res) => {
	try {
		// .select('-passowrd') leaves the password and returns left data
		console.log("user id ", req);
		const user = await User.findById(req.user.id).select("-password");
		res.json(user);
	} catch (error) {
		console.error(error.message);
		res.status(500).send("Auth Error");
	}
});

// @route    POST api/auth
// @desc     authenticate user and get token
// @access   Public
router.post(
	"/",
	loginLimiter,
	loginLockout(),
	[
		check("email", "Please include a valid email! ").isEmail(),
		check("password", "Password Required").exists(),
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { email, password } = req.body;

		//Check if the user exist
		try {
			let user = await User.findOne({ email }).select("+password");
			if (!user) {
				recordLoginFailure(req);
				return res
					.status(400)
					.json({ errors: [{ msg: "Invalid credentials" }] });
			}

			if (user.blocked) {
				return res
					.status(400)
					.json({ errors: [{ msg: "Account Blocked" }] });
			}

			const isMatch = await bcrypt.compare(password, user.password);
			if (!isMatch) {
				recordLoginFailure(req);
				return res
					.status(400)
					.json({ errors: [{ msg: "Invalid credentials" }] });
			}

			clearLoginFailures(req);

			const payload = {
				user: {
					id: user.id,
					isAdmin: user.isAdmin,
					adminType: user.adminType,
				},
			};

			// sign the payload with private key
			jwt.sign(
				payload,
				process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET,
				{ expiresIn: 360000 },
				(err, token) => {
					if (err) throw err;
					// Return the token plus a password-free copy of the user.
					const userData = user.toObject();
					delete userData.password;
					res.json({
						token: token,
						user_data: userData,
					});
				}
			);

			
		} catch (err) {
			console.error(err.message);
			res.status(500).send("Server error.");
		}
	}
);

router.post(
	"/forgot-password",
	forgotPasswordLimiter,
	[
		check("email", "Please include a valid email! ")
			.isEmail()
			.not()
			.isEmpty(),
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			console.log("found errors");
			console.log(errors);
			return res.status(400).json({ errors: errors.array() });
		}
		const { email } = req.body;
		try {
			const user = await User.findOne({ email }).select("+password");
			if (!user) {
				return res
					.status(400)
					.json({ errors: [{ msg: "Account not found" }] });
			}
			

			const secret = (process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET) + user.password;
			const payload = { user: { id: user.id } };

			const token = jwt.sign(payload, secret, { expiresIn: "5m" });

			// return res.status(200).json(`resetPassword/${user.id}/${token}`);
			const resetLink = `${process.env.CLIENT_URL}/resetPassword/${user.id}/${token}`;

const options = {
  to: email,
  subject: "Reset Password Link",

  text: `Reset your password using this link: ${resetLink}`,

  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #333;">Reset Your Password</h2>
      
      <p>Hello,</p>
      
      <p>You requested to reset your password.</p>
      
      <p>
        Click the button below to reset your password. 
        This link is valid for <strong>5 minutes</strong>.
      </p>
      
      <a href="${resetLink}" 
         style="
           display: inline-block;
           padding: 10px 20px;
           background-color: #008cc9;
           color: #fff;
           text-decoration: none;
           border-radius: 5px;
           margin: 10px 0;
         ">
         Reset Password
      </a>

      <p>If you did not request this, please ignore this email.</p>

      <p>Thanks,<br/>AlumniConnect Team</p>
    </div>
  `,
};

			sendEmail(options);
			return res.status(200).send("Email sent");
		} catch (err) {
			console.error(err.message);
			res.status(500).send("Server error.");
		}
	}
);

router.post(
	"/reset-password",
	resetPasswordLimiter,
	[
		check("password", "Password Required").not().isEmpty().isLength({
			min: 6,
		}),
		check("password_confirm", "Confirm Password is required")
			.not()
			.isEmpty()
			.isLength({
				min: 6,
			}),
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { password, password_confirm, user_id, reset_token } = req.body;

		try {
			if (password !== password_confirm) {
				return res
					.status(400)
					.json({ errors: [{ msg: "Passwords do not match" }] });
			}

			const user = await User.findOne({ _id: user_id }).select("+password");
			if (!user) {
				return res
					.status(400)
					.json({ errors: [{ msg: "Invalid Request" }] });
			}
			const secret = (process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET) + user.password;
			const payload = jwt.verify(reset_token, secret);
			
			const salt = await bcrypt.genSalt(10);
			user.password = await bcrypt.hash(password, salt);
			await user.save();
			
			return res.status(200).send("Password Reset success");
		} catch (err) {
			res.status(500).send("Server error.");
		}
	}
);

router.post("/verify-reset-link", resetPasswordLimiter, async (req, res) => {
	const { user_id, reset_token } = req.body;
	try {
		const user = await User.findOne({ _id: user_id }).select("+password");
		if (!user) {
			console.log("hello");
			return res
				.status(400)
				.json({ errors: [{ msg: "Invalid Request" }] });
		}
	} catch (err) {
		return res.status(500).json({ errors: [{ msg: "Invalid Request" }] });
	}
	try {
		const secret = (process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET) + user.password;
		const payload = jwt.verify(reset_token, secret);
		console.log("payload" + payload);
		if (!payload) {
			return res
				.status(400)
				.json({ errors: [{ msg: "Invalid Request" }] });
		}
		return res.json({ valid: true });
	} catch (err) {
		res.status(500).json({ errors: [{ msg: "Invalid Request" }] });
	}
});

module.exports = router;
