const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const authHeadAdmin = require("../../middleware/authHeadAdmin");
const User = require("../../models/User");
const Job = require("../../models/Jobs");
const Notification = require("../../models/Notifications");

const escapeHtml = require("../../middleware/utils/escapeHtml");
const { enqueueBroadcast } = require("../../services/emailQueue");
const { rateLimit } = require("../../middleware/rateLimit");

const Filter = require("bad-words");
const { check, validationResult } = require("express-validator");
var mongoose = require("mongoose");
const Channel = require("../../models/Channel");

// Job announcements email the community, so cap how often one account can
// trigger a broadcast.
const createJobLimiter = rateLimit({
  scope: "job-create",
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many job announcements. Please try again later.",
  key: (req) => req.user?.id || "anonymous",
});

router.get("/get/getjob", async (req, res) => {
  try {
    const data = await Job.find();
    let dt = [];
    let archive = [];
    let currDate = new Date;
    console.log("data ",data.length);
    for(let i = 0;i<data.length;i++){
      if(data[i].Job_deadline >= currDate) dt.push(data[i]);
      else{
        console.log(data[i].Job_name)
        archive.push(data[i]);
      }
    }
    // const save = await data.save();
    console.log("dt = " ,dt.length);
    res.json({dt,archive});
  } catch (e) {
    console.log(e);
  }
});

router.post("/create-job", auth, createJobLimiter, async (req, res) => {
  try {
    const author = await User.findById(req.user.id).select("name role isAdmin");
    if (!author) return res.status(401).json({ error: "Unauthorized" });
    if (author.role === "student" && !author.isAdmin) {
      return res.status(403).json({ error: "Only alumni, faculty and admins can post jobs" });
    }

    const asList = (value) => {
      if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
      if (typeof value === "string") {
        return value.split(",").map((item) => item.trim()).filter(Boolean);
      }
      return [];
    };

    const data = new Job({
      created_by_user: author.name,
      userID: req.user.id,
      Job_name: req.body.job_name,
      Description: req.body.description,
      Link: req.body.link,
      Job_post_date: Date.now(),
      Job_deadline: req.body.job_deadline,
      skills: asList(req.body.skills),
      requirements: asList(req.body.requirements || req.body.skills),
      location: req.body.location,
      work_mode: req.body.work_mode,
      job_type: req.body.job_type || "Internship",
      eligible_programs: asList(req.body.eligible_programs),
      eligible_graduation_years: asList(req.body.eligible_graduation_years),
      eligible_roles: asList(req.body.eligible_roles),
      duration: req.body.duration,
      stipend: req.body.stipend,
      openings: Number(req.body.openings) || undefined,
      is_active: req.body.is_active !== false,
    });

    const save = await data.save();

    const ppp = new Notification({
      created_by_user: author.name,
      userID: req.user.id,
      Notification_name: "Job :- " + req.body.job_name,
          Notification_link: "/jobs",
          Notification_description: req.body.description,
          Notification_post_date: Date.now()
    })
    const updating2 = await ppp.save();

    const users = await User.find({}, "email").lean();
    const subjectName = String(author.name || "").replace(/[\r\n]+/g, " ");
    const jobTitle = escapeHtml(req.body.job_name);
    const jobDescription = escapeHtml(req.body.description);
    const jobLink = escapeHtml(req.body.link);
    const jobDeadline = escapeHtml(req.body.job_deadline);

    // Queue the announcement instead of awaiting one Brevo call per member.
    // The queue deduplicates, caps the list and retries failures in the
    // background, so the response no longer depends on the mail provider.
    enqueueBroadcast({
      subject: `New Job Posted by ${subjectName}`,
      html: `
        <p>Hello,</p>
        <p>A new job is available on AlumniConnect.</p>
        <p><b>Title:</b> ${jobTitle}</p>
        <p><b>Description:</b> ${jobDescription}</p>
        <p><b>Link:</b> ${jobLink}</p>
        <p><b>Deadline:</b> ${jobDeadline}</p>
      `,
      text: `A new job is available on AlumniConnect.

Title: ${req.body.job_name}
Description: ${req.body.description}
Link: ${req.body.link}
Deadline: ${req.body.job_deadline}`,
      recipients: users.map((user) => user.email),
      meta: { type: "job", jobId: String(data._id) },
    });

    res.json(data);
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/deletejob", auth, async (req, res) => {
  try {
    const data = await Job.findOne({ _id: req.body.jobID });
    if (!data) return res.status(404).json({ invalid_msg: "not_found" });

    const actor = await User.findById(req.user.id).select("isAdmin");
    const isOwner = data.userID && data.userID.toString() === req.user.id;
    if (!isOwner && !actor?.isAdmin) {
      return res.status(403).json({ invalid_msg: "invalid" });
    }

    await Job.deleteOne({ _id: req.body.jobID });
    res.json({ invalid_msg: "valid" });
  } catch (e) {
    console.log(e);
    res.status(500).json({ invalid_msg: "error" });
  }
});
module.exports = router;
