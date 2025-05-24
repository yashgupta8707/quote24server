// server/models/Model.js
const mongoose = require('mongoose');

const ModelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  hsn: {
    type: String,
    required: true,
    trim: true
  },
  warranty: {
    type: String,
    required: true,
    trim: true
  },
  purchasePrice: {
    type: Number,
    required: true
  },
  salesPrice: {
    type: Number,
    required: true
  },
  gstRate: {
    type: Number,
    required: true,
    default: 18 // Default 18% GST
  }
}, { timestamps: true });

module.exports = mongoose.model('Model', ModelSchema);