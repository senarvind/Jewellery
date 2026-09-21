const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    originalPrice: { type: Number, required: true, min: 0 },
    offerPrice: { type: Number, required: true, min: 0 },
    category: { type: String, trim: true, default: '' },
    image: { type: String, default: '' },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    productLink: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Offer', offerSchema);
