// server/controllers/modelController.js
const Model = require('../models/Model');

// Get all models
exports.getModels = async (req, res) => {
  try {
    const models = await Model.find()
      .populate('category')
      .populate('brand')
      .sort({ name: 1 });
    res.json(models);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get models by search term
exports.searchModels = async (req, res) => {
  try {
    const searchTerm = req.query.term;
    if (!searchTerm) {
      return res.status(400).json({ message: 'Search term is required' });
    }

    const models = await Model.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { hsn: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .populate('category')
      .populate('brand')
      .limit(10);

    res.json(models);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new model
exports.createModel = async (req, res) => {
  try {
    const model = new Model(req.body);
    const newModel = await model.save();
    
    // Populate the references for the response
    const populatedModel = await Model.findById(newModel._id)
      .populate('category')
      .populate('brand');
    
    res.status(201).json(populatedModel);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};