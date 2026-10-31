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
const Channel = require("../../models/Channel");
const bcrypt = require("bcryptjs");

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

// get join requests by user role  /join/student
// router.get("/join/:filter", authAdmin, async (req, res) => {
// 	try {
// 		const requests = await JoinRequest.find({ role: req.params.filter });
// 		res.json(requests);
// 	} catch (err) {
// 		console.error(err.message);
// 		return res.status(500).send("Server Error");
// 	}
// });

// router.get("/join/:id/approve", authAdmin, async (req, res) => {
//   try {
//     const request = await JoinRequest.findById(req.params.id);

//     if (!request) {
//       return res.status(404).json({ msg: "Join request not found." });
//     }

//     const existingUser = await User.findOne({ email: request.email });
//     if (existingUser) {
//       return res.status(400).json({
//         msg: "User already exists with this email."
//       });
//     }

//     // // 🔥 HASH PASSWORD HERE
//     // const salt = await bcrypt.genSalt(10);
//     // const hashedPassword = await bcrypt.hash(request.password, salt);

//     const user = new User({
//   name: request.name,
//   email: request.email,
//   password: request.password, // DO NOT HASH AGAIN
//   role: request.role
// });

//     await user.save();

//     await JoinRequest.findByIdAndDelete(req.params.id);

//     res.json({ id: req.params.id });

//   } catch (err) {
//     console.error("APPROVE ERROR FULL:", err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// router.get("/join/:id/approve", authAdmin, async (req, res) => {
// 	console.log("Approve join request received for ID:", req.params.id);
//   try {
//     const request = await JoinRequest.findById(req.params.id);

//     if (!request) {
//       return res.status(404).json({ msg: "Join request not found." });
//     }

//     const existingUser = await User.findOne({ email: request.email });
//     if (existingUser) {
//       return res.status(400).json({
//         msg: "User already exists with this email."
//       });
//     }

//     // ✅ create user
//     const user = new User({
//       name: request.name,
//       email: request.email,
//       password: request.password,
//       role: request.role
//     });

//     await user.save();

    

//     // 🔍 DEBUG LOG (IMPORTANT)
//     console.log("Sending approval email to:", user.email);

//     // ✅ Send email (NON-BLOCKING + LOGGING)
//     await sendEmail({
//       to: user.email,
//       subject: "Account Approved 🎉",
//       html: `
//         <div style="font-family: Arial, sas-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">

//   <!-- Header -->
//   <h2 style="color: #2c3e50;">Alumni Connect</h2>

//   <!-- Greeting -->
//   <p>Hello ${user.name},</p>

//   <!-- Main message -->
//   <p>
//     Your account has been <strong>successfully approved</strong>.
//     You can now log in and start exploring the Alumni Connect platform.
//   </p>

//   <!-- Button -->
//   <div style="margin: 20px 0;">
//     <a href="https://alumni-website-0tlf.onrender.com/login"
//        style="background-color: #007bff; color: #ffffff; padding: 10px 18px;
//               text-decoration: none; border-radius: 5px; display: inline-block;">
//       Login to your account
//     </a>
//   </div>

//   <!-- Extra info -->
//   <p>If you did not request this, please ignore this email.</p>

//   <hr/>

//   <!-- Footer -->
//   <p style="font-size: 12px; color: #888;">
//     This is an automated email from Alumni Connect.<br/>
//     Please do not reply directly to this email.
//   </p>

// </div>
//       `,
//     })
//     .then(() => {
//       console.log("✅ Email sent to:", user.email);
//     })
//     .catch((err) => {
//       console.log(
//         "❌ Email failed:",
//         err.response?.body || err.message
//       );
//     });
// 	// ✅ delete join request
//     await JoinRequest.findByIdAndDelete(req.params.id);

//     // ✅ send response immediately
//     res.json({ id: req.params.id });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ msg: err.message });
//   }
// });

router.get("/join/:id/approve", authAdmin, async (req, res) => {
  console.log("🔥 APPROVE ROUTE HIT:", req.params.id);

  try {
    // 1️⃣ Fetch request
    const request = await JoinRequest.findById(req.params.id);
    console.log("📥 Request fetched:", request?.email);

    if (!request) {
      console.log("❌ Request not found");
      return res.status(404).json({ msg: "Join request not found." });
    }

    // 2️⃣ Check existing user
    const existingUser = await User.findOne({ email: request.email });
    console.log("👤 Existing user:", existingUser);

    if (existingUser) {
      console.log("⚠️ User already exists");
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
    console.log("✅ User saved:", user.email);

    // 4️⃣ SEND EMAIL (FIXED)
    console.log("📩 Sending approval email...");

    try {
      await sendEmail({
        to: user.email,
        subject: "Your AlumniConnect Account Has Been Approved",
        text: `Hello ${user.name}, your account has been approved.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #2c3e50;">AlumniConnect</h2>

            <p>Hello ${user.name},</p>

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

      console.log("✅ Email sent to:", user.email);

    } catch (emailErr) {
      console.log("❌ Email failed:", emailErr.response?.body || emailErr.message);
    }

    // 5️⃣ Delete request AFTER email
    await JoinRequest.findByIdAndDelete(req.params.id);
    console.log("🗑️ Join request deleted");

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



router.get("/join/:id/reject", authAdmin, async (req, res) => {
	try {
		await JoinRequest.findOneAndDelete(req.params.id);
		res.json({ id: req.params.id });
	} catch (err) {
		console.error(err.message);
		return res.status(500).send("Server Error");
	}
});	

module.exports = router;