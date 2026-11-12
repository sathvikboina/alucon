const express = require("express");
const router = express.Router();
const FeedBack = require("../../models/FeedBack");
const authAdmin = require("../../middleware/authAdmin");
const sendEmail = require("../../middleware/utils/sendEmail");
const escapeHtml = require("../../middleware/utils/escapeHtml");
const { rateLimit } = require("../../middleware/rateLimit");

const feedbackLimiter = rateLimit({
  scope: "feedback",
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many feedback submissions. Please try again later.",
});

router.post("/submit-feedback", feedbackLimiter, async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 120);
  const email = String(req.body?.email || "").trim().slice(0, 254);
  const role = String(req.body?.role || "").trim().slice(0, 40);
  const feedback = String(req.body?.feedback || "").trim().slice(0, 4000);

  if (!name || !email || !feedback) {
    return res
      .status(400)
      .json({ errors: [{ msg: "Name, email and feedback are required" }] });
  }

  try {
    // ✅ Save feedback in DB
    const feedback_object = new FeedBack({ name, email, role, feedback });
    const fd = await feedback_object.save();

    // ✅ Email to ADMIN
    const subjectName = name.replace(/[\r\n]+/g, " ");
    const emailOptions = {
      to: process.env.ADMIN_EMAIL || process.env.EMAIL, // admin email
      subject: `New feedback/query from ${subjectName}`,
      html: `
        <h3>New Feedback Received</h3>
        <p><b>Name:</b> ${escapeHtml(name)}</p>
        <p><b>Email:</b> ${escapeHtml(email)}</p>
        <p><b>Role:</b> ${escapeHtml(role)}</p>
        <p><b>Message:</b></p>
        <p>${escapeHtml(feedback).replace(/\n/g, "<br/>")}</p>
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
      console.error("Email failed:", err.message);
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

router.delete("/feedbacks/all", authAdmin, async (req, res) => {
  try {
    await FeedBack.deleteMany();
    res.json({ msg: "All feedback removed" });
  } catch (err) {
    console.error("Error Deleting All Feedbacks");
    res.status(500).json({
      errors: [{ msg: "Server Error in deleting all feedbacks" }],
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

module.exports = router;
