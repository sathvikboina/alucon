const mongoose = require("mongoose");

const AlumniStorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    batch: { type: String, required: true },
    department: { type: String, required: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    location: {
      city: String,
      country: String,
      lat: Number,
      lng: Number,
    },
    story: { type: String, required: true },
    achievements: [String],
    profileImage: { type: String, default: "" },
    linkedIn: { type: String, default: "" },
    isFeatured: { type: Boolean, default: false },
    domain: {
      type: String,
      enum: ["Technology", "Finance", "Healthcare", "Education", "Research", "Entrepreneurship", "Arts", "Government", "Other"],
      default: "Other",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AlumniStory", AlumniStorySchema);