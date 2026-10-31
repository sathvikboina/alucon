const mongoose = require("mongoose");

const ResearchHighlightSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    authors: [{ type: String, required: true }],
    abstract: { type: String, required: true },
    domain: {
      type: String,
      enum: ["AI/ML", "Biotechnology", "Civil Engineering", "Electronics", "Computer Science", "Physics", "Chemistry", "Mathematics", "Other"],
      required: true,
    },
    year: { type: Number, required: true },
    journal: { type: String },
    publicationLink: { type: String },
    tags: [String],
    isFeatured: { type: Boolean, default: false },
    citations: { type: Number, default: 0 },
    thumbnailImage: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResearchHighlight", ResearchHighlightSchema);