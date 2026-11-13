const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Message = require("../../models/Message");
const Conversation = require("../../models/Conversation");
const User = require("../../models/User");
const { DoEncrypt, DoDecrypt } = require("../../utils/encryption");

const MAX_MESSAGE_LENGTH = 4000;
const MAX_PAGE_SIZE = 100;
const MEDIA_TYPES = ["image", "video", "audio", "file"];

const clampLimit = (value) => {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed) || parsed < 1) return 30;
	return Math.min(parsed, MAX_PAGE_SIZE);
};

// Only site uploads and absolute http(s) URLs are accepted. This keeps a
// message from embedding javascript:/data: payloads or an unbounded string.
const isAllowedMediaUrl = (value) =>
	typeof value === "string" &&
	value.length <= 2048 &&
	/^(https?:\/\/|\/uploads\/)/i.test(value);

// ─────────────────────────────────────────────
// Helper: decrypt a message object safely
// ─────────────────────────────────────────────
const decryptMessage = (msg) => {
	const obj = msg.toObject ? msg.toObject() : { ...msg };
	if (obj.text) obj.text = DoDecrypt(obj.text);
	return obj;
};

// ─────────────────────────────────────────────
// POST /send
// ✅ Fixed: single populate call (no extra User.findById)
// ✅ Fixed: encrypts message before saving
// ✅ Fixed: updates Conversation.lastMessage after send
// ✅ Added: socket.io emit to recipient room
// ─────────────────────────────────────────────
router.post("/send", auth, async (req, res) => {
	const { conversationId, media, mediaType, replyTo } = req.body;
	const text = typeof req.body.text === "string" ? req.body.text.trim() : "";

	if (!text && !media) {
		return res.status(400).json({ msg: "Message cannot be empty" });
	}

	if (text.length > MAX_MESSAGE_LENGTH) {
		return res.status(400).json({
			msg: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
		});
	}

	if (media && !isAllowedMediaUrl(media)) {
		return res.status(400).json({ msg: "Invalid media URL" });
	}

	if (mediaType && !MEDIA_TYPES.includes(mediaType)) {
		return res.status(400).json({ msg: "Invalid media type" });
	}

	try {
		// ✅ Single query: populate members with the fields we need (including blockedUsers)
		const conversation = await Conversation.findById(conversationId).populate(
			"members",
			"blockedUsers"
		);

		if (!conversation) {
			return res.status(404).json({ msg: "Conversation not found" });
		}

		// Check if current user is a member
		const isMember = conversation.members.some(
			(m) => m._id.toString() === req.user.id
		);
		if (!isMember) {
			return res.status(403).json({ msg: "Not a member of this conversation" });
		}

		// ✅ Fixed: block check done with populated data (no extra DB call)
		const receiver = conversation.members.find(
			(m) => m._id.toString() !== req.user.id
		);
		if (
			receiver &&
			receiver.blockedUsers &&
			receiver.blockedUsers.some((id) => id.toString() === req.user.id)
		) {
			return res.status(403).json({ msg: "You are blocked by this user." });
		}

		// A reply must point at a message in the same conversation.
		if (replyTo) {
			const parent = await Message.findOne({
				_id: replyTo,
				conversation: conversationId,
			}).select("_id");
			if (!parent) {
				return res.status(400).json({ msg: "Invalid reply target" });
			}
		}

		// ✅ Fixed: actually encrypt before saving
		const encryptedText = text ? DoEncrypt(text) : undefined;

		const newMessage = new Message({
			conversation: conversationId,
			sender: req.user.id,
			text: encryptedText,
			media: media || null,
			mediaType: mediaType || null,
			replyTo: replyTo || null,
			readBy: [req.user.id], // sender has already "read" their own message
		});

		await newMessage.save();

		// ✅ Fixed: update lastMessage on the conversation (was never done before)
		const previewText = text
			? text.substring(0, 80)
			: mediaType === "image"
			? "📷 Image"
			: mediaType === "video"
			? "🎥 Video"
			: mediaType === "file"
			? "📎 File"
			: "Media";

		await Conversation.findByIdAndUpdate(conversationId, {
			lastMessage: previewText,
			lastMessageAt: new Date(),
			lastMessageSender: req.user.id,
		});

		// Populate sender info for the response / socket emit
		await newMessage.populate("sender", "name avatar");
		if (newMessage.replyTo) {
			await newMessage.populate("replyTo", "text sender");
		}

		const responseMsg = decryptMessage(newMessage);

		// ✅ Socket.io real-time emit (attach io to req via middleware or global)
		const io = req.app.get("io");
		if (io) {
			// Emit to all members of the conversation room
			io.to(conversationId).emit("new_message", responseMsg);

			// Emit updated conversation preview to all members (sidebar update)
			conversation.members.forEach((member) => {
				io.to(member._id.toString()).emit("conversation_updated", {
					_id: conversationId,
					conversationId,
					lastMessage: previewText,
					lastMessageAt: new Date(),
					lastMessageSender: req.user.id,
				});
			});
		}

		res.json(responseMsg);
	} catch (err) {
		console.error("Send message error:", err.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// GET /:conversationId
// ✅ Added: cursor-based pagination (no more full dump)
// ✅ Added: decryption on fetch
// Usage: GET /:id?limit=30&before=<ISO_DATE>
// ─────────────────────────────────────────────
router.get("/:conversationId", auth, async (req, res) => {
	try {
		const { before } = req.query;
		const limit = clampLimit(req.query.limit);

		// Verify membership
		const conversation = await Conversation.findById(req.params.conversationId);
		if (!conversation) return res.status(404).json({ msg: "Conversation not found" });

		const isMember = conversation.members.some(
			(m) => m.toString() === req.user.id
		);
		if (!isMember) return res.status(403).json({ msg: "Access denied" });

		// ✅ Cursor pagination: fetch page before a given timestamp
		const query = {
			conversation: req.params.conversationId,
			deletedFor: { $ne: req.user.id }, // exclude soft-deleted messages
		};
		if (before) {
			const beforeDate = new Date(before);
			if (Number.isNaN(beforeDate.getTime())) {
				return res.status(400).json({ msg: "Invalid cursor" });
			}
			query.createdAt = { $lt: beforeDate };
		}

		const messages = await Message.find(query)
			.sort({ createdAt: -1 })         // newest first for slicing
			.limit(limit)
			.populate("sender", "name avatar")
			.populate("replyTo", "text sender");

		// Reverse to chronological order for the client
		const decrypted = messages.reverse().map(decryptMessage);

		res.json({
			messages: decrypted,
			hasMore: messages.length === limit,
		});
	} catch (error) {
		console.error("Get messages error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// PUT /read/:conversationId
// ✅ NEW: Mark all unread messages as read, emit read receipt via socket
// ─────────────────────────────────────────────
router.put("/read/:conversationId", auth, async (req, res) => {
	try {
		const conversation = await Conversation.findById(req.params.conversationId);
		if (!conversation) return res.status(404).json({ msg: "Conversation not found" });
		const isMember = conversation.members.some(
			(m) => m.toString() === req.user.id
		);
		if (!isMember) return res.status(403).json({ msg: "Access denied" });

		await Message.updateMany(
			{
				conversation: req.params.conversationId,
				readBy: { $ne: req.user.id },
				sender: { $ne: req.user.id },
			},
			{ $addToSet: { readBy: req.user.id } }
		);

		// ✅ Emit read receipt so sender sees double-tick in real time
		const io = req.app.get("io");
		if (io) {
			io.to(req.params.conversationId).emit("messages_read", {
				convId: req.params.conversationId,
				conversationId: req.params.conversationId,
				userId: req.user.id,
				readBy: req.user.id,
				readAt: new Date(),
			});
		}

		res.json({ msg: "Messages marked as read" });
	} catch (error) {
		console.error("Read receipt error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// PUT /react/:messageId
// ✅ NEW: Add or toggle a reaction (emoji) on a message
// ─────────────────────────────────────────────
router.put("/react/:messageId", auth, async (req, res) => {
	try {
		const { emoji } = req.body;
		if (!emoji) return res.status(400).json({ msg: "Emoji required" });

		const message = await Message.findById(req.params.messageId);
		if (!message) return res.status(404).json({ msg: "Message not found" });

		const conversation = await Conversation.findById(message.conversation);
		if (
			!conversation ||
			!conversation.members.some((m) => m.toString() === req.user.id)
		) {
			return res.status(403).json({ msg: "Access denied" });
		}

		const existingIndex = message.reactions.findIndex(
			(r) => r.user.toString() === req.user.id
		);

		if (existingIndex !== -1) {
			if (message.reactions[existingIndex].emoji === emoji) {
				// Toggle off if same emoji
				message.reactions.splice(existingIndex, 1);
			} else {
				// Replace with new emoji
				message.reactions[existingIndex].emoji = emoji;
			}
		} else {
			message.reactions.push({ user: req.user.id, emoji });
		}

		await message.save();

		const io = req.app.get("io");
		if (io) {
			io.to(message.conversation.toString()).emit("reaction_updated", {
				messageId: message._id,
				reactions: message.reactions,
			});
		}

		res.json(message.reactions);
	} catch (error) {
		console.error("Reaction error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// PUT /edit/:messageId
// ✅ NEW: Edit a sent message (only sender can edit)
// ─────────────────────────────────────────────
router.put("/edit/:messageId", auth, async (req, res) => {
	try {
		const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
		if (!text) return res.status(400).json({ msg: "New text required" });
		if (text.length > MAX_MESSAGE_LENGTH) {
			return res.status(400).json({
				msg: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
			});
		}

		const message = await Message.findById(req.params.messageId);
		if (!message) return res.status(404).json({ msg: "Message not found" });

		if (message.sender.toString() !== req.user.id) {
			return res.status(403).json({ msg: "You can only edit your own messages" });
		}

		message.text = DoEncrypt(text);
		message.isEdited = true;
		await message.save();

		const io = req.app.get("io");
		if (io) {
			io.to(message.conversation.toString()).emit("message_edited", {
				messageId: message._id,
				text,
				isEdited: true,
			});
		}

		res.json({ msg: "Message edited", text });
	} catch (error) {
		console.error("Edit error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// DELETE /delete/:messageId
// ✅ NEW: Soft-delete for me, or hard delete for everyone (sender only)
// ─────────────────────────────────────────────
router.delete("/delete/:messageId", auth, async (req, res) => {
	try {
		const { forEveryone } = req.query;
		const message = await Message.findById(req.params.messageId);
		if (!message) return res.status(404).json({ msg: "Message not found" });

		const conversation = await Conversation.findById(message.conversation);
		if (
			!conversation ||
			!conversation.members.some((m) => m.toString() === req.user.id)
		) {
			return res.status(403).json({ msg: "Access denied" });
		}

		if (forEveryone === "true") {
			if (message.sender.toString() !== req.user.id) {
				return res.status(403).json({ msg: "Only sender can delete for everyone" });
			}
			await message.deleteOne();

			const io = req.app.get("io");
			if (io) {
				io.to(message.conversation.toString()).emit("message_deleted", {
					msgId: message._id,
					messageId: message._id,
					forEveryone: true,
				});
			}
			return res.json({ msg: "Message deleted for everyone" });
		} else {
			// Soft-delete: just hide from this user
			await Message.findByIdAndUpdate(req.params.messageId, {
				$addToSet: { deletedFor: req.user.id },
			});
			return res.json({ msg: "Message deleted for you" });
		}
	} catch (error) {
		console.error("Delete error:", error.message);
		res.status(500).send("Server Error");
	}
});

// ─────────────────────────────────────────────
// DELETE /clear/:conversationId
// ✅ Fixed: membership verified before clearing
// ─────────────────────────────────────────────
router.delete("/clear/:conversationId", auth, async (req, res) => {
	try {
		const conversation = await Conversation.findById(req.params.conversationId);
		if (!conversation) return res.status(404).json({ msg: "Conversation not found" });

		const isMember = conversation.members.some(
			(m) => m.toString() === req.user.id
		);
		if (!isMember) {
			return res.status(403).json({ msg: "Not authorized to clear this chat" });
		}

		// Clear only for the caller. Other participants keep their history.
		await Message.updateMany(
			{ conversation: req.params.conversationId },
			{ $addToSet: { deletedFor: req.user.id } }
		);

		res.json({ msg: "Chat cleared for you" });
	} catch (error) {
		console.error("Clear error:", error.message);
		res.status(500).send("Server Error clearing chat");
	}
});

module.exports = router;