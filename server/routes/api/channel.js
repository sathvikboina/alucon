const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const authHeadAdmin = require("../../middleware/authHeadAdmin");
const Channel = require("../../models/Channel");

// @route    POST /api/channels/create-channel
// @desc     Create a new channel
// @access   Private (Head Admin)
router.post("/create-channel", authHeadAdmin, async (req, res) => {
	try {
		const { new_channel_name } = req.body;
		const channel = new Channel({ name: new_channel_name.trim() }); // trim spaces
		const channelObj = await channel.save();
		res.status(200).json("Channel Created");
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error while creating channel");
	}
});

// @route    GET /api/channels/all
// @desc     Get all channels
// @access   Private (Any authenticated user)
router.get("/all", auth, async (req, res) => {
	try {
		const channels = await Channel.find();
		console.log("channels = ", channels);
		res.status(200).json(channels);
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error while getting all channels");
	}
});

module.exports = router;
