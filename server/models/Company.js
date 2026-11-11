const mongoose = require("mongoose");

// A company hub groups jobs, alumni and signals under one normalised name.
// Records are additive: existing users and jobs are never rewritten, they are
// resolved to a company at read time.
const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  aliases: {
    type: [String],
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
});

CompanySchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model("company", CompanySchema);
