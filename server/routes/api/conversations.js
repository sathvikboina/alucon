const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../../middleware/auth");
const Conversation = require("../../models/Conversation");
const User = require("../../models/User");
const Message = require("../../models/Message");

// ─────────────────────────────────────────────
// POST /start
// ✅ Fixed: handles 1-to-1 and group creation
// ✅ Added: returns populated members for immediate use
// ─────────────────────────────────────────────
router.post("/start", auth, async (req, res) => {
	try {
		const { memberIds, groupName } = req.body;

		if (!memberIds || memberIds.length === 0) {
			return res.status(400).json({ msg: "memberIds required" });
		}
		if (!Array.isArray(memberIds) || memberIds.length > 50) {
			return res.status(400).json({ msg: "Invalid member list" });
		}

		const cleanMemberIds = memberIds
			.map((id) => String(id))
			.filter((id) => mongoose.Types.ObjectId.isValid(id) && id !== req.user.id);
		if (cleanMemberIds.length === 0) {
			return res.status(400).json({ msg: "No valid members supplied" });
		}

		const allMembers = [req.user.id, ...new Set(cleanMemberIds)];
		const isGroupChat = allMembers.length > 2;

		let conversation;

		if (!isGroupChat) {
			// ✅ Reuse existing 1-to-1 conversation
			conversation = await Conversation.findOne({
				isGroup: false,
				members: { $all: allMembers, $size: 2 },
			}).populate("members", "name avatar");
		}

		if (!conversation) {
			conversation = new Conversation({
				isGroup: isGroupChat,
				groupName: isGroupChat ? groupName : null,
				members: allMembers,
				groupAdmins: isGroupChat ? [req.user.id] : [],
			});
			await conversation.save();
			await conversation.populate("members", "name avatar");
		}

		res.json(conversation);
	} catch (error) {
		console.error("Start conversation error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// GET /
// ✅ NEW: Get all conversations for sidebar (sorted by last message)
// ─────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
	try {
		const conversations = await Conversation.find({
			members: { $in: [req.user.id] },
		})
			.populate("members", "name avatar")
			.populate("lastMessageSender", "name")
			.sort({ lastMessageAt: -1, createdAt: -1 });

		res.json(conversations);
	} catch (error) {
		console.error("Get conversations error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// GET /groups
// ✅ Get all group conversations the user is in
// ─────────────────────────────────────────────
router.get("/groups", auth, async (req, res) => {
	try {
		const groups = await Conversation.find({
			isGroup: true,
			members: { $in: [req.user.id] },
		}).populate("members", "_id name avatar");

		res.json(groups);
	} catch (error) {
		console.error("Get groups error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// GET /:id
// ✅ Fixed: safe optional chaining on blockedUsers,
//    no crash when member is missing
// ─────────────────────────────────────────────
router.get("/:id", auth, async (req, res) => {
	try {
		const conversation = await Conversation.findById(req.params.id).populate(
			"members",
			"name avatar blockedUsers"
		);

		if (!conversation) {
			return res.status(404).json({ msg: "Conversation not found" });
		}

		const isMember = conversation.members.some(
			(m) => m._id.toString() === req.user.id
		);
		if (!isMember) {
			return res.status(403).json({ msg: "Access denied" });
		}

		const me = conversation.members.find(
			(m) => m._id.toString() === req.user.id
		);
		const other = conversation.members.find(
			(m) => m._id.toString() !== req.user.id
		);

		// ✅ Fixed: safe checks — no crash if me or other is undefined
		const youBlocked =
			me?.blockedUsers?.some((id) => id.toString() === other?._id?.toString()) ??
			false;
		const blockedBy =
			other?.blockedUsers?.some((id) => id.toString() === me?._id?.toString()) ??
			false;

		res.json({
			...conversation.toObject(),
			youBlocked,
			blockedBy,
		});
	} catch (error) {
		console.error("Get conversation error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// GET /unread-count/:id
// ✅ NEW: Get unread message count for a conversation
// ─────────────────────────────────────────────
router.get("/unread-count/:id", auth, async (req, res) => {
	try {
		const conversation = await Conversation.findById(req.params.id);
		if (!conversation) return res.status(404).json({ msg: "Conversation not found" });
		const isMember = conversation.members.some(
			(m) => m.toString() === req.user.id
		);
		if (!isMember) return res.status(403).json({ msg: "Access denied" });

		const count = await Message.countDocuments({
			conversation: req.params.id,
			sender: { $ne: req.user.id },
			readBy: { $ne: req.user.id },
		});
		res.json({ count });
	} catch (error) {
		console.error("Unread count error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// PUT /mute/:id
// ✅ NEW: Toggle mute for a conversation
// ─────────────────────────────────────────────
router.put("/mute/:id", auth, async (req, res) => {
	try {
		const conversation = await Conversation.findById(req.params.id);
		if (!conversation) return res.status(404).json({ msg: "Conversation not found" });

		const isMember = conversation.members.some(
			(id) => id.toString() === req.user.id
		);
		if (!isMember) return res.status(403).json({ msg: "Access denied" });

		const isMuted = conversation.mutedBy.some(
			(id) => id.toString() === req.user.id
		);

		if (isMuted) {
			conversation.mutedBy = conversation.mutedBy.filter(
				(id) => id.toString() !== req.user.id
			);
		} else {
			conversation.mutedBy.push(req.user.id);
		}

		await conversation.save();
		res.json({ muted: !isMuted });
	} catch (error) {
		console.error("Mute error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// PUT /group/make-admin
// ✅ Fixed: verify requester is already an admin
// ─────────────────────────────────────────────
router.put("/group/make-admin", auth, async (req, res) => {
	try {
		const { conversationId, userId } = req.body;

		const conversation = await Conversation.findById(conversationId);
		if (!conversation || !conversation.isGroup) {
			return res.status(404).json({ msg: "Group not found" });
		}

		const isAdmin = conversation.groupAdmins.some(
			(id) => id.toString() === req.user.id
		);
		if (!isAdmin) {
			return res.status(403).json({ msg: "Only admins can promote members" });
		}

		await Conversation.findByIdAndUpdate(conversationId, {
			$addToSet: { groupAdmins: userId },
		});

		res.json({ msg: "User promoted to admin" });
	} catch (error) {
		console.error("Make admin error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// PUT /group/remove-member
// ✅ Fixed: admin check before removing
// ─────────────────────────────────────────────
router.put("/group/remove-member", auth, async (req, res) => {
	try {
		const { conversationId, userId } = req.body;

		const conversation = await Conversation.findById(conversationId);
		if (!conversation || !conversation.isGroup) {
			return res.status(404).json({ msg: "Group not found" });
		}

		const isAdmin = conversation.groupAdmins.some(
			(id) => id.toString() === req.user.id
		);
		if (!isAdmin) {
			return res.status(403).json({ msg: "Only admins can remove members" });
		}

		await Conversation.findByIdAndUpdate(conversationId, {
			$pull: { members: userId, groupAdmins: userId },
		});

		// ✅ Notify removed user via socket
		const io = req.app.get("io");
		if (io) {
			io.to(userId).emit("removed_from_group", { conversationId });
		}

		res.json({ msg: "User removed from group" });
	} catch (error) {
		console.error("Remove member error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// PUT /group/add-members
// ✅ NEW: Add members to an existing group
// ─────────────────────────────────────────────
router.put("/group/add-members", auth, async (req, res) => {
	try {
		const { conversationId, userIds } = req.body;

		const conversation = await Conversation.findById(conversationId);
		if (!conversation || !conversation.isGroup) {
			return res.status(404).json({ msg: "Group not found" });
		}

		const isAdmin = conversation.groupAdmins.some(
			(id) => id.toString() === req.user.id
		);
		if (!isAdmin) {
			return res.status(403).json({ msg: "Only admins can add members" });
		}

		await Conversation.findByIdAndUpdate(conversationId, {
			$addToSet: { members: { $each: userIds } },
		});

		res.json({ msg: "Members added successfully" });
	} catch (error) {
		console.error("Add members error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// PUT /group/leave/:id
// ✅ Fixed: auto-delete group only when 0 members remain
// ─────────────────────────────────────────────
router.put("/group/leave/:id", auth, async (req, res) => {
	try {
		const conversation = await Conversation.findById(req.params.id);

		if (!conversation || !conversation.isGroup) {
			return res.status(404).json({ msg: "Group not found" });
		}

		conversation.members = conversation.members.filter(
			(id) => id.toString() !== req.user.id
		);
		conversation.groupAdmins = conversation.groupAdmins.filter(
			(id) => id.toString() !== req.user.id
		);

		// If no members left, clean up
		if (conversation.members.length === 0) {
			await Message.deleteMany({ conversation: req.params.id });
			await conversation.deleteOne();
			return res.json({ msg: "Group deleted (no members remaining)" });
		}

		// ✅ Auto-assign new admin if no admins remain
		if (conversation.groupAdmins.length === 0 && conversation.members.length > 0) {
			conversation.groupAdmins.push(conversation.members[0]);
		}

		await conversation.save();
		res.json({ msg: "Successfully left the group" });
	} catch (error) {
		console.error("Leave group error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// DELETE /group/delete/:id
// ✅ Admin-only group delete with message cleanup
// ─────────────────────────────────────────────
router.delete("/group/delete/:id", auth, async (req, res) => {
	try {
		const conversation = await Conversation.findById(req.params.id);

		if (!conversation || !conversation.isGroup) {
			return res.status(404).json({ msg: "Group not found" });
		}

		const isAdmin = conversation.groupAdmins.some(
			(id) => id.toString() === req.user.id
		);
		if (!isAdmin) {
			return res.status(403).json({ msg: "Only admins can delete the group" });
		}

		await Message.deleteMany({ conversation: req.params.id });
		await conversation.deleteOne();

		res.json({ msg: "Group deleted successfully" });
	} catch (error) {
		console.error("Delete group error:", error.message);
		res.status(500).send("Server Error");
	}
});

module.exports = router;