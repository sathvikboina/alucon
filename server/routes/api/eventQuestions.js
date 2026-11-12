const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const EventQuestion = require("../../models/EventQuestion");
const Event = require("../../models/Event");

const authMiddleware = require("../../middleware/auth");

// ==============================
// 1. Ask Question (Student)
// ==============================
router.post("/:eventId/question", authMiddleware, async (req, res) => {
  try {
    const { question } = req.body;
    const studentId = req.user.id;
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ msg: "Event not found" });

    const now = new Date();

    if (
      !event.isPostQueryEnabled ||
      now < event.queryStartTime ||
      now > event.queryEndTime
    ) {
      return res.status(400).json({ msg: "Q&A not active" });
    }

    const newQuestion = new EventQuestion({
      eventId,
      studentId,
      question
    });

    await newQuestion.save();

    res.status(201).json(newQuestion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// 2. Get All Questions
// ==============================
router.get("/:eventId/questions", authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;

    const questions = await EventQuestion.find({ eventId })
      .populate("studentId", "name email")
      .populate("replies.alumniId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// 3. Reply to Question
// ==============================
router.post("/reply/:questionId", authMiddleware, async (req, res) => {
  try {
    const { replyText } = req.body;
    const alumniId = req.user.id;
    const { questionId } = req.params;

    const question = await EventQuestion.findById(questionId);
    if (!question) return res.status(404).json({ msg: "Question not found" });

    const event = await Event.findById(question.eventId);
    const now = new Date();

    if (
      !event.isPostQueryEnabled ||
      now > event.queryEndTime
    ) {
      return res.status(400).json({ msg: "Reply window closed" });
    }

    question.replies.push({
      alumniId,
      replyText
    });

    await question.save();

    res.status(200).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// 4. Delete Question
// ==============================
router.delete("/:questionId", authMiddleware, async (req, res) => {
  try {
    console.error("USER:", req.user);
    const question = await EventQuestion.findById(req.params.questionId);

    if (!question) {
      return res.status(404).json({ msg: "Question not found" });
    }

    if (
      question.studentId.toString() !== req.user.id &&
      !req.user.isAdmin
    ) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    await question.deleteOne();

    res.json({ msg: "Question deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// 5. Delete Reply 🔥 NEW
// ==============================
router.delete("/reply/:questionId/:replyId", authMiddleware, async (req, res) => {
  try {
    const { questionId, replyId } = req.params;

    const question = await EventQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ msg: "Question not found" });
    }

    const reply = question.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ msg: "Reply not found" });
    }

    if (
      reply.alumniId.toString() !== req.user.id &&
       !req.user.isAdmin
    ) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // 🔥 FIXED DELETE
    question.replies = question.replies.filter(
      (r) => r._id.toString() !== replyId
    );

    await question.save();

    res.json({ msg: "Reply deleted" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
module.exports = router;