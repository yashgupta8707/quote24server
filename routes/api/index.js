// server/routes/api/index.js
const express = require('express');
const router = express.Router();

// Debug route to test API
router.get('/test', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    timestamp: new Date(),
    routes: ['parties', 'quotations', 'categories', 'brands', 'models']
  });
});

// Main API routes
router.use('/parties', require('./parties'));

// Add other routes if files exist
try {
  router.use('/categories', require('./categories'));
} catch (e) {
  console.warn('Categories route not found, skipping...');
}

try {
  router.use('/brands', require('./brands'));
} catch (e) {
  console.warn('Brands route not found, skipping...');
}

try {
  router.use('/models', require('./models'));
} catch (e) {
  console.warn('Models route not found, skipping...');
}

try {
  router.use('/quotations', require('./quotations'));
} catch (e) {
  console.warn('Quotations route not found, skipping...');
}

module.exports = router;