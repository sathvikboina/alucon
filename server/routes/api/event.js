const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const authHeadAdmin = require("../../middleware/authHeadAdmin");
const User = require("../../models/User");
const Event = require("../../models/Event");
const Notification = require("../../models/Notifications");

const escapeHtml = require("../../middleware/utils/escapeHtml");
const { enqueueBroadcast } = require("../../services/emailQueue");
const { rateLimit } = require("../../middleware/rateLimit");
const {
  queueSearchRefresh,
  removeSearchDocument,
} = require("../../services/searchIndex");

const Filter = require("bad-words");
const { check, validationResult } = require("express-validator");
var mongoose = require("mongoose");
const Channel = require("../../models/Channel");

// Event announcements also email the community; cap the trigger rate.
const createEventLimiter = rateLimit({
  scope: "event-create",
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many event announcements. Please try again later.",
  key: (req) => req.user?.id || "anonymous",
});

router.get("/get/getevent", async (req, res) => {
  try {
    const data = await Event.find();

    res.json(data);
  } catch (e) {
    console.error(e);
  }
});

router.post("/create-event", auth, createEventLimiter, async (req, res) => {
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
    queueSearchRefresh("event", save._id);

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

    const users = await User.find({}, "email").lean();
    const eventTitle = escapeHtml(req.body.event_name);
    const eventDescription = escapeHtml(req.body.description);

    // Queue the announcement so the request does not wait on Brevo.
    enqueueBroadcast({
      subject: "New Event Posted by Admin",
      html: `
        <p>Hello,</p>
        <p>A new event is available on AlumniConnect.</p>
        <p><b>Title:</b> ${eventTitle}</p>
        <p><b>Description:</b> ${eventDescription}</p>
      `,
      text: `A new event is available on AlumniConnect.

Title: ${req.body.event_name}
Description: ${req.body.description}`,
      recipients: users.map((user) => user.email),
      meta: { type: "event", eventId: String(data._id) },
    });

    res.json(data);

  } catch (e) {
    console.error(e);
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
    await removeSearchDocument("event", req.body.eventID);
    res.json({ invalid_msg: "valid" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ invalid_msg: "error" });
  }
});
module.exports = router;