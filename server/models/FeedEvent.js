const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Raw behavioural signal for the feed recommender. One row per interaction,
// kept short-lived (90 days) and scoped to the signed-in user.
const FEED_EVENT_TYPES = [
  "impression",
  "click",
  "dwell",
  "like",
  "comment",
  "share",
  "follow",
  "search",
  "topic_view",
  "not_interested",
  "report",
];

const FeedEventSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: FEED_EVENT_TYPES,
    required: true,
  },
  // Present for anything that happened on a post.
  post: {
    type: Schema.Types.ObjectId,
    ref: "post",
    default: null,
  },
  // Denormalised at write time so ranking does not need a join per event.
  channel: { type: String, default: "" },
  author: {
    type: Schema.Types.ObjectId,
    ref: "user",
    default: null,
  },
  // Search text, or a free-form label for non-post events.
  query: { type: String, default: "" },
  // Dwell seconds, capped by the API before insert.
  value: { type: Number, default: 0 },
  surface: { type: String, default: "feed" },
  sessionId: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

FeedEventSchema.index({ user: 1, createdAt: -1 });
FeedEventSchema.index({ post: 1, type: 1, createdAt: -1 });
FeedEventSchema.index({ author: 1, createdAt: -1 });
// TTL: behavioural history is a ranking input, not an audit log.
FeedEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

const FeedEvent = mongoose.model("feed_event", FeedEventSchema);
FeedEvent.EVENT_TYPES = FEED_EVENT_TYPES;

module.exports = FeedEvent;
