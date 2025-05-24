// server/models/Quotation.js
const mongoose = require('mongoose');

// Define the ComponentSchema directly inside the Quotation.js file
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
    required: true
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
    required: true
  },
  salesPrice: {
    type: Number,
    required: true
  },
  gstRate: {
    type: Number,
    required: true
  }
}, { _id: false }); // Disable auto _id for subdocuments

const QuotationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    default: function() {
      return `quote-temp-${Date.now()}`;
    }
  },
  party: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: true
  },
  version: {
    type: Number,
    required: true,
    default: 1
  },
  originalQuote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation',
    default: null // null means it's an original quote
  },
  components: [ComponentSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  totalPurchase: {
    type: Number,
    required: true
  },
  totalTax: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  termsAndConditions: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'sent', 'lost', 'sold'],
    default: 'draft'
  }
}, { timestamps: true });

// Pre-save middleware to generate title based on party ID and version
QuotationSchema.pre('save', async function(next) {
  try {
    if (this.party) {
      const Party = mongoose.model('Party');
      const party = await Party.findById(this.party);
      
      if (party && party.partyId) {
        if (this.version === 1) {
          // For version 1, just use quote-partyId (e.g., quote-P0001)
          this.title = `quote-${party.partyId}`;
        } else {
          // For versions > 1, use quote-partyId-V{version} (e.g., quote-P0001-V2)
          this.title = `quote-${party.partyId}-V${this.version}`;
        }
      } else {
        // Fallback if party or partyId not found
        this.title = `quote-unknown-${Date.now()}`;
      }
    }
    
    console.log('Generated quotation title:', this.title);
    next();
  } catch (error) {
    console.error('Error in quotation pre-save hook:', error);
    this.title = `quote-error-${Date.now()}`;
    next();
  }
});

// Index for better performance
QuotationSchema.index({ party: 1, version: 1 });
QuotationSchema.index({ title: 1 });

module.exports = mongoose.model('Quotation', QuotationSchema);