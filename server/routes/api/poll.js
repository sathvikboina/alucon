const express = require("express");
const router = express.Router();

const Poll = require("../../models/Poll");
const authHeadAdmin = require("../../middleware/authHeadAdmin");

// ✅ Create Poll (Head Admin only)
router.post("/create", authHeadAdmin, async (req, res) => {
  try {
    const { question, options, targetRoles, expiryDate } = req.body;

    // validation
    if (!question || !options || options.length < 2) {
      return res.status(400).json({ msg: "Invalid poll data" });
    }

    const formattedOptions = options.map((opt) => ({
      text: opt,
    }));

    const newPoll = new Poll({
      question,
      options: formattedOptions,
      createdBy: req.user.id, // from auth middleware
      targetRoles,
      expiryDate,
    });

    await newPoll.save();

    res.json({ msg: "Poll created successfully", poll: newPoll });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


const auth = require("../../middleware/auth");

// ✅ Get Polls (for alumni & teachers)
const User = require("../../models/User");

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    let polls;

    // ❌ block students only
    if (user.role === "student") {
      return res.status(403).json({ msg: "Access denied" });
    }

    // ✅ admin / head admin → see all polls
    if (user.isAdmin) {
      polls = await Poll.find().sort({ createdAt: -1 });
    }
    // ✅ alumni & faculty → filtered polls
    else if (user.role === "alumni" || user.role === "faculty") {
      polls = await Poll.find({
        targetRoles: { $in: [user.role] },
      }).sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ msg: "Access denied" });
    }

    res.json(polls);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// ✅ Vote on Poll
router.post("/vote/:pollId", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { optionIndex } = req.body;

    // get user from DB
    const User = require("../../models/User");
    const user = await User.findById(userId);

    // allow only alumni & faculty
    if (user.role !== "alumni" && user.role !== "faculty") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const poll = await Poll.findById(req.params.pollId);

    if (!poll) {
      return res.status(404).json({ msg: "Poll not found" });
    }

    // ❌ prevent duplicate voting
    if (poll.voters.some(v => v.user.toString() === userId)) {
      return res.status(400).json({ msg: "You already voted" });
    }

    // ❌ invalid option
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ msg: "Invalid option" });
    }

    // ✅ add vote
    poll.options[optionIndex].votes += 1;
    poll.voters.push({
      user: userId,
      optionIndex,
    });

    await poll.save();

    res.json({ msg: "Vote recorded successfully", poll });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// ✅ Get Poll Results
router.get("/results/:pollId", auth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);

    if (!poll) {
      return res.status(404).json({ msg: "Poll not found" });
    }

    res.json(poll);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// ✅ Delete Poll (Head Admin only)
router.delete("/delete/:pollId", authHeadAdmin, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);

    if (!poll) {
      return res.status(404).json({ msg: "Poll not found" });
    }

    await poll.deleteOne();

    res.json({ msg: "Poll deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// ✅ Get Analytics (Head Admin only)
router.get("/analytics", authHeadAdmin, async (req, res) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 });

    const analytics = polls.map((poll) => {
      const totalVotes = poll.options.reduce(
        (sum, opt) => sum + opt.votes,
        0
      );

      return {
        _id: poll._id,
        question: poll.question,
        totalVotes,
        options: poll.options.map((opt) => ({
          text: opt.text,
          votes: opt.votes,
          percentage:
            totalVotes === 0
              ? 0
              : ((opt.votes / totalVotes) * 100).toFixed(1),
        })),
      };
    });

    res.json(analytics);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


module.exports = router;