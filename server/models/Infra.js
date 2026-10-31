const mongoose = require('mongoose');
const InfraSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String },
  image:       { type: String },
  capacity:    { type: Number },                        // numeric now
  location:    { type: String },                        // e.g. "Block A, Floor 2"
  category:    { type: String, enum: ['lab', 'classroom', 'auditorium', 'sports', 'hostel', 'other'], default: 'other' },
  // isAvailable: { type: Boolean, default: true },
  amenities:   [{ type: String }],                      // e.g. ["AC", "Projector"]
}, { timestamps: true });
module.exports = mongoose.model('Infra', InfraSchema);