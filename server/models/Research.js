const mongoose = require('mongoose');
const ResearchSchema = new mongoose.Schema({
  title:         { type: String, required: true, trim: true },
  authors:       [{ type: String }],                    // array now, multiple authors
  abstract:      { type: String },
  publishedYear: { type: Number },
  domain:        { type: String },                      // e.g. "Machine Learning"
  journal:       { type: String },                      // publication name
  doi:           { type: String },                      // DOI identifier
  link:          { type: String },
  type:          { type: String, enum: ['journal', 'conference', 'thesis', 'patent', 'other'], default: 'journal' },
  isFeatured:    { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model('Research', ResearchSchema);