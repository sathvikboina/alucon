const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EventSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  Description: {
    type: String,
  },
  Speaker: {
    type: String
  },
  Link: {
    type: String,
  },
  Event_post_date: {
    type: Date,
  },
  created_by_user: {
    type: Schema.Types.ObjectId,
    ref: "user",
  },
  created_by_name: {
    type: String,
  },

  // ✅ NEW (clear timing)
  startTime: {
    type: Date,
  },
  endTime: {
    type: Date,
  },

  // 🔥 Q&A fields
  isPostQueryEnabled: {
    type: Boolean,
    default: true
  },
  queryStartTime: {
    type: Date
  },
  queryEndTime: {
    type: Date
  }
});

const Event = mongoose.model("Events", EventSchema);
module.exports = Event;