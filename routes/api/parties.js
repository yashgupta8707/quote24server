// server/routes/parties.js - Enhanced routes for CRM features
const express = require('express');
const router = express.Router();
const partyController = require('../../controllers/partyController');

// Middleware for authentication (implement based on your auth system)
const authMiddleware = (req, res, next) => {
  // Add your authentication logic here
  // For now, we'll mock a user
  req.user = {
    id: 'mock-user-id',
    name: 'Mock User',
    email: 'user@example.com'
  };
  next();
};

// Basic CRUD routes
router.get('/', partyController.getParties);
router.get('/stats', partyController.getPartyStats);
router.get('/:id', partyController.getPartyById);
router.get('/partyId/:partyId', partyController.getPartyByPartyId);
router.post('/', authMiddleware, partyController.createParty);
router.put('/:id', authMiddleware, partyController.updateParty);
router.delete('/:id', authMiddleware, partyController.deleteParty);

// CRM-specific routes

// Comment/Note management
router.post('/:id/comments', authMiddleware, partyController.addComment);

// Follow-up management
router.post('/:id/follow-ups', authMiddleware, partyController.addFollowUp);
router.put('/:id/follow-ups/:followUpId/complete', authMiddleware, partyController.completeFollowUp);
router.get('/follow-ups/today', partyController.getTodaysFollowUps);
router.get('/follow-ups/overdue', partyController.getOverdueFollowUps);

// Development/Admin routes
router.post('/reset-sequence', partyController.resetPartySequence);

module.exports = router;

// // server/routes/api.js - Main API router
// const express = require('express');
// const router = express.Router();

// // Import route modules
// const partyRoutes = require('./parties');
// const quotationRoutes = require('./quotations');
// const componentRoutes = require('./components');

// // Use route modules
// router.use('/parties', partyRoutes);
// router.use('/quotations', quotationRoutes);
// router.use('/components', componentRoutes);

// // Health check endpoint
// router.get('/health', (req, res) => {
//   res.json({ 
//     status: 'OK', 
//     timestamp: new Date().toISOString(),
//     version: '2.0.0' 
//   });
// });

// module.exports = router;