const mongoose = require('mongoose');

// const DoubtSchema = new mongoose.Schema({
//   question: { type: String, required: true },
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
//   category: { type: String, enum: ['Career', 'Higher Studies', 'Placements', 'Entrepreneurship', 'Projects', 'General'], default: 'General' },
//   upvotes: { type: Number, default: 0 },
//   createdAt: { type: Date, default: Date.now }
// });
const DoubtSchema = new mongoose.Schema({
  question: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  category: { 
    type: String, 
    enum: ['Career', 'Higher Studies', 'Placements', 'Entrepreneurship', 'Projects', 'General'], 
    default: 'General' 
  },
  upvotes: { type: Number, default: 0 },

  // 🔥 NEW FIELD
  upvotedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    }
  ],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('doubt', DoubtSchema);