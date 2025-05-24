// =====================================
// server/routes/api/parties.js
// =====================================
const express = require('express');
const router = express.Router();
const partyController = require('../../controllers/partyController');

// Add logging middleware for debugging
router.use((req, res, next) => {
  console.log(`🔄 Parties route: ${req.method} ${req.originalUrl}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('📦 Request body keys:', Object.keys(req.body));
  }
  next();
});

// GET /api/parties - Get all parties
router.get('/', partyController.getParties);

// GET /api/parties/stats - Get party statistics
router.get('/stats', partyController.getPartyStats);

// POST /api/parties/reset - Reset party sequence (development only)
router.post('/reset', partyController.resetPartySequence);

// GET /api/parties/partyId/:partyId - Get party by partyId (e.g., P0001)
router.get('/partyId/:partyId', partyController.getPartyByPartyId);

// GET /api/parties/:id - Get single party by MongoDB _id
router.get('/:id', partyController.getPartyById);

// POST /api/parties - Create new party
router.post('/', partyController.createParty);

// PUT /api/parties/:id - Update party
router.put('/:id', partyController.updateParty);

// DELETE /api/parties/:id - Delete party
router.delete('/:id', partyController.deleteParty);

module.exports = router;