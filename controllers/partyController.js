// server/controllers/partyController.js - Enhanced with CRM features
const Party = require('../models/Party');

// Safely import Quotation model (might not exist yet)
let Quotation;
try {
  Quotation = require('../models/Quotation');
} catch (error) {
  console.warn('⚠️ Quotation model not found, some features will be limited');
  Quotation = null;
}

// Get all parties with enhanced filtering
exports.getParties = async (req, res) => {
  try {
    console.log('📋 Getting all parties with filters...');
    
    const {
      dateFilter, // today, yesterday, this_week, this_month, custom
      startDate,
      endDate,
      source,
      priority,
      dealStatus,
      followUpDate,
      search,
      page = 1,
      limit = 50
    } = req.query;

    // Build filter object
    let filter = { isActive: true };
    
    // Date filtering
    if (dateFilter) {
      const now = new Date();
      let dateRange = {};
      
      switch (dateFilter) {
        case 'today':
          const startOfToday = new Date(now);
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date(now);
          endOfToday.setHours(23, 59, 59, 999);
          dateRange = { $gte: startOfToday, $lte: endOfToday };
          break;
          
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const startOfYesterday = new Date(yesterday);
          startOfYesterday.setHours(0, 0, 0, 0);
          const endOfYesterday = new Date(yesterday);
          endOfYesterday.setHours(23, 59, 59, 999);
          dateRange = { $gte: startOfYesterday, $lte: endOfYesterday };
          break;
          
        case 'this_week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          dateRange = { $gte: startOfWeek };
          break;
          
        case 'this_month':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          dateRange = { $gte: startOfMonth };
          break;
          
        case 'custom':
          if (startDate && endDate) {
            dateRange = {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            };
          }
          break;
      }
      
      if (Object.keys(dateRange).length > 0) {
        filter.createdAt = dateRange;
      }
    }
    
    // Other filters
    if (source) filter.source = source;
    if (priority) filter.priority = priority;
    if (dealStatus) filter.dealStatus = dealStatus;
    
    // Follow-up date filter
    if (followUpDate) {
      const followUpStart = new Date(followUpDate);
      followUpStart.setHours(0, 0, 0, 0);
      const followUpEnd = new Date(followUpDate);
      followUpEnd.setHours(23, 59, 59, 999);
      filter['nextFollowUp.date'] = { $gte: followUpStart, $lte: followUpEnd };
    }
    
    // Search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { partyId: searchRegex },
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { address: searchRegex },
        { requirements: searchRegex }
      ];
    }

    // Execute query with pagination
    const parties = await Party.find(filter)
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .populate('comments.commentedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Party.countDocuments(filter);
    
    console.log(`✅ Retrieved ${parties.length} parties out of ${total} total`);
    
    res.json({
      parties,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      },
      filters: {
        dateFilter,
        source,
        priority,
        dealStatus,
        followUpDate,
        search
      }
    });
  } catch (error) {
    console.error('❌ Error fetching parties:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single party with full details
exports.getPartyById = async (req, res) => {
  try {
    console.log('🔍 Getting party by ID:', req.params.id);
    const party = await Party.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .populate('comments.commentedBy', 'name email')
      .populate('followUps.createdBy', 'name email')
      .populate('followUps.completedBy', 'name email');
      
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

// Create new party - Enhanced version
exports.createParty = async (req, res) => {
  try {
    console.log('🆕 === CREATING NEW PARTY ===');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    
    const { 
      name, 
      phone, 
      address, 
      email, 
      source = 'walk-in',
      priority = 'medium',
      requirements = '',
      tags = [],
      initialComment
    } = req.body;
    
    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ 
        message: 'Name is required and must be a non-empty string',
        field: 'name'
      });
    }
    
    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      return res.status(400).json({ 
        message: 'Phone is required and must be a non-empty string',
        field: 'phone'
      });
    }
    
    if (!address || typeof address !== 'string' || address.trim() === '') {
      return res.status(400).json({ 
        message: 'Address is required and must be a non-empty string',
        field: 'address'
      });
    }

    // Prepare party data
    const partyData = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      source,
      priority,
      requirements: requirements.trim(),
      tags: Array.isArray(tags) ? tags.filter(tag => tag.trim()) : [],
      createdBy: req.user?.id, // Assuming auth middleware sets req.user
      lastUpdatedBy: req.user?.id
    };
    
    if (email && typeof email === 'string' && email.trim() !== '') {
      partyData.email = email.trim();
    }
    
    console.log('✨ Creating party with data:', partyData);
    
    const party = new Party(partyData);
    const newParty = await party.save();
    
    // Add initial comment if provided
    if (initialComment && initialComment.trim()) {
      await newParty.addComment(
        initialComment.trim(),
        req.user?.id,
        req.user?.name || 'System',
        'comment'
      );
    }
    
    // Populate the response
    const populatedParty = await Party.findById(newParty._id)
      .populate('createdBy', 'name email')
      .populate('comments.commentedBy', 'name email');
    
    console.log('🎉 Party created successfully!');
    res.status(201).json(populatedParty);
    
  } catch (error) {
    console.error('❌ === PARTY CREATION ERROR ===');
    console.error('Error details:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `A party with this ${field} already exists`,
        field: field,
        type: 'duplicate'
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors,
        type: 'validation'
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Failed to create party',
      type: 'server_error'
    });
  }
};

// Update party with change tracking
exports.updateParty = async (req, res) => {
  try {
    console.log('📝 Updating party:', req.params.id);
    
    const party = await Party.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }
    
    const { 
      name, 
      phone, 
      address, 
      email, 
      source,
      priority,
      requirements,
      dealStatus,
      tags,
      changeComment
    } = req.body;
    
    // Track changes for audit trail
    const changes = [];
    
    if (priority && priority !== party.priority) {
      changes.push({
        field: 'priority',
        oldValue: party.priority,
        newValue: priority
      });
      party.priority = priority;
    }
    
    if (dealStatus && dealStatus !== party.dealStatus) {
      changes.push({
        field: 'dealStatus',
        oldValue: party.dealStatus,
        newValue: dealStatus
      });
      party.dealStatus = dealStatus;
    }
    
    if (source && source !== party.source) {
      changes.push({
        field: 'source',
        oldValue: party.source,
        newValue: source
      });
      party.source = source;
    }
    
    // Update other fields
    if (name !== undefined) party.name = name.trim();
    if (phone !== undefined) party.phone = phone.trim();
    if (address !== undefined) party.address = address.trim();
    if (email !== undefined) party.email = email ? email.trim() : '';
    if (requirements !== undefined) party.requirements = requirements.trim();
    if (tags !== undefined) party.tags = Array.isArray(tags) ? tags.filter(tag => tag.trim()) : [];
    
    party.lastUpdatedBy = req.user?.id;
    
    await party.save();
    
    // Add change comments
    for (const change of changes) {
      await party.addComment(
        `${change.field} changed from "${change.oldValue}" to "${change.newValue}"`,
        req.user?.id,
        req.user?.name || 'System',
        `${change.field}_change`,
        change
      );
    }
    
    // Add manual comment if provided
    if (changeComment && changeComment.trim()) {
      await party.addComment(
        changeComment.trim(),
        req.user?.id,
        req.user?.name || 'System',
        'comment'
      );
    }
    
    const updatedParty = await Party.findById(party._id)
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .populate('comments.commentedBy', 'name email');
    
    console.log('✅ Party updated successfully:', party.partyId);
    res.json(updatedParty);
    
  } catch (error) {
    console.error('❌ Error updating party:', error);
    res.status(400).json({ message: error.message });
  }
};

// Add comment to party
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, type = 'comment' } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Comment message is required' });
    }
    
    const party = await Party.findById(id);
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }
    
    await party.addComment(
      message.trim(),
      req.user?.id,
      req.user?.name || 'System',
      type
    );
    
    const updatedParty = await Party.findById(id)
      .populate('comments.commentedBy', 'name email');
    
    res.json({
      message: 'Comment added successfully',
      comments: updatedParty.comments
    });
    
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add follow-up
exports.addFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, note } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: 'Follow-up date is required' });
    }
    
    const party = await Party.findById(id);
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }
    
    await party.addFollowUp(new Date(date), note || '', req.user?.id);
    
    // Add comment about follow-up
    await party.addComment(
      `Follow-up scheduled for ${new Date(date).toLocaleDateString()}${note ? ': ' + note : ''}`,
      req.user?.id,
      req.user?.name || 'System',
      'follow_up'
    );
    
    const updatedParty = await Party.findById(id)
      .populate('followUps.createdBy', 'name email');
    
    res.json({
      message: 'Follow-up added successfully',
      followUps: updatedParty.followUps,
      nextFollowUp: updatedParty.nextFollowUp
    });
    
  } catch (error) {
    console.error('❌ Error adding follow-up:', error);
    res.status(500).json({ message: error.message });
  }
};

// Complete follow-up
exports.completeFollowUp = async (req, res) => {
  try {
    const { id, followUpId } = req.params;
    const { completionNote } = req.body;
    
    const party = await Party.findById(id);
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }
    
    await party.completeFollowUp(followUpId, req.user?.id);
    
    if (completionNote && completionNote.trim()) {
      await party.addComment(
        `Follow-up completed: ${completionNote.trim()}`,
        req.user?.id,
        req.user?.name || 'System',
        'follow_up'
      );
    }
    
    res.json({ message: 'Follow-up completed successfully' });
    
  } catch (error) {
    console.error('❌ Error completing follow-up:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get today's follow-ups
exports.getTodaysFollowUps = async (req, res) => {
  try {
    const parties = await Party.getUpcomingFollowUps(new Date());
    res.json(parties);
  } catch (error) {
    console.error('❌ Error fetching today\'s follow-ups:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get overdue follow-ups
exports.getOverdueFollowUps = async (req, res) => {
  try {
    const parties = await Party.getOverdueFollowUps();
    res.json(parties);
  } catch (error) {
    console.error('❌ Error fetching overdue follow-ups:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete party (existing method, unchanged)
exports.deleteParty = async (req, res) => {
  try {
    console.log('🗑️ Deleting party:', req.params.id);
    
    const party = await Party.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }
    
    // Check quotations
    let quotationCount = 0;
    if (Quotation) {
      try {
        quotationCount = await Quotation.countDocuments({ party: req.params.id });
      } catch (error) {
        console.warn('⚠️ Error checking quotations:', error.message);
      }
    }
    
    if (quotationCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete party. There are ${quotationCount} quotation(s) associated with this party.` 
      });
    }
    
    await Party.findByIdAndDelete(req.params.id);
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
    const stats = await Party.aggregate([
      {
        $group: {
          _id: null,
          totalParties: { $sum: 1 },
          activeParties: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          bySource: {
            $push: {
              source: '$source',
              count: 1
            }
          },
          byPriority: {
            $push: {
              priority: '$priority',
              count: 1
            }
          },
          byDealStatus: {
            $push: {
              status: '$dealStatus',
              count: 1
            }
          }
        }
      }
    ]);
    
    // Get follow-up stats
    const todaysFollowUps = await Party.getUpcomingFollowUps();
    const overdueFollowUps = await Party.getOverdueFollowUps();
    
    const response = {
      ...stats[0],
      followUpStats: {
        todaysFollowUps: todaysFollowUps.length,
        overdueFollowUps: overdueFollowUps.length
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error fetching party stats:', error);
    res.status(500).json({ message: error.message });
  }
};