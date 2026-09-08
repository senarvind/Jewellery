import mongoose, { Schema, Document } from "mongoose";

export interface IWishlistItem {
  productId: string;
  product: Record<string, any>;
}

export interface IWishlist extends Document {
  userId?: string;
  sessionId?: string;
  items: IWishlistItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

const WishlistItemSchema = new Schema<IWishlistItem>({
  productId: { type: String, required: true },
  product: { type: Schema.Types.Mixed, required: true },
});

const WishlistSchema = new Schema<IWishlist>(
  {
    userId: { type: String, index: true },
    sessionId: { type: String, index: true },
    items: [WishlistItemSchema],
  },
  { timestamps: true }
);

const Wishlist =
  mongoose.models.Wishlist ||
  mongoose.model<IWishlist>("Wishlist", WishlistSchema);

export default Wishlist;
