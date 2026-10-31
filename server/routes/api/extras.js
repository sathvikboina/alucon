const express = require("express");
const router = express.Router();
const Parser = require("json2csv").Parser;
const fs = require("fs");
const Achievement = require("../../models/Achievement");
const FeedBack = require("../../models/FeedBack");
const authAdmin = require("../../middleware/authAdmin");
const sendEmail = require("../../middleware/utils/sendEmail");

router.post("/add-achievement", async (req, res) => {
	const { formInput, imgUrl, proofUrl } = req.body;
	const {
		name,
		enrollment_number,
		program,
		passing_year,
		award_date,
		reward, // updated
	} = formInput;

	try {
		const achievement = new Achievement({
			name,
			enrollment_number,
			program,
			passing_year,
			award_date,
			reward: {
				title: reward.title,
				type: reward.type,
				organization: reward.organization,
				receivedBy: reward.receivedBy,
				cashPrize: reward.cashPrize,
			},
			imgUrl,
			proofUrl,
		});

		const savedAchievement = await achievement.save();
		res.json(savedAchievement);
	} catch (err) {
		console.error("Error saving achievement to DB:", err.message);
		res.status(500).json({ errors: [{ msg: "Server Error" }] });
	}
});

router.post("/submit-feedback", async (req, res) => {
  const { name, email, role, feedback } = req.body;

  try {
    // ✅ Save feedback in DB
    const feedback_object = new FeedBack({ name, email, role, feedback });
    const fd = await feedback_object.save();

    // ✅ Email to ADMIN
    const emailOptions = {
      to: process.env.ADMIN_EMAIL || process.env.EMAIL, // admin email
      subject: `New feedback/query from ${name}`,
      html: `
        <h3>New Feedback Received</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Role:</b> ${role}</p>
        <p><b>Message:</b></p>
        <p>${feedback}</p>
      `,
      text: `
        New Feedback
        
        Name: ${name}
        Email: ${email}
        Role: ${role}
        Message: ${feedback}
      `,
    };

    // ✅ Send email (non-blocking)
    sendEmail(emailOptions).catch((err) => {
      console.log("Email failed:", err.message);
    });

    // ✅ Send response
    res.json({
      msg: "Feedback submitted successfully",
      data: fd,
    });

  } catch (err) {
    console.error("Error sending feedback:", err.message);
    res.status(500).json({ errors: [{ msg: "Server Error" }] });
  }
});
// router.post("/submit-feedback", async (req, res) => {
// 	const { name, email, role, feedback } = req.body;

// 	try {
// 		feedback_object = new FeedBack({ name, email, role, feedback });
// 		fd = await feedback_object.save();

// 		const options = {
// 			sender: name,
// 			from: {
// 				name: name,
// 				address: email,
// 			},
// 			to: process.env.EMAIL,
// 			subject: `New feedback/Query from ${name}`,
// 			text: feedback,
// 		};

// 		receiveMail(options, function (err, data) {
// 			if (err) {
// 				res.status(500).json({ message: "Internal Error" });
// 			} else {
// 				res.status({ message: "Email sent!!!" });
// 			}
// 		});

// 		res.json(fd);
// 	} catch (err) {
// 		console.error("Error sending feedback");
// 		res.status(500).json({ errors: [{ msg: "Server Error" }] });
// 	}
// });

router.get("/achievements", authAdmin, async (req, res) => {
	try {
		const achievements = await Achievement.find();
		// console.log(achievements);
		res.json(achievements);
	} catch (err) {
		console.error("Error fetching achievements");
		res.status(500).json({
			errors: [{ msg: "Server Error in fetching achievements" }],
		});
	}
});

router.get("/feedbacks", authAdmin, async (req, res) => {
	try {
		const feedbacks = await FeedBack.find();
		res.json(feedbacks);
	} catch (err) {
		console.error("Error fetching Feedbacks");
		res.status(500).json({
			errors: [{ msg: "Server Error in fetching feedbacks" }],
		});
	}
});

router.delete("/achievements/:id", authAdmin, async (req, res) => {
	try {
		await Achievement.findOneAndDelete(req.params.id);
		res.json(req.params.id);
	} catch (err) {
		console.log(err);
		console.error("Error Deleting Achievement");
		res.status(500).json({
			errors: [{ msg: "Server Error in deleting achievement" }],
		});
	}
});

router.delete("/feedbacks/:id", authAdmin, async (req, res) => {
	try {
		await FeedBack.findByIdAndDelete(req.params.id);
		res.json(req.params.id);
	} catch (err) {
		console.error("Error Deleting feedback");
		res.status(500).json({
			errors: [{ msg: "Server Error in deleting feedback" }],
		});
	}
});

router.delete("/achievements/all", authAdmin, async (req, res) => {
	try {
		await Achievement.deleteMany();
	} catch (err) {
		console.log(err);
		console.error("Error Deleting All Achievements");
		res.status(500).json({
			errors: [{ msg: "Server Error in deleting All achievements" }],
		});
	}
});
module.exports = router;
