const Offer = require('../models/Offer');

// GET /api/offers — PUBLIC: only active + within valid date range
exports.getActiveOffers = async (req, res) => {
  try {
    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now },
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: offers });
  } catch (err) {
    console.error('getActiveOffers error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/offers/all — ADMIN: all offers regardless of status/date
exports.getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json({ success: true, data: offers });
  } catch (err) {
    console.error('getAllOffers error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/offers — ADMIN: create offer
exports.createOffer = async (req, res) => {
  try {
    const {
      title, description, discountPercent, originalPrice,
      offerPrice, category, image, validFrom, validTo,
      isActive, productLink,
    } = req.body;

    // Validate prices
    if (Number(offerPrice) >= Number(originalPrice)) {
      return res.status(400).json({
        success: false,
        message: 'offerPrice must be less than originalPrice',
      });
    }
    if (new Date(validTo) <= new Date(validFrom)) {
      return res.status(400).json({
        success: false,
        message: 'validTo must be after validFrom',
      });
    }

    const offer = await Offer.create({
      title,
      description,
      discountPercent: parseFloat(Number(discountPercent).toFixed(2)),
      originalPrice: parseFloat(Number(originalPrice).toFixed(2)),
      offerPrice: parseFloat(Number(offerPrice).toFixed(2)),
      category,
      image,
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      isActive: isActive !== undefined ? isActive : true,
      productLink,
    });
    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    console.error('createOffer error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/offers/:id — ADMIN: update offer
exports.updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, discountPercent, originalPrice,
      offerPrice, category, image, validFrom, validTo,
      isActive, productLink,
    } = req.body;

    // Validate prices if both provided
    if (offerPrice !== undefined && originalPrice !== undefined) {
      if (Number(offerPrice) >= Number(originalPrice)) {
        return res.status(400).json({
          success: false,
          message: 'offerPrice must be less than originalPrice',
        });
      }
    }
    if (validFrom && validTo && new Date(validTo) <= new Date(validFrom)) {
      return res.status(400).json({
        success: false,
        message: 'validTo must be after validFrom',
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (discountPercent !== undefined) updateData.discountPercent = parseFloat(Number(discountPercent).toFixed(2));
    if (originalPrice !== undefined) updateData.originalPrice = parseFloat(Number(originalPrice).toFixed(2));
    if (offerPrice !== undefined) updateData.offerPrice = parseFloat(Number(offerPrice).toFixed(2));
    if (category !== undefined) updateData.category = category;
    if (image !== undefined) updateData.image = image;
    if (validFrom !== undefined) updateData.validFrom = new Date(validFrom);
    if (validTo !== undefined) updateData.validTo = new Date(validTo);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (productLink !== undefined) updateData.productLink = productLink;

    const offer = await Offer.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }
    res.json({ success: true, data: offer });
  } catch (err) {
    console.error('updateOffer error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/offers/:id — ADMIN: delete offer
exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByIdAndDelete(id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }
    res.json({ success: true, message: 'Offer deleted successfully' });
  } catch (err) {
    console.error('deleteOffer error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
