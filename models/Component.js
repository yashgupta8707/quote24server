// server/models/Component.js
const mongoose = require('mongoose');

const ComponentSchema = new mongoose.Schema({
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
  model: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Model',
    required: true
  },
  hsn: {
    type: String,
  },
  warranty: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  purchasePrice: {
    type: Number,
  },
  salesPrice: {
    type: Number,
    required: true
  },
  gstRate: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('Component', ComponentSchema);
