const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const authAdmin = require("../../middleware/authAdmin");
const User = require("../../models/User");


const Filter = require("bad-words");
const { check, validationResult } = require("express-validator");
var mongoose = require("mongoose");
const PostRequest = require("../../models/PostRequest");
const Setting = require("../../models/Setting");
const Notification = require("../../models/Notifications");

router.post("/getNotifications", auth, async (req, res) => {
  try {
    const userID = req.user.id;

    // Only fetch notifications not read by this user
    const unreadNotifications = await Notification.find({ readBy: { $ne: userID } })
      .sort({ createdAt: -1 });

    res.json({
      notifications: unreadNotifications,
      newCount: unreadNotifications.length
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

router.post("/addNotifications", authAdmin, async (req, res) => {
  try {
    const notification = new Notification({
      created_by_user: req.user.id,
      // userID: req.body.userID,
      Notification_name: req.body.name,
      Notification_description: req.body.description,
      Notification_link: req.body.link
    });

    await notification.save();

    res.json({ msg: "Notification added" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server error" });
  }
});
router.post("/markSingleRead", auth, async (req, res) => {
  try {
    const { id } = req.body;
    const userID = req.user.id;

    console.log(`Marking notification ${id} as read for user: ${userID}`);

    const marked = await Notification.findByIdAndUpdate(
      id,
      { $addToSet: { readBy: userID } },
      { new: true }
    );

    if (!marked) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    res.json({ msg: "Marked as read successfully" });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});
  

  

module.exports = router;
