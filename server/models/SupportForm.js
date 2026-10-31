const mongoose = require('mongoose');

const SupportFormSchema = new mongoose.Schema({
  options: [{
    text: { type: String, required: true },
    date: { type: Date, default: Date.now }
  }],
  responses: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    selectedOptions: [{ type: String }],
    date: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('supportForm', SupportFormSchema);
