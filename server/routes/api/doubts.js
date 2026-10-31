const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Doubt = require('../../models/Doubt');
const Answer = require('../../models/Answer');



// Create a Doubt
router.post('/', auth, async (req, res) => {
    try {
      const { question, category } = req.body;
      const newDoubt = new Doubt({ question, user: req.user.id, category });
      const doubt = await newDoubt.save();
      res.json(doubt);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });


  // Get all Doubts
router.get('/', async (req, res) => {
    try {
      const doubts = await Doubt.find().populate('user', ['name', 'avatar']).sort({ createdAt: -1 });
      res.json(doubts);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });


// Answer a Doubt
router.post('/:id/answer', auth, async (req, res) => {
    try {
      const { answer } = req.body;
      const newAnswer = new Answer({ doubt: req.params.id, answer, answeredBy: req.user.id });
      const ans = await newAnswer.save();
      res.json(ans);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });


  // Upvote a Doubt
// router.post('/:id/upvote', auth, async (req, res) => {
//     try {
//       const doubt = await Doubt.findById(req.params.id);
//       doubt.upvotes++;
//       await doubt.save();
//       res.json(doubt);
//     } catch (err) {
//       console.error(err.message);
//       res.status(500).send('Server error');
//     }
//   });
router.post('/:id/upvote', auth, async (req, res) => {
  try {
    const doubt = await Doubt.findById(req.params.id);

    if (!doubt) {
      return res.status(404).json({ msg: "Doubt not found" });
    }

    // If already exists
    if (doubt.upvotedBy.includes(req.user.id)) {
      return res.status(400).json({ msg: "Already upvoted" });
    }

    const updated = await Doubt.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { upvotedBy: req.user.id },
        $inc: { upvotes: 1 }
      },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all answers for a doubt
// Get all answers for a doubt
router.get('/:id/answers', async (req, res) => {
    try {
      const answers = await Answer.find({ doubt: req.params.id })
        .populate('answeredBy', ['name']) // ✅ show name
        .sort({ createdAt: -1 }); // optional: recent first
      res.json(answers);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
  
  



  
  module.exports = router;

