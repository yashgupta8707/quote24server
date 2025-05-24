// server/controllers/quotationController.js
const Quotation = require('../models/Quotation');
const Party = require('../models/Party');

// Get all quotations
exports.getQuotations = async (req, res) => {
  try {
    const quotations = await Quotation.find()
      .populate('party')
      .populate({
        path: 'components.category components.brand components.model',
        select: 'name'
      })
      .sort({ createdAt: -1 });
    res.json(quotations);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get quotations by party
exports.getQuotationsByParty = async (req, res) => {
  try {
    const quotations = await Quotation.find({ party: req.params.partyId })
      .populate('party')
      .populate({
        path: 'components.category components.brand components.model',
        select: 'name'
      })
      .sort({ version: 1, createdAt: -1 });
    res.json(quotations);
  } catch (error) {
    console.error('Error fetching quotations by party:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single quotation
exports.getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('party')
      .populate('originalQuote')
      .populate({
        path: 'components.category components.brand components.model',
        select: 'name'
      });
    
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
    res.json(quotation);
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create new quotation
exports.createQuotation = async (req, res) => {
  try {
    console.log('Creating quotation with data:', JSON.stringify(req.body, null, 2));
    
    const { party, components, totalAmount, totalPurchase, totalTax, notes, termsAndConditions, status } = req.body;
    
    // Validate party exists
    const partyExists = await Party.findById(party);
    if (!partyExists) {
      console.error('Party not found:', party);
      return res.status(404).json({ message: 'Party not found' });
    }
    
    // Validate components array
    if (!components || !Array.isArray(components) || components.length === 0) {
      return res.status(400).json({ message: 'Components array is required and must not be empty' });
    }
    
    // Format components
    const formattedComponents = components.map((component, index) => {
      console.log(`Processing component ${index}:`, component);
      
      if (!component.category || !component.brand || !component.model) {
        throw new Error(`Component ${index} is missing required references (category, brand, or model)`);
      }
      
      return {
        category: typeof component.category === 'object' ? component.category._id : component.category,
        brand: typeof component.brand === 'object' ? component.brand._id : component.brand,
        model: typeof component.model === 'object' ? component.model._id : component.model,
        hsn: component.hsn,
        warranty: component.warranty,
        quantity: Number(component.quantity) || 1,
        purchasePrice: Number(component.purchasePrice) || 0,
        salesPrice: Number(component.salesPrice) || 0,
        gstRate: Number(component.gstRate) || 18
      };
    });
    
    // Check if this party already has quotations to determine version
    const existingQuotations = await Quotation.find({ party }).sort({ version: -1 });
    const version = existingQuotations.length > 0 ? existingQuotations[0].version + 1 : 1;
    
    console.log(`Creating quotation version ${version} for party ${partyExists.partyId}`);
    
    const quotationData = {
      party,
      version,
      components: formattedComponents,
      totalAmount: Number(totalAmount) || 0,
      totalPurchase: Number(totalPurchase) || 0,
      totalTax: Number(totalTax) || 0,
      notes: notes || '',
      termsAndConditions: termsAndConditions || '',
      status: status || 'draft'
    };
    
    // If this is not version 1, set the original quote reference
    if (version > 1) {
      const originalQuote = existingQuotations.find(q => q.version === 1);
      if (originalQuote) {
        quotationData.originalQuote = originalQuote._id;
      }
    }
    
    console.log('Final quotation data:', JSON.stringify(quotationData, null, 2));
    
    const quotation = new Quotation(quotationData);
    const newQuotation = await quotation.save();
    
    console.log('Quotation saved successfully:', newQuotation.title);
    
    // Populate the references for the response
    const populatedQuotation = await Quotation.findById(newQuotation._id)
      .populate('party')
      .populate({
        path: 'components.category components.brand components.model',
        select: 'name'
      });
    
    res.status(201).json(populatedQuotation);
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(400).json({ 
      message: error.message,
      details: error.stack,
      name: error.name
    });
  }
};

// Create revised quotation
exports.createRevisedQuotation = async (req, res) => {
  try {
    const originalQuotation = await Quotation.findById(req.params.id).populate('party');
    if (!originalQuotation) {
      return res.status(404).json({ message: 'Original quotation not found' });
    }
    
    // Find the highest version for this party
    const highestVersionQuote = await Quotation.findOne({ 
      party: originalQuotation.party._id 
    }).sort({ version: -1 });
    
    const newVersion = (highestVersionQuote?.version || 0) + 1;
    
    console.log(`Creating revision version ${newVersion} for party ${originalQuotation.party.partyId}`);
    
    // Format components
    const formattedComponents = req.body.components.map(component => {
      return {
        category: typeof component.category === 'object' ? component.category._id : component.category,
        brand: typeof component.brand === 'object' ? component.brand._id : component.brand,
        model: typeof component.model === 'object' ? component.model._id : component.model,
        hsn: component.hsn,
        warranty: component.warranty,
        quantity: Number(component.quantity) || 1,
        purchasePrice: Number(component.purchasePrice) || 0,
        salesPrice: Number(component.salesPrice) || 0,
        gstRate: Number(component.gstRate) || 18
      };
    });
    
    // Find the original quotation (version 1) for this party
    const originalQuote = await Quotation.findOne({ 
      party: originalQuotation.party._id, 
      version: 1 
    });
    
    const quotationData = {
      party: originalQuotation.party._id,
      version: newVersion,
      originalQuote: originalQuote ? originalQuote._id : originalQuotation._id,
      components: formattedComponents,
      totalAmount: Number(req.body.totalAmount) || 0,
      totalPurchase: Number(req.body.totalPurchase) || 0,
      totalTax: Number(req.body.totalTax) || 0,
      notes: req.body.notes || '',
      termsAndConditions: req.body.termsAndConditions || '',
      status: req.body.status || 'draft'
    };
    
    const newQuotation = new Quotation(quotationData);
    const revisedQuotation = await newQuotation.save();
    
    console.log('Revised quotation saved successfully:', revisedQuotation.title);
    
    const populatedQuotation = await Quotation.findById(revisedQuotation._id)
      .populate('party')
      .populate('originalQuote')
      .populate({
        path: 'components.category components.brand components.model',
        select: 'name'
      });
    
    res.status(201).json(populatedQuotation);
  } catch (error) {
    console.error('Error creating revised quotation:', error);
    res.status(400).json({ message: error.message, details: error.stack });
  }
};

// Update quotation
exports.updateQuotation = async (req, res) => {
  try {
    // Format components if they exist
    if (req.body.components) {
      req.body.components = req.body.components.map(component => {
        return {
          category: typeof component.category === 'object' ? component.category._id : component.category,
          brand: typeof component.brand === 'object' ? component.brand._id : component.brand,
          model: typeof component.model === 'object' ? component.model._id : component.model,
          hsn: component.hsn,
          warranty: component.warranty,
          quantity: Number(component.quantity) || 1,
          purchasePrice: Number(component.purchasePrice) || 0,
          salesPrice: Number(component.salesPrice) || 0,
          gstRate: Number(component.gstRate) || 18
        };
      });
    }
    
    // Convert number fields
    if (req.body.totalAmount) req.body.totalAmount = Number(req.body.totalAmount);
    if (req.body.totalPurchase) req.body.totalPurchase = Number(req.body.totalPurchase);
    if (req.body.totalTax) req.body.totalTax = Number(req.body.totalTax);
    
    // Don't allow updating party, version, or originalQuote
    const { party, version, originalQuote, ...updateData } = req.body;
    
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('party')
      .populate('originalQuote')
      .populate({
        path: 'components.category components.brand components.model',
        select: 'name'
      });
    
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
    
    console.log('Quotation updated successfully:', quotation.title);
    res.json(quotation);
  } catch (error) {
    console.error('Error updating quotation:', error);
    res.status(400).json({ message: error.message });
  }
};

// Delete quotation
exports.deleteQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id).populate('party');
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
    
    console.log('Deleting quotation:', quotation.title);
    
    await Quotation.findByIdAndDelete(req.params.id);
    res.json({ 
      message: 'Quotation deleted successfully',
      deletedQuotationTitle: quotation.title 
    });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get quotation statistics
exports.getQuotationStats = async (req, res) => {
  try {
    const stats = await Quotation.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    const totalQuotations = await Quotation.countDocuments();
    
    res.json({
      totalQuotations,
      statusBreakdown: stats
    });
  } catch (error) {
    console.error('Error fetching quotation stats:', error);
    res.status(500).json({ message: error.message });
  }
};