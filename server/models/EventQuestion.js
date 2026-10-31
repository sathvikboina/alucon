const mongoose = require("mongoose");

const replySchema = new mongoose.Schema({
  alumniId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  replyText: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const eventQuestionSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  question: {
    type: String,
    required: true
  },
  replies: [replySchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("EventQuestion", eventQuestionSchema);