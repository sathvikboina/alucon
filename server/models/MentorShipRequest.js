const mongoose = require('mongoose');

const MentorshipRequestSchema = new mongoose.Schema({
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  requestedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  areaOfHelp: {
    type: String,
    enum: ['Career', 'Research', 'Higher Studies', 'Entrepreneurship', 'Placements', 'Other'],
    required: true
  },
  message: { type: String },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'active', 'completed'],
    default: 'pending'
  },
  match_score: { type: Number },
  match_reasons: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

// A member may have at most one open request with a given mentor. Declined and
// completed rows fall out of the index, so history is preserved and a fresh
// request is allowed later. The partial index makes the duplicate check atomic
// even when two requests race in different processes.
MentorshipRequestSchema.index(
  { requestedBy: 1, requestedTo: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'accepted', 'active'] }
    },
    name: 'unique_open_mentorship_request'
  }
);

module.exports = mongoose.model('mentorship_request', MentorshipRequestSchema);