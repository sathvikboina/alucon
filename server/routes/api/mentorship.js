const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const MentorShipRequest = require('../../models/MentorShipRequest');
const User = require('../../models/User');
const { getMentorMatches, rankMentors, MENTORSHIP_AREAS } = require('../../services/matching');

const ALLOWED_STATUS = ['accepted', 'declined', 'active', 'completed'];

// Keep this in sync with the matching service: capacity is the number of
// accepted/active mentees a mentor can hold at once.
const mentorCapacity = (mentor) => {
  const value = Number(mentor?.mentorship?.capacity);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 3;
};

// Request Mentorship
router.post('/', auth, async (req, res) => {
  const { requestedTo, areaOfHelp, message } = req.body;

  if (!requestedTo || !areaOfHelp) {
    return res.status(400).json({ msg: 'Mentor and area of help are required' });
  }
  if (!MENTORSHIP_AREAS.includes(areaOfHelp)) {
    return res.status(400).json({ msg: 'Unknown area of help' });
  }
  if (String(requestedTo) === String(req.user.id)) {
    return res.status(400).json({ msg: 'You cannot request mentorship from yourself' });
  }

  try {
    const mentor = await User.findById(requestedTo)
      .select(
        'name role program department passing_year designation organisation location working_area skills bio blocked mentorship'
      )
      .lean();
    if (!mentor || !['alumni', 'faculty'].includes(String(mentor.role).toLowerCase())) {
      return res.status(404).json({ msg: 'Mentor not found' });
    }
    if (mentor.blocked) {
      return res.status(400).json({ msg: 'This account is not available for mentorship' });
    }
    // Mentoring is opt-in; an absent flag means the member never enabled it.
    if (!mentor.mentorship || mentor.mentorship.available !== true) {
      return res.status(400).json({ msg: 'This mentor is not accepting requests right now' });
    }

    const existing = await MentorShipRequest.findOne({
      requestedBy: req.user.id,
      requestedTo,
      status: { $in: ['pending', 'accepted', 'active'] },
    });
    if (existing) {
      return res.status(409).json({
        msg: 'You already have an open mentorship request with this mentor',
        request: existing,
      });
    }

    const mentorRequests = await MentorShipRequest.find({ requestedTo })
      .select('requestedBy requestedTo status')
      .lean();
    const activeCount = mentorRequests.filter((request) =>
      ['accepted', 'active'].includes(request.status)
    ).length;
    if (activeCount >= mentorCapacity(mentor)) {
      return res.status(409).json({
        msg: 'This mentor is currently at capacity for new requests',
      });
    }

    const requester = await User.findById(req.user.id).lean();
    // Pass the real request history so the snapshot's "slots open" and
    // acceptance figures are truthful, not a fresh-mentor default.
    const [mentorMatch] = rankMentors(requester || {}, [mentor], {
      area: areaOfHelp,
      requests: mentorRequests,
      limit: 1,
    });
    if (!mentorMatch) {
      return res.status(409).json({
        msg: 'This mentor is not available for a new request right now',
      });
    }

    const newRequest = new MentorShipRequest({
      requestedBy: req.user.id,
      requestedTo,
      areaOfHelp,
      message: typeof message === 'string' ? message.slice(0, 1200) : '',
      status: 'pending',
      match_score: mentorMatch.score,
      match_reasons: mentorMatch.reasons.slice(0, 5),
    });
    const saved = await newRequest.save();
    res.json(saved);
  } catch (err) {
    console.error('mentorship request:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Ranked mentor matches for the signed-in member
router.get('/matches', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const matches = await getMentorMatches(user, {
      area: req.query.area,
      limit: req.query.limit,
      force: req.query.force === '1',
    });
    res.json(matches);
  } catch (err) {
    console.error('mentor matches:', err.message);
    res.status(500).json({ msg: 'Could not build mentor matches' });
  }
});

// Get requests received (for alumni/faculty)
router.get('/received', auth, async (req, res) => {
  try {
    const requests = await MentorShipRequest.find({ requestedTo: req.user.id })
      .populate('requestedBy', ['name', 'avatar', 'program', 'passing_year', 'skills'])
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Accept / decline / activate / complete mentorship
router.put('/:id', auth, async (req, res) => {
  const { status } = req.body;
  if (!ALLOWED_STATUS.includes(status)) {
    return res.status(400).json({ msg: 'Invalid mentorship status' });
  }

  try {
    const request = await MentorShipRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Mentorship request not found' });

    const isMentor = String(request.requestedTo) === String(req.user.id);
    const isMentee = String(request.requestedBy) === String(req.user.id);
    if (!isMentor && !isMentee) {
      return res.status(403).json({ msg: 'You are not part of this mentorship request' });
    }

    // Accepting/rejecting is a mentor decision; either participant can move an
    // accepted relationship to active/completed.
    if (['accepted', 'declined'].includes(status) && !isMentor) {
      return res.status(403).json({ msg: 'Only the mentor can accept or decline' });
    }

    const allowedTransitions = {
      pending: ['accepted', 'declined'],
      accepted: ['active'],
      active: ['completed'],
      declined: [],
      completed: [],
    };
    const current = request.status || 'pending';
    if (status !== current && !allowedTransitions[current].includes(status)) {
      return res.status(400).json({
        msg: `Cannot move this ${current} request to ${status}`,
      });
    }

    // Accepting consumes a slot immediately, so enforce capacity at the point
    // of acceptance too (requests may arrive while earlier ones are pending).
    if (status === 'accepted') {
      const mentor = await User.findById(request.requestedTo).select('mentorship').lean();
      const acceptedCount = await MentorShipRequest.countDocuments({
        requestedTo: request.requestedTo,
        status: { $in: ['accepted', 'active'] },
        _id: { $ne: request._id },
      });
      if (acceptedCount >= mentorCapacity(mentor)) {
        return res.status(409).json({
          msg: 'You are already at your mentoring capacity. Complete an active mentorship before accepting another.',
        });
      }
    }

    request.status = status;
    request.updatedAt = new Date();
    if (status === 'completed') request.completedAt = new Date();
    await request.save();

    const populated = await MentorShipRequest.findById(request._id)
      .populate('requestedBy', ['name', 'avatar', 'program', 'passing_year', 'skills'])
      .populate('requestedTo', ['name', 'avatar', 'designation', 'organisation']);
    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get mentorship requests sent by current user
router.get('/sent', auth, async (req, res) => {
  try {
    const sent = await MentorShipRequest.find({ requestedBy: req.user.id })
      .populate('requestedTo', ['name', 'avatar', 'designation', 'organisation', 'working_area'])
      .sort({ createdAt: -1 });
    res.json(sent);
  } catch (err) {
    console.error('Error in /sent route:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
