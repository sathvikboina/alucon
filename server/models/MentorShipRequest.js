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

module.exports = mongoose.model('mentorship_request', MentorshipRequestSchema);