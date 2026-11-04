const mongoose = require("mongoose");

// Cached AI output. Keeping generations in Mongo means the demo never waits on
// a model call twice for the same content, and every answer can cite its
// sources. Offline fallbacks are intentionally NOT cached so that adding a key
// later upgrades the next request automatically.
// `type` is a reserved key in Mongoose, so the source shape must be an
// explicit sub-schema. Inline `sources: [{ label, href, type }]` is parsed as
// [String] and rejects every real source object.
const SourceSchema = new mongoose.Schema(
  {
    label: String,
    href: String,
    type: String,
  },
  { _id: false }
);

const AiArtifactSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  kind: { type: String, required: true, index: true },
  refId: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  sources: [SourceSchema],
  model: { type: String },
  generatedAt: { type: Date, default: Date.now },
  // TTL index: Mongo removes stale artifacts; reads also check expiresAt.
  expiresAt: { type: Date, expires: 0 },
});

module.exports = mongoose.model("ai_artifact", AiArtifactSchema);
