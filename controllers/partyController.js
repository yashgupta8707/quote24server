// =====================================
// server/controllers/partyController.js
// =====================================
const Party = require('../models/Party');

// Safely import Quotation model (might not exist yet)
let Quotation;
try {
  Quotation = require('../models/Quotation');
} catch (error) {
  console.warn('⚠️ Quotation model not found, some features will be limited');
  Quotation = null;
}

// Get all parties
exports.getParties = async (req, res) => {
  try {
    console.log('📋 Getting all parties...');
    const parties = await Party.find().sort({ partyId: 1 });
    console.log(`✅ Retrieved ${parties.length} parties`);
    res.json(parties);
  } catch (error) {
    console.error('❌ Error fetching parties:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single party
exports.getPartyById = async (req, res) => {
  try {
    console.log('🔍 Getting party by ID:', req.params.id);
    const party = await Party.findById(req.params.id);
    if (!party) {
      console.log('❌ Party not found');
      return res.status(404).json({ message: 'Party not found' });
    }
    console.log('✅ Party found:', party.partyId);
    res.json(party);
  } catch (error) {
    console.error('❌ Error fetching party:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get party by partyId
exports.getPartyByPartyId = async (req, res) => {
  try {
    console.log('🔍 Getting party by partyId:', req.params.partyId);
    const party = await Party.findOne({ partyId: req.params.partyId });
    if (!party) {
      console.log('❌ Party not found with partyId:', req.params.partyId);
      return res.status(404).json({ message: 'Party not found' });
    }
    console.log('✅ Party found:', party.partyId);
    res.json(party);
  } catch (error) {
    console.error('❌ Error fetching party by partyId:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create new party - ENHANCED VERSION
exports.createParty = async (req, res) => {
  try {
    console.log('🆕 === CREATING NEW PARTY ===');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📝 Content-Type:', req.headers['content-type']);
    
    // Validate required fields
    const { name, phone, address, email } = req.body;
    
    // Check if request body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('❌ Empty request body');
      return res.status(400).json({ 
        message: 'Request body is empty',
        type: 'empty_body'
      });
    }
    
    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      console.log('❌ Validation failed: Name is required');
      return res.status(400).json({ 
        message: 'Name is required and must be a non-empty string',
        field: 'name',
        received: { name, type: typeof name }
      });
    }
    
    // Validate phone
    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      console.log('❌ Validation failed: Phone is required');
      return res.status(400).json({ 
        message: 'Phone is required and must be a non-empty string',
        field: 'phone',
        received: { phone, type: typeof phone }
      });
    }
    
    // Validate address
    if (!address || typeof address !== 'string' || address.trim() === '') {
      console.log('❌ Validation failed: Address is required');
      return res.status(400).json({ 
        message: 'Address is required and must be a non-empty string',
        field: 'address',
        received: { address, type: typeof address }
      });
    }
    
    // Prepare clean data (don't include partyId - it will be auto-generated)
    const partyData = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim()
    };
    
    // Add email if provided and valid
    if (email && typeof email === 'string' && email.trim() !== '') {
      partyData.email = email.trim();
    }
    
    console.log('✨ Creating party with cleaned data:', partyData);
    console.log('💾 Attempting to save to database...');
    
    // Create and save party
    const party = new Party(partyData);
    const newParty = await party.save();
    
    console.log('🎉 Party created successfully!');
    console.log('📋 Party details:', {
      _id: newParty._id,
      partyId: newParty.partyId,
      name: newParty.name,
      phone: newParty.phone
    });
    console.log('✅ === PARTY CREATION SUCCESS ===');
    
    res.status(201).json(newParty);
    
  } catch (error) {
    console.error('❌ === PARTY CREATION ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
    console.error('Full error stack:', error.stack);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      console.error('📋 Duplicate key error details:', error.keyPattern, error.keyValue);
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `A party with this ${field} already exists`,
        field: field,
        type: 'duplicate',
        value: error.keyValue
      });
    }
    
    if (error.name === 'ValidationError') {
      console.error('📋 Validation error details:', error.errors);
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value,
        kind: err.kind
      }));
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors,
        type: 'validation'
      });
    }
    
    if (error.name === 'CastError') {
      console.error('📋 Cast error - invalid data type');
      return res.status(400).json({ 
        message: 'Invalid data type provided',
        field: error.path,
        type: 'cast_error',
        value: error.value
      });
    }
    
    // Generic error
    console.error('📋 Generic/Unknown error occurred');
    res.status(500).json({ 
      message: error.message || 'Failed to create party',
      type: 'server_error',
      name: error.name,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update party
exports.updateParty = async (req, res) => {
  try {
    console.log('📝 Updating party:', req.params.id);
    console.log('📝 Update data:', JSON.stringify(req.body, null, 2));
    
    // Don't allow updating partyId once it's set
    const { partyId, ...updateData } = req.body;
    
    // Validate fields if they are being updated
    if (updateData.name !== undefined && (!updateData.name || updateData.name.trim() === '')) {
      return res.status(400).json({ message: 'Name cannot be empty' });
    }
    if (updateData.phone !== undefined && (!updateData.phone || updateData.phone.trim() === '')) {
      return res.status(400).json({ message: 'Phone cannot be empty' });
    }
    if (updateData.address !== undefined && (!updateData.address || updateData.address.trim() === '')) {
      return res.status(400).json({ message: 'Address cannot be empty' });
    }
    
    const party = await Party.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!party) {
      console.log('❌ Party not found for update');
      return res.status(404).json({ message: 'Party not found' });
    }
    
    console.log('✅ Party updated successfully:', party.partyId);
    res.json(party);
  } catch (error) {
    console.error('❌ Error updating party:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(400).json({ message: error.message });
  }
};

// Delete party
exports.deleteParty = async (req, res) => {
  try {
    console.log('🗑️ Deleting party:', req.params.id);
    
    const party = await Party.findById(req.params.id);
    if (!party) {
      console.log('❌ Party not found for deletion');
      return res.status(404).json({ message: 'Party not found' });
    }
    
    // Check if party has associated quotations (only if Quotation model exists)
    let quotationCount = 0;
    if (Quotation) {
      try {
        quotationCount = await Quotation.countDocuments({ party: req.params.id });
        console.log(`📊 Found ${quotationCount} quotations for this party`);
      } catch (error) {
        console.warn('⚠️ Error checking quotations:', error.message);
      }
    } else {
      console.log('ℹ️ Quotation model not available, skipping quotation check');
    }
    
    if (quotationCount > 0) {
      console.log(`❌ Cannot delete party: ${quotationCount} quotations exist`);
      return res.status(400).json({ 
        message: `Cannot delete party. There are ${quotationCount} quotation(s) associated with this party. Please delete the quotations first.` 
      });
    }
    
    await Party.findByIdAndDelete(req.params.id);
    console.log('✅ Party deleted successfully:', party.partyId);
    
    res.json({ 
      message: 'Party deleted successfully',
      deletedPartyId: party.partyId 
    });
  } catch (error) {
    console.error('❌ Error deleting party:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get party statistics
exports.getPartyStats = async (req, res) => {
  try {
    console.log('📊 Getting party statistics...');
    
    const totalParties = await Party.countDocuments();
    let partiesWithQuotationsCount = 0;
    
    if (Quotation) {
      try {
        const partiesWithQuotations = await Party.aggregate([
          {
            $lookup: {
              from: 'quotations',
              localField: '_id',
              foreignField: 'party',
              as: 'quotations'
            }
          },
          {
            $match: {
              'quotations.0': { $exists: true }
            }
          },
          {
            $count: 'count'
          }
        ]);
        
        partiesWithQuotationsCount = partiesWithQuotations[0]?.count || 0;
      } catch (error) {
        console.warn('⚠️ Error in quotation aggregation:', error.message);
      }
    } else {
      console.log('ℹ️ Quotation model not available, skipping quotation stats');
    }
    
    const stats = {
      totalParties,
      partiesWithQuotations: partiesWithQuotationsCount,
      partiesWithoutQuotations: totalParties - partiesWithQuotationsCount,
      quotationModelAvailable: !!Quotation
    };
    
    console.log('📊 Party stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Error fetching party stats:', error);
    res.status(500).json({ message: error.message });
  }
};

// Reset party sequence (use with caution - for development only)
exports.resetPartySequence = async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: 'This operation is only allowed in development mode' });
    }
    
    console.log('🔄 Resetting party sequence...');
    
    // Delete all quotations first (if model exists)
    if (Quotation) {
      try {
        const deletedQuotations = await Quotation.deleteMany({});
        console.log(`🗑️ Deleted ${deletedQuotations.deletedCount} quotations`);
      } catch (error) {
        console.warn('⚠️ Error deleting quotations:', error.message);
      }
    }
    
    // Delete all parties
    const deletedParties = await Party.deleteMany({});
    console.log(`🗑️ Deleted ${deletedParties.deletedCount} parties`);
    
    console.log('✅ Party sequence reset complete');
    res.json({ 
      message: 'All parties and quotations have been reset. Next party will start from P0001.',
      deletedParties: deletedParties.deletedCount,
      quotationModelAvailable: !!Quotation
    });
  } catch (error) {
    console.error('❌ Error resetting party sequence:', error);
    res.status(500).json({ message: error.message });
  }
};
