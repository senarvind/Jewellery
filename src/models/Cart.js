const mongoose = require("mongoose");
const { Schema } = mongoose;

const CartItemSchema = new Schema({
  productId: { type: String, required: true },
  product: { type: Schema.Types.Mixed, required: true },
  quantity: { type: Number, required: true, default: 1, min: 1 },
});

const CartSchema = new Schema(
  {
    userId: { type: String, index: true },
    sessionId: { type: String, index: true },
    items: [CartItemSchema],
  },
  { timestamps: true }
);

const Cart = mongoose.models.Cart || mongoose.model("Cart", CartSchema);

module.exports = Cart;
