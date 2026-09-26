const express = require('express');
const router = express.Router();
const {
  getActiveOffers,
  getAllOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} = require('../controllers/offerController');

// Public route — storefront uses this
router.get('/', getActiveOffers);

// Admin routes
router.get('/all', getAllOffers);
router.post('/', createOffer);
router.put('/:id', updateOffer);
router.delete('/:id', deleteOffer);

module.exports = router;
