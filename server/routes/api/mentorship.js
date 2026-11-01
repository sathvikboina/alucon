const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const MentorShipRequest = require('../../models/MentorShipRequest');
const User = require('../../models/User');
const { getMentorMatches, rankMentors, MENTORSHIP_AREAS } = require('../../services/matching');
const { withLock } = require('../../utils/keyedMutex');

const ALLOWED_STATUS = ['accepted', 'declined', 'active', 'completed'];

// Capacity is a count, so a unique index cannot enforce it. Serialising the
// check-and-save per mentor makes it atomic inside this process; the unique
// partial index on the model covers duplicates across processes.
const mentorLockKey = (mentorId) =>
  `mentorship:mentor:${String(mentorId).trim().toLowerCase()}`;

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

    const requester = await User.findById(req.user.id).lean();

    // Both the duplicate check and the capacity count are read-then-write, so
    // they run under a per-mentor lock. The unique partial index is the
    // backstop if a second process is ever added.
    const outcome = await withLock(mentorLockKey(requestedTo), async () => {
      const existing = await MentorShipRequest.findOne({
        requestedBy: req.user.id,
        requestedTo,
        status: { $in: ['pending', 'accepted', 'active'] },
      });
      if (existing) {
        return {
          status: 409,
          body: {
            msg: 'You already have an open mentorship request with this mentor',
            request: existing,
          },
        };
      }

      const mentorRequests = await MentorShipRequest.find({ requestedTo })
        .select('requestedBy requestedTo status')
        .lean();
      const activeCount = mentorRequests.filter((request) =>
        ['accepted', 'active'].includes(request.status)
      ).length;
      if (activeCount >= mentorCapacity(mentor)) {
        return {
          status: 409,
          body: { msg: 'This mentor is currently at capacity for new requests' },
        };
      }

      // Pass the real request history so the snapshot's "slots open" and
      // acceptance figures are truthful, not a fresh-mentor default.
      const [mentorMatch] = rankMentors(requester || {}, [mentor], {
        area: areaOfHelp,
        requests: mentorRequests,
        limit: 1,
      });
      if (!mentorMatch) {
        return {
          status: 409,
          body: { msg: 'This mentor is not available for a new request right now' },
        };
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
      return { status: 200, body: saved };
    });

    res.status(outcome.status).json(outcome.body);
  } catch (err) {
    // The partial unique index rejects a duplicate that slipped past the lock
    // (for example from another process). Report it the same way.
    if (err && err.code === 11000) {
      return res.status(409).json({
        msg: 'You already have an open mentorship request with this mentor',
      });
    }
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

    // Re-read and re-validate inside the critical section: the document may
    // have changed between the authorization read above and this write.
    const applyTransition = async () => {
      const fresh = await MentorShipRequest.findById(req.params.id);
      if (!fresh) {
        return { status: 404, body: { msg: 'Mentorship request not found' } };
      }

      const current = fresh.status || 'pending';
      if (status !== current && !allowedTransitions[current].includes(status)) {
        return {
          status: 400,
          body: { msg: `Cannot move this ${current} request to ${status}` },
        };
      }

      // Accepting consumes a slot immediately, so enforce capacity at the point
      // of acceptance too (requests may arrive while earlier ones are pending).
      if (status === 'accepted') {
        const mentor = await User.findById(fresh.requestedTo)
          .select('mentorship')
          .lean();
        const acceptedCount = await MentorShipRequest.countDocuments({
          requestedTo: fresh.requestedTo,
          status: { $in: ['accepted', 'active'] },
          _id: { $ne: fresh._id },
        });
        if (acceptedCount >= mentorCapacity(mentor)) {
          return {
            status: 409,
            body: {
              msg: 'You are already at your mentoring capacity. Complete an active mentorship before accepting another.',
            },
          };
        }
      }

      fresh.status = status;
      fresh.updatedAt = new Date();
      if (status === 'completed') fresh.completedAt = new Date();
      await fresh.save();
      return { status: 200, id: fresh._id };
    };

    const outcome =
      status === 'accepted'
        ? await withLock(mentorLockKey(request.requestedTo), applyTransition)
        : await applyTransition();

    if (outcome.status !== 200) {
      return res.status(outcome.status).json(outcome.body);
    }

    const populated = await MentorShipRequest.findById(outcome.id)
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
