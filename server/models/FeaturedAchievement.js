const mongoose = require("mongoose");

const featuredAchievementSchema = new mongoose.Schema(
  {
    achievement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Achievement",
      required: true,
      unique: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    featuredFrom: {
      type: Date,
      default: Date.now,
    },
    featuredUntil: {
      type: Date, // null = no expiry
    },
    featuredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: {
      // internal note by admin (why featured)
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Virtual: is still active?
featuredAchievementSchema.virtual("isActive").get(function () {
  if (!this.featuredUntil) return true;
  return this.featuredUntil > new Date();
});

featuredAchievementSchema.set("toJSON", { virtuals: true });
featuredAchievementSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("FeaturedAchievement", featuredAchievementSchema);