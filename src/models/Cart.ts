import mongoose, { Schema, Document } from "mongoose";

export interface ICartItem {
  productId: string;
  product: Record<string, any>;
  quantity: number;
}

export interface ICart extends Document {
  userId?: string;
  sessionId?: string;
  items: ICartItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  productId: { type: String, required: true },
  product: { type: Schema.Types.Mixed, required: true },
  quantity: { type: Number, required: true, default: 1, min: 1 },
});

const CartSchema = new Schema<ICart>(
  {
    userId: { type: String, index: true },
    sessionId: { type: String, index: true },
    items: [CartItemSchema],
  },
  { timestamps: true }
);

const Cart = mongoose.models.Cart || mongoose.model<ICart>("Cart", CartSchema);

export default Cart;
