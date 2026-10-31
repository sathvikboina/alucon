const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },

    options: [
      {
        text: { type: String, required: true },
        votes: { type: Number, default: 0 },
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    targetRoles: {
      type: [String], // ["alumni", "teacher"]
      required: true,
    },

   voters: [
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    optionIndex: Number,
  },
],

    expiryDate: {
      type: Date,
    },
  },
  { timestamps: true }
);




module.exports = mongoose.model("Poll", pollSchema);