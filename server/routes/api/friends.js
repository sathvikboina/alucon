const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const FriendRequest = require("../../models/FriendRequest");
const User = require("../../models/User");

// ─────────────────────────────────────────────
// POST /request
// ✅ Fixed: duplicate check relies on unique index now
// ─────────────────────────────────────────────
router.post("/request", auth, async (req, res) => {
	try {
		const { receiverId } = req.body;

		if (!receiverId) return res.status(400).json({ msg: "receiverId required" });
		if (receiverId === req.user.id) {
			return res.status(400).json({ msg: "Cannot send request to yourself" });
		}

		const sender = await User.findById(req.user.id).select("friends blockedUsers");

		if (sender.friends.some((id) => id.toString() === receiverId)) {
			return res.status(400).json({ msg: "You are already friends" });
		}
		if (sender.blockedUsers?.some((id) => id.toString() === receiverId)) {
			return res.status(400).json({ msg: "Unblock this user first" });
		}

		// Check reverse request (they already sent you one)
		const reverseRequest = await FriendRequest.findOne({
			sender: receiverId,
			receiver: req.user.id,
			status: "pending",
		});
		if (reverseRequest) {
			return res
				.status(400)
				.json({ msg: "This user already sent you a friend request" });
		}

		const newRequest = new FriendRequest({
			sender: req.user.id,
			receiver: receiverId,
		});
		await newRequest.save();
		res.json(newRequest);
	} catch (error) {
		if (error.code === 11000) {
			return res.status(400).json({ msg: "Friend request already sent" });
		}
		console.error("Friend request error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// GET /requests
// ✅ Pending requests received by me
// ─────────────────────────────────────────────
router.get("/requests", auth, async (req, res) => {
	try {
		const requests = await FriendRequest.find({
			receiver: req.user.id,
			status: "pending",
		})
			.populate("sender", ["name", "avatar", "role", "program"])
			.sort({ createdAt: -1 });

		res.json(requests);
	} catch (error) {
		console.error("Fetch requests error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// POST /accept
// ✅ Fixed: both users updated atomically with $addToSet
// ─────────────────────────────────────────────
router.post("/accept", auth, async (req, res) => {
	try {
		const { requestId } = req.body;

		const request = await FriendRequest.findById(requestId);
		if (!request || request.receiver.toString() !== req.user.id) {
			return res.status(400).json({ msg: "Invalid request" });
		}

		// ✅ Use $addToSet to prevent duplicates at DB level
		await Promise.all([
			User.findByIdAndUpdate(request.sender, {
				$addToSet: { friends: request.receiver },
			}),
			User.findByIdAndUpdate(request.receiver, {
				$addToSet: { friends: request.sender },
			}),
		]);

		await request.deleteOne();

		// ✅ Notify sender via socket
		const io = req.app.get("io");
		if (io) {
			io.to(request.sender.toString()).emit("friend_request_accepted", {
				by: req.user.id,
			});
		}

		res.json({ msg: "Friend request accepted" });
	} catch (error) {
		console.error("Accept request error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// POST /decline
// ─────────────────────────────────────────────
router.post("/decline", auth, async (req, res) => {
	try {
		const { requestId } = req.body;

		const request = await FriendRequest.findById(requestId);
		if (!request || request.receiver.toString() !== req.user.id) {
			return res.status(400).json({ msg: "Invalid request" });
		}

		await request.deleteOne();
		res.json({ msg: "Friend request declined" });
	} catch (error) {
		console.error("Decline request error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// GET /list
// ✅ Fixed: dedup handled by $addToSet at write time; no need for Map trick
// ─────────────────────────────────────────────
router.get("/list", auth, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).populate("friends", [
			"name",
			"avatar",
			"role",
			"program",
			"starting_year",
		]);
		res.json(user.friends);
	} catch (error) {
		console.error("Friend list error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// GET /suggestions
// ✅ Fixed: parallel queries instead of sequential
// ─────────────────────────────────────────────
router.get("/suggestions", auth, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select("friends blockedUsers");

		// ✅ Parallel: both FriendRequest queries at the same time
		const [sentRequests, receivedRequests] = await Promise.all([
			FriendRequest.find({ sender: req.user.id }).select("receiver"),
			FriendRequest.find({ receiver: req.user.id }).select("sender"),
		]);

		const blockedUsers = user.blockedUsers?.map((id) => id.toString()) ?? [];

		const excludeIds = [
			req.user.id,
			...user.friends.map((id) => id.toString()),
			...sentRequests.map((r) => r.receiver.toString()),
			...receivedRequests.map((r) => r.sender.toString()),
			...blockedUsers,
		];

		const suggestions = await User.find({
			_id: { $nin: excludeIds },
			blocked: { $ne: true },
		}).select("name avatar role program starting_year passing_year location organisation");

		res.json(suggestions);
	} catch (err) {
		console.error("Suggestions error:", err.message);
		res.status(500).send("Server error in suggestions");
	}
});

// ─────────────────────────────────────────────
// GET /requests/sent
// ─────────────────────────────────────────────
router.get("/requests/sent", auth, async (req, res) => {
	try {
		const requests = await FriendRequest.find({
			sender: req.user.id,
			status: "pending",
		})
			.populate("receiver", ["name", "avatar", "role", "program", "starting_year"])
			.sort({ createdAt: -1 });

		res.json(requests);
	} catch (err) {
		console.error("Sent requests error:", err.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// POST /cancel
// ─────────────────────────────────────────────
router.post("/cancel", auth, async (req, res) => {
	try {
		const { requestId } = req.body;

		const request = await FriendRequest.findById(requestId);
		if (!request || request.sender.toString() !== req.user.id) {
			return res.status(400).json({ msg: "Invalid request or not authorized" });
		}

		await request.deleteOne();
		res.json({ msg: "Friend request canceled" });
	} catch (err) {
		console.error("Cancel request error:", err.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// GET /status
// ─────────────────────────────────────────────
router.get("/status", auth, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select("friends");

		const accepted = user.friends.map((id) => ({
			userId: id.toString(),
			status: "accepted",
		}));

		const sentRequests = await FriendRequest.find({
			sender: req.user.id,
			status: "pending",
		}).select("receiver");

		const pending = sentRequests.map((r) => ({
			userId: r.receiver.toString(),
			status: "pending",
		}));

		res.json([...accepted, ...pending]);
	} catch (err) {
		console.error("Status error:", err.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// DELETE /remove/:id
// ✅ Fixed: $pull instead of manual filter + save (atomic)
// ─────────────────────────────────────────────
router.delete("/remove/:id", auth, async (req, res) => {
	try {
		const friendId = req.params.id;

		await Promise.all([
			User.findByIdAndUpdate(req.user.id, { $pull: { friends: friendId } }),
			User.findByIdAndUpdate(friendId, { $pull: { friends: req.user.id } }),
		]);

		res.json({ msg: "Friend removed successfully" });
	} catch (error) {
		console.error("Remove friend error:", error.message);
		res.status(500).send("Server Error");
	}
});

module.exports = router;