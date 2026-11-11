const mongoose = require("mongoose");

// One searchable document per source record. Keeping the text and the BGE
// vector together means a search is one Mongo read plus an in-process cosine
// comparison, with no model call per document.
const SearchDocumentSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      required: true,
      enum: ["job", "alumni", "post", "resource", "event", "group"],
    },
    sourceId: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    body: { type: String, default: "" },
    keywords: [{ type: String }],
    url: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    embedding: { type: [Number], default: [] },
    embeddingModel: { type: String, default: "" },
    indexedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

SearchDocumentSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true });
SearchDocumentSchema.index({ sourceType: 1 });
SearchDocumentSchema.index({ indexedAt: -1 });

module.exports = mongoose.model("search_document", SearchDocumentSchema);
