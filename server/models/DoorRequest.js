const mongoose = require("mongoose");

const DoorRequestSchema = new mongoose.Schema({
  door: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "door",
    required: true,
    index: true,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined", "completed", "cancelled"],
    default: "pending",
  },
  message: { type: String, default: "" },
  answerText: { type: String, default: "" },
  // null means "not asked yet"; Step 5 adds the confirmation loop.
  helped: { type: Boolean, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

// One open request per student per door. Declined, completed and cancelled
// rows fall outside the index, so history stays and a later ask is allowed.
DoorRequestSchema.index(
  { door: 1, requestedBy: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending", "accepted"] },
    },
    name: "unique_open_door_request",
  }
);
DoorRequestSchema.index({ door: 1, status: 1, createdAt: -1 });
DoorRequestSchema.index({ requestedBy: 1, createdAt: -1 });

module.exports = mongoose.model("door_request", DoorRequestSchema);
