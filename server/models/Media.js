const mongoose = require('mongoose');
const MediaSchema = new mongoose.Schema({
  url:       { type: String, required: true },
  type:      { type: String, enum: ['image', 'video'], required: true },
  caption:   { type: String },
  category:  { type: String },                          // e.g. "Events", "Campus"
  tags:      [{ type: String }],                        // for filtering
  uploadedBy:{ type: String },                          // admin name/id
  isFeatured:{ type: Boolean, default: false },
  size:      { type: Number },                          // in KB
}, { timestamps: true });
module.exports = mongoose.model('Media', MediaSchema);