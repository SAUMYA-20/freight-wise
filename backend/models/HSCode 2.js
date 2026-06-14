const mongoose = require('mongoose');

const hsCodeSchema = new mongoose.Schema({
  hsn4Digit: { type: String },
  hsn8Digit: { type: String },
  productName: { type: String },
  gstRate: { type: String },
  embedding: {
    type: [Number],
    index: false // We will create the Atlas Vector Search Index manually or via Atlas UI
  }
}, { timestamps: true });

module.exports = mongoose.model('HSCode', hsCodeSchema);
