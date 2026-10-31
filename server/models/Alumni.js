const mongoose = require('mongoose');
const AlumniSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  batch:       { type: String, required: true },        // e.g. "2018-2022"
  degree:      { type: String },                        // e.g. "B.Tech CSE"
  achievement: { type: String },
  currentRole: { type: String },                        // job title
  company:     { type: String },
  location:    { type: String },                        // city/country
  photo:       { type: String },                        // image URL
  linkedin:    { type: String },
  email:       { type: String },
  isFeature:   { type: Boolean, default: false },       // highlight on homepage
}, { timestamps: true });
module.exports = mongoose.model('Alumni', AlumniSchema);