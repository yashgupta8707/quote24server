// server/models/Party.js - Enhanced with CRM features
const mongoose = require('mongoose');

// Comment/Trail Schema for tracking communication history
const CommentSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'Comment message is required'],
    trim: true
  },
  commentedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  commentedByName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['comment', 'status_change', 'priority_change', 'follow_up', 'requirement_update'],
    default: 'comment'
  },
  metadata: {
    oldValue: String,
    newValue: String
  }
}, { 
  timestamps: true 
});

// Follow-up Schema
const FollowUpSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  note: {
    type: String,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { 
  timestamps: true 
});

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
        if (!v || v === '') return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  
  // New CRM Fields
  source: {
    type: String,
    enum: ['instagram', 'linkedin', 'whatsapp', 'walk-in', 'referral', 'website', 'other'],
    default: 'walk-in'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  requirements: {
    type: String,
    trim: true,
    default: ''
  },
  dealStatus: {
    type: String,
    enum: ['in_progress', 'won', 'lost', 'on_hold'],
    default: 'in_progress'
  },
  
  // Communication Trail
  comments: [CommentSchema],
  
  // Follow-up Management
  followUps: [FollowUpSchema],
  nextFollowUp: {
    date: Date,
    note: String
  },
  
  // Tracking fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Status tracking
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for priority color
PartySchema.virtual('priorityColor').get(function() {
  const colors = {
    low: 'success',
    medium: 'warning', 
    high: 'danger'
  };
  return colors[this.priority] || 'secondary';
});

// Virtual for deal status color
PartySchema.virtual('dealStatusColor').get(function() {
  const colors = {
    in_progress: 'primary',
    won: 'success',
    lost: 'danger',
    on_hold: 'warning'
  };
  return colors[this.dealStatus] || 'secondary';
});

// Virtual for overdue follow-ups
PartySchema.virtual('isFollowUpOverdue').get(function() {
  return this.nextFollowUp?.date && new Date(this.nextFollowUp.date) < new Date();
});

// Pre-save middleware to generate partyId
PartySchema.pre('save', async function(next) {
  if (!this.partyId && this.isNew) {
    try {
      console.log('🔢 Generating new partyId...');
      
      const lastParty = await this.constructor.findOne(
        { partyId: { $exists: true, $ne: null } }, 
        {}, 
        { sort: { partyId: -1 } }
      );
      
      let nextNumber = 1;
      
      if (lastParty && lastParty.partyId) {
        const match = lastParty.partyId.match(/^P(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        } else {
          const count = await this.constructor.countDocuments();
          nextNumber = count + 1;
        }
      }
      
      this.partyId = `P${nextNumber.toString().padStart(4, '0')}`;
      console.log('✅ Generated partyId:', this.partyId);
      
    } catch (error) {
      console.error('❌ Error generating partyId:', error);
      this.partyId = `P${Date.now().toString().slice(-4)}`;
    }
  }
  
  next();
});

// Post-save middleware for logging
PartySchema.post('save', function(doc, next) {
  console.log('✅ Party saved to database:', {
    _id: doc._id,
    partyId: doc.partyId,
    name: doc.name,
    dealStatus: doc.dealStatus
  });
  next();
});

// Indexes for better performance
PartySchema.index({ partyId: 1 }, { unique: true, sparse: true });
PartySchema.index({ createdAt: -1 });
PartySchema.index({ name: 1 });
PartySchema.index({ dealStatus: 1 });
PartySchema.index({ priority: 1 });
PartySchema.index({ source: 1 });
PartySchema.index({ 'nextFollowUp.date': 1 });
PartySchema.index({ isActive: 1 });

// Methods
PartySchema.methods.addComment = function(message, userId, userName, type = 'comment', metadata = null) {
  this.comments.push({
    message,
    commentedBy: userId,
    commentedByName: userName,
    type,
    metadata
  });
  this.lastUpdatedBy = userId;
  return this.save();
};

PartySchema.methods.addFollowUp = function(date, note, userId) {
  this.followUps.push({
    date,
    note,
    createdBy: userId
  });
  
  // Update next follow-up if this is the nearest future date
  if (!this.nextFollowUp?.date || new Date(date) < new Date(this.nextFollowUp.date)) {
    this.nextFollowUp = { date, note };
  }
  
  return this.save();
};

PartySchema.methods.completeFollowUp = function(followUpId, userId) {
  const followUp = this.followUps.id(followUpId);
  if (followUp) {
    followUp.completed = true;
    followUp.completedAt = new Date();
    followUp.completedBy = userId;
    
    // Update next follow-up to the next pending one
    const nextPending = this.followUps
      .filter(f => !f.completed && new Date(f.date) > new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    
    this.nextFollowUp = nextPending ? { date: nextPending.date, note: nextPending.note } : null;
  }
  
  return this.save();
};

// Static methods
PartySchema.statics.getUpcomingFollowUps = function(date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    'nextFollowUp.date': {
      $gte: startOfDay,
      $lte: endOfDay
    },
    isActive: true
  }).sort({ 'nextFollowUp.date': 1 });
};

PartySchema.statics.getOverdueFollowUps = function() {
  return this.find({
    'nextFollowUp.date': { $lt: new Date() },
    isActive: true
  }).sort({ 'nextFollowUp.date': 1 });
};

module.exports = mongoose.model('Party', PartySchema);