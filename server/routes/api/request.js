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

    // 3️⃣ Claim the request BEFORE creating the user. On a standalone
    // MongoDB there is no multi-document transaction, so this atomic
    // findOneAndDelete is the ordering guarantee: only the request that
    // actually removes the row may create an account. A concurrent
    // approval gets 409 instead of racing the duplicate-email check.
    const claimed = await JoinRequest.findOneAndDelete({ _id: req.params.id });
    if (!claimed) {
      return res.status(409).json({
        msg: "Join request is already being processed."
      });
    }

let userData = {
	name: claimed.name,
	email: claimed.email,
	password: claimed.password,
	role: claimed.role,
};

// role-based fields
if (claimed.role === "student") {
	userData.program = claimed.program;
	userData.starting_year = claimed.starting_year;
	userData.passing_year = claimed.passing_year;
}
else if (claimed.role === "faculty") {
	userData.department = claimed.department;
	userData.designation = claimed.designation;
}
else if (claimed.role === "alumni") {
	userData.program = claimed.program;
	userData.starting_year = claimed.starting_year;
	userData.passing_year = claimed.passing_year;
	userData.organisation = claimed.organisation;
	userData.designation = claimed.designation;
	userData.location = claimed.location;
	userData.working_area = claimed.working_area;
}

// create user
const user = new User(userData);

    try {
      await user.save();
    } catch (err) {
      if (err && err.code === 11000) {
        // A concurrent signup registered the email after the check above.
        // The account exists, so the request stays consumed.
        return res.status(409).json({
          msg: "User already exists with this email."
        });
      }
      // Transient failure: put the request back so an admin can retry.
      try {
        await JoinRequest.create(claimed.toObject());
      } catch (restoreErr) {
        console.error("Failed to restore join request:", restoreErr.message);
      }
      throw err;
    }
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

    // 5️⃣ The request was already removed by the claim in step 3.

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