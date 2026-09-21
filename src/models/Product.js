const mongoose = require("mongoose");
const { Schema } = mongoose;

const ProductSchema = new Schema(
  {
    category:     { type: String, required: true, index: true },
    productType:  { type: String, required: true },
    description:  { type: String, required: true },
    material:     { type: String, required: true },
    dimensionL:   { type: String, default: "" },
    dimensionW:   { type: String, default: "" },
    dimensionH:   { type: String, default: "" },
    weight:       { type: String, required: true },
    sellingPrice: { type: Number, required: true },
    mrp:          { type: Number, required: true },
    frontImage:   { type: String, default: "" },
    backImage:    { type: String, default: "" },
    modelImage:   { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// Index for fast admin list (sort by newest first)
ProductSchema.index({ createdAt: -1 });
// Index for category filter page on storefront
ProductSchema.index({ category: 1, createdAt: -1 });

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);

module.exports = Product;
