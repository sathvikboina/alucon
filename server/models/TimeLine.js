const mongoose = require('mongoose');
const TimelineSchema = new mongoose.Schema({
  year:        { type: Number, required: true },
  title:       { type: String, required: true },
  description: { type: String },
  image:       { type: String },                        // optional visual
  category:    { type: String, enum: ['milestone', 'achievement', 'infrastructure', 'academic', 'other'], default: 'other' },
  isHighlight: { type: Boolean, default: false },       // pin major events
}, { timestamps: true });
module.exports = mongoose.model('Timeline', TimelineSchema);