const mongoose = require('mongoose');
const ShowcaseEventSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  date:        { type: Date },
  endDate:     { type: Date },                          // for multi-day events
  description: { type: String },
  image:       { type: String },
  venue:       { type: String },
  organizer:   { type: String },
  category:    { type: String, enum: ['technical', 'cultural', 'sports', 'seminar', 'other'], default: 'other' },
  tags:        [{ type: String }],
  isLandmark:  { type: Boolean, default: false },
  registrationLink: { type: String },
}, { timestamps: true });
module.exports = mongoose.model('ShowcaseEvents', ShowcaseEventSchema);