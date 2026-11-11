const mongoose = require("mongoose");

// An Open Door is a small, capped offer from an alumnus. It is never a chat
// room or a scheduler: a student requests a slot, the alumnus accepts, and the
// conversation moves to Messenger.
const DOOR_TYPES = [
  "chat15",
  "resume_review",
  "mock_interview",
  "referral",
  "question",
];

const DoorSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: DOOR_TYPES,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  topics: {
    type: [String],
    default: [],
  },
  monthlyCap: {
    type: Number,
    default: 2,
    min: 1,
    max: 20,
  },
  // Opt-in: a newly created door must be switched on explicitly.
  active: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

DoorSchema.index({ active: 1, type: 1, createdAt: -1 });
DoorSchema.index({ topics: 1 });

const Door = mongoose.model("door", DoorSchema);

module.exports = Door;
module.exports.DOOR_TYPES = DOOR_TYPES;
