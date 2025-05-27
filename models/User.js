// server/models/User.js - User model for authentication and activity tracking
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'sales', 'user'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  
  // Activity tracking
  lastLoginAt: Date,
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  
  // Permissions and settings
  permissions: [{
    module: {
      type: String,
      enum: ['parties', 'quotations', 'components', 'reports', 'settings', 'users'],
      required: true
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'export', 'import'],
      required: true
    }]
  }],
  
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      browser: {
        type: Boolean,
        default: true
      },
      followUpReminders: {
        type: Boolean,
        default: true
      },
      quotationUpdates: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Two-factor authentication
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  
  // Failed login attempts
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: Date
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.twoFactorSecret;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for full name
UserSchema.virtual('displayName').get(function() {
  return this.name;
});

// Virtual for checking if account is locked
UserSchema.virtual('isLocked').get(function() {
  return !!(this.failedLoginAttempts >= 5 && this.accountLockedUntil && Date.now() < this.accountLockedUntil);
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set default permissions based on role
UserSchema.pre('save', function(next) {
  if (this.isNew && this.permissions.length === 0) {
    const defaultPermissions = {
      admin: [
        { module: 'parties', actions: ['create', 'read', 'update', 'delete', 'export', 'import'] },
        { module: 'quotations', actions: ['create', 'read', 'update', 'delete', 'export', 'import'] },
        { module: 'components', actions: ['create', 'read', 'update', 'delete', 'export', 'import'] },
        { module: 'reports', actions: ['read', 'export'] },
        { module: 'settings', actions: ['read', 'update'] },
        { module: 'users', actions: ['create', 'read', 'update', 'delete'] }
      ],
      manager: [
        { module: 'parties', actions: ['create', 'read', 'update', 'delete', 'export'] },
        { module: 'quotations', actions: ['create', 'read', 'update', 'delete', 'export'] },
        { module: 'components', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'reports', actions: ['read', 'export'] },
        { module: 'settings', actions: ['read'] }
      ],
      sales: [
        { module: 'parties', actions: ['create', 'read', 'update'] },
        { module: 'quotations', actions: ['create', 'read', 'update'] },
        { module: 'components', actions: ['read'] },
        { module: 'reports', actions: ['read'] }
      ],
      user: [
        { module: 'parties', actions: ['read'] },
        { module: 'quotations', actions: ['read'] },
        { module: 'components', actions: ['read'] }
      ]
    };
    
    this.permissions = defaultPermissions[this.role] || defaultPermissions.user;
  }
  next();
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to check permissions
UserSchema.methods.hasPermission = function(module, action) {
  const modulePermission = this.permissions.find(p => p.module === module);
  return modulePermission && modulePermission.actions.includes(action);
};

// Instance method to update last active time
UserSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// Instance method to increment login count
UserSchema.methods.recordLogin = function() {
  this.lastLoginAt = new Date();
  this.loginCount += 1;
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = undefined;
  return this.save();
};

// Instance method to handle failed login
UserSchema.methods.incFailedLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.accountLockedUntil && this.accountLockedUntil < Date.now()) {
    return this.updateOne({
      $unset: { accountLockedUntil: 1 },
      $set: { failedLoginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { failedLoginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { accountLockedUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Static method to find by email
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to get active users
UserSchema.statics.getActiveUsers = function() {
  return this.find({ isActive: true }).select('-password');
};

// Static method to get users by role
UserSchema.statics.getUsersByRole = function(role) {
  return this.find({ role, isActive: true }).select('-password');
};

// Indexes for better performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ lastActiveAt: -1 });
UserSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', UserSchema);