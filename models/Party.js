// server/models/Party.js
const mongoose = require('mongoose');

const PartySchema = new mongoose.Schema({
  partyId: {
    type: String,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [1, 'Name cannot be empty']
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true,
    minlength: [1, 'Phone cannot be empty']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    minlength: [1, 'Address cannot be empty']
  },
  email: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Email is optional, but if provided, it should be valid
        if (!v || v === '') return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware to generate partyId
PartySchema.pre('save', async function(next) {
  // Only generate partyId if it's not already set (for new documents)
  if (!this.partyId && this.isNew) {
    try {
      console.log('🔢 Generating new partyId...');
      
      // Find the latest party by partyId to get the highest number
      const lastParty = await this.constructor.findOne(
        { partyId: { $exists: true, $ne: null } }, 
        {}, 
        { sort: { partyId: -1 } }
      );
      
      let nextNumber = 1;
      
      if (lastParty && lastParty.partyId) {
        console.log('📋 Last party found:', lastParty.partyId);
        // Extract number from partyId (e.g., "P0001" -> 1, "P0010" -> 10)
        const match = lastParty.partyId.match(/^P(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        } else {
          console.warn('⚠️ Invalid partyId format found:', lastParty.partyId);
          // Fallback: count all parties and add 1
          const count = await this.constructor.countDocuments();
          nextNumber = count + 1;
        }
      } else {
        console.log('📋 No existing parties found, starting from P0001');
      }
      
      // Generate new partyId with zero-padding (P0001, P0002, etc.)
      this.partyId = `P${nextNumber.toString().padStart(4, '0')}`;
      
      console.log('✅ Generated partyId:', this.partyId);
      
    } catch (error) {
      console.error('❌ Error generating partyId:', error);
      // Fallback: use timestamp-based ID to avoid conflicts
      this.partyId = `P${Date.now().toString().slice(-4)}`;
      console.log('🔄 Fallback partyId generated:', this.partyId);
    }
  }
  
  next();
});

// Post-save middleware for logging
PartySchema.post('save', function(doc, next) {
  console.log('✅ Party saved to database:', {
    _id: doc._id,
    partyId: doc.partyId,
    name: doc.name
  });
  next();
});

// Index for better performance
PartySchema.index({ partyId: 1 });
PartySchema.index({ createdAt: -1 });
PartySchema.index({ name: 1 });

// Ensure partyId is unique with a compound index
PartySchema.index({ partyId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Party', PartySchema);