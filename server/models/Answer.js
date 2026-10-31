const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  doubt: { type: mongoose.Schema.Types.ObjectId, ref: 'doubt' },
  answer: { type: String, required: true },
  answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('answer', AnswerSchema);