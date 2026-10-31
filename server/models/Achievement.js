const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    recipientType: {
      type: String,
      enum: ["alumni", "faculty"],
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "recipientModel",
      required: true,
    },
    recipientModel: {
      type: String,
      enum: ["user"],      // ← was "User", must match mongoose.model("user", ...)
      default: "user",     // ← was "User"
    },
    recipientName: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AchievementCategory",
      required: true,
    },
    awardingBody: {
      type: String,
      trim: true,
    },
    achievementDate: {
      type: Date,
      required: true,
    },
    imageUrl: {
      type: String,
    },
    proofDocumentUrl: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    courseName: {
      type: String,
      trim: true,
    },
    passoutYear: {
      type: String,
      trim: true,
    },
    currentDesignation: {
      type: String,
      trim: true,
    },
    currentOrganization: {
      type: String,
      trim: true,
    },
    higherQualification: {
      type: String,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    awardPeriod: {
      type: String,
      trim: true,
    },
    rollNumber: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",         // ← was "User"
    },
    approvedAt: {
      type: Date,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",         // ← was "User"
      required: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

achievementSchema.index({ status: 1, recipientType: 1, category: 1 });

module.exports = mongoose.model("Achievement", achievementSchema);