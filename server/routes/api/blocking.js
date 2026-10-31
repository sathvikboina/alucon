const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");

// ✅ Block a user
router.post("/block", auth, async (req, res) => {
	try {
		const { userIdToBlock } = req.body;

		const user = await User.findById(req.user.id);

		// Already blocked?
		if (user.blockedUsers.includes(userIdToBlock)) {
			return res.status(400).json({ msg: "User already blocked" });
		}

		user.blockedUsers.push(userIdToBlock);
		await user.save();

		res.json({ msg: "User blocked successfully" });
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server error in blocking");
	}
});

// ✅ Unblock a user
router.post("/unblock", auth, async (req, res) => {
	try {
		const { userIdToUnblock } = req.body;

		const user = await User.findById(req.user.id);

		user.blockedUsers = user.blockedUsers.filter(
			(id) => id.toString() !== userIdToUnblock
		);

		await user.save();

		res.json({ msg: "User unblocked successfully" });
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server error in unblocking");
	}
});

// ✅ List all blocked users
router.get("/blocked", auth, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).populate(
			"blockedUsers",
			"name avatar role"
		);

		res.json(user.blockedUsers);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server error in getting blocked users");
	}
});

module.exports = router;
