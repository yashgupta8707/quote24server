// server/routes/api/models.js
const express = require('express');
const router = express.Router();
const modelController = require('../../controllers/modelController');

router.get('/', modelController.getModels);
router.get('/search', modelController.searchModels);
router.post('/', modelController.createModel);

module.exports = router;