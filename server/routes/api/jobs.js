const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const authHeadAdmin = require("../../middleware/authHeadAdmin");
const User = require("../../models/User");
const Job = require("../../models/Jobs");
const Notification = require("../../models/Notifications");

const sendEmail = require("../../middleware/utils/sendEmail");

const Filter = require("bad-words");
const { check, validationResult } = require("express-validator");
var mongoose = require("mongoose");
const Channel = require("../../models/Channel");

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

router.post("/create-job", auth, async (req, res) => {
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

    const users = await User.find();
    if (users != undefined) {
      for (let i = 0; i < users.length; i++) {
        // console.log(users[i].email);
        const options = {
          subject: `New Job Posted by ${author.name}`,
          html: `Dear ${users[i].name} 
					<br>
					You have new Job available,
					 <br>
					 <br>
					 Title: ${req.body.job_name}
					  <br>
					  <br>
					   Description: ${req.body.description}
					   <br>
					  <br>
					   Link : ${req.body.link}
					   <br>
					  <br>

					   Deadline : ${req.body.job_deadline}
					   `,
          to: users[i].email,
          from: {
            name: "AlumniConnect",
            address: process.env.EMAIL,
          },
        };

        const pp = await sendEmail(options);
      }
    }
// 
    // console.log("saved Job");
    res.json(data);
  } catch (e) {
    console.log(e);
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
