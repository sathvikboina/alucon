const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const authHeadAdmin = require("../../middleware/authHeadAdmin");
const User = require("../../models/User");
const Event = require("../../models/Event");
const Notification = require("../../models/Notifications");

const sendEmail = require("../../middleware/utils/sendEmail");

const Filter = require("bad-words");
const { check, validationResult } = require("express-validator");
var mongoose = require("mongoose");
const Channel = require("../../models/Channel");
// console.log("hi");    

router.get("/get/getevent", async (req, res) => {
  try {
    const data = await Event.find();
    // const save = await data.save();
    // console.log("events = " ,data);

    res.json(data);
  } catch (e) {
    console.log(e);
  }
});

router.post("/create-event", auth, async (req, res) => {
  try {
    const author = await User.findById(req.user.id).select("name role isAdmin");
    if (!author) return res.status(401).json({ error: "Unauthorized" });
    if (author.role === "student" && !author.isAdmin) {
      return res.status(403).json({ error: "Only alumni, faculty and admins can post events" });
    }

    // ✅ Get start & end time
    const startTime = new Date(req.body.startTime);
    const endTime = new Date(req.body.endTime);

    // ✅ Get Q&A duration (in hours)
    const durationHours = Number(req.body.qnaDuration);

    // 🔥 Q&A starts AFTER event ends
    const queryStartTime = new Date(endTime);

    // 🔥 Q&A ends based on duration
    const queryEndTime = new Date(
      endTime.getTime() + durationHours * 60 * 60 * 1000
    );

    const data = new Event({
      title: req.body.event_name,
      Description: req.body.description,
      Link: req.body.link,
      Event_post_date: Date.now(),
      Speaker: req.body.speaker,
      created_by_user: req.user.id,
      created_by_name: author.name,
      // 🔥 Event timing
      startTime,
      endTime,

      // 🔥 Q&A timing (AUTO CALCULATED)
      isPostQueryEnabled: true,
      queryStartTime,
      queryEndTime
    });

    const save = await data.save();

    // 👉 Notification (UNCHANGED)
    const ppp = new Notification({
      created_by_user: "Admin",
      userID: "6410b5e74dd13341a89a1bb2",
      Notification_name: "Event " + req.body.event_name,
      Notification_link: "/events",
      Notification_description: req.body.description,
      Notification_post_date: Date.now(),
    });

    await ppp.save();

    const users = await User.find();
    if (users) {
      for (let i = 0; i < users.length; i++) {
        const options = {
          subject: "New Event Posted by Admin",
          html: `Dear ${users[i].name} 
          <br>
          You have new event available,
          <br>
          Title: ${req.body.event_name}
          <br>
          Description: ${req.body.description}`,
          to: users[i].email,
          from: {
            name: "AlumniConnect",
            address: process.env.EMAIL,
          },
        };

        await sendEmail(options);
      }
    }

    res.json(data);

  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/deleteevent", auth, async (req, res) => {
  try {
    const data = await Event.findOne({ _id: req.body.eventID });
    if (!data) return res.status(404).json({ invalid_msg: "not_found" });

    const actor = await User.findById(req.user.id).select("isAdmin");
    const isOwner = data.created_by_user && data.created_by_user.toString() === req.user.id;
    if (!isOwner && !actor?.isAdmin) {
      return res.status(403).json({ invalid_msg: "invalid" });
    }

    await Event.deleteOne({ _id: req.body.eventID });
    res.json({ invalid_msg: "valid" });
  } catch (e) {
    console.log(e);
    res.status(500).json({ invalid_msg: "error" });
  }
});
module.exports = router;