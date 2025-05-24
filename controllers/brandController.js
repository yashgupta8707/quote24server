// server/controllers/brandController.js
const Brand = require('../models/Brand');

// Get all brands
exports.getBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new brand
exports.createBrand = async (req, res) => {
  try {
    const brand = new Brand(req.body);
    const newBrand = await brand.save();
    res.status(201).json(newBrand);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};