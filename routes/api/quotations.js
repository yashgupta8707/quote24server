// server/routes/api/quotations.js
const express = require('express');
const router = express.Router();
const quotationController = require('../../controllers/quotationController');

router.get('/', quotationController.getQuotations);
router.get('/party/:partyId', quotationController.getQuotationsByParty);
router.get('/:id', quotationController.getQuotationById);
router.post('/', quotationController.createQuotation);
router.post('/:id/revise', quotationController.createRevisedQuotation);
router.put('/:id', quotationController.updateQuotation);
router.delete('/:id', quotationController.deleteQuotation);

module.exports = router;