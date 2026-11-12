const express = require("express");
const router = express.Router();
const authAdmin = require("../../middleware/authAdmin");
const JoinRequest = require("../../models/JoinRequest");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
const gravatar = require("gravatar");
var mongoose = require("mongoose");
const Post = require("../../models/Post");
const sendEmail = require("../../middleware/utils/sendEmail");
const escapeHtml = require("../../middleware/utils/escapeHtml");
const Channel = require("../../models/Channel");
const bcrypt = require("bcryptjs");
const { queueSearchRefresh } = require("../../services/searchIndex");

// get join requests from db
router.get("/join", authAdmin, async (req, res) => {
	try {
		const requests = await JoinRequest.find();
		res.json(requests);
	} catch (err) {
		console.error(err.message);
		return res.status(500).send("Server Error");
	}
});


router.post("/join/:id/approve", authAdmin, async (req, res) => {

  try {
    // 1️⃣ Fetch request
    const request = await JoinRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ msg: "Join request not found." });
    }

    // 2️⃣ Check existing user
    const existingUser = await User.findOne({ email: request.email });

    if (existingUser) {
      return res.status(400).json({
        msg: "User already exists with this email."
      });
    }
	const avatar = gravatar.url(request.email, { s: "200", r: "pg", d: "mm" });
    // 3️⃣ Create user
   

let userData = {
	name: request.name,
	email: request.email,
	password: request.password,
	role: request.role,
};

// role-based fields
if (request.role === "student") {
	userData.program = request.program;
	userData.starting_year = request.starting_year;
	userData.passing_year = request.passing_year;
}
else if (request.role === "faculty") {
	userData.department = request.department;
	userData.designation = request.designation;
}
else if (request.role === "alumni") {
	userData.program = request.program;
	userData.starting_year = request.starting_year;
	userData.passing_year = request.passing_year;
	userData.organisation = request.organisation;
	userData.designation = request.designation;
	userData.location = request.location;
	userData.working_area = request.working_area;
}

// create user
const user = new User(userData);

	

    await user.save();
    queueSearchRefresh("alumni", user._id);

    // 4️⃣ SEND EMAIL (FIXED)

    try {
      await sendEmail({
        to: user.email,
        subject: "Your AlumniConnect Account Has Been Approved",
        text: `Hello ${user.name}, your account has been approved.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #2c3e50;">AlumniConnect</h2>

            <p>Hello ${escapeHtml(user.name)},</p>

            <p>
              Your account has been <strong>successfully approved</strong>.
              You can now log in and start exploring the AlumniConnect platform.
            </p>

            <div style="margin: 20px 0;">
              <a href="https://alumniconnect-v9k3.onrender.com/login"
                 style="background-color: #007bff; color: #ffffff; padding: 10px 18px;
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Login to your account
              </a>
            </div>

            <p>If you did not request this, please ignore this email.</p>

            <hr/>

            <p style="font-size: 12px; color: #888;">
              This is an automated email from AlumniConnect.<br/>
              Please do not reply directly to this email.
            </p>
          </div>
        `,
      });


    } catch (emailErr) {
    }

    // 5️⃣ Delete request AFTER email
    await JoinRequest.findByIdAndDelete(req.params.id);

    // 6️⃣ Send response
    res.json({ id: req.params.id });

  } catch (err) {
    console.error("🔥 FINAL ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
});

router.get("/join/:filter", authAdmin, async (req, res) => {
	try {
		const requests = await JoinRequest.find({ role: req.params.filter });
		res.json(requests);
	} catch (err) {
		console.error(err.message);
		return res.status(500).send("Server Error");
	}
});



router.post("/join/:id/reject", authAdmin, async (req, res) => {
	try {
		const removed = await JoinRequest.findByIdAndDelete(req.params.id);
		if (!removed) {
			return res.status(404).json({ msg: "Join request not found." });
		}
		res.json({ id: req.params.id });
	} catch (err) {
		console.error(err.message);
		return res.status(500).send("Server Error");
	}
});	

module.exports = router;