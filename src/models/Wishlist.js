const mongoose = require("mongoose");
const { Schema } = mongoose;

const WishlistItemSchema = new Schema({
  productId: { type: String, required: true },
  product: { type: Schema.Types.Mixed, required: true },
});

const WishlistSchema = new Schema(
  {
    userId: { type: String, index: true },
    sessionId: { type: String, index: true },
    items: [WishlistItemSchema],
  },
  { timestamps: true }
);

const Wishlist = mongoose.models.Wishlist || mongoose.model("Wishlist", WishlistSchema);

module.exports = Wishlist;
