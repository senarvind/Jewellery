const mongoose = require("mongoose");
const { Schema } = mongoose;

const OrderItemSchema = new Schema(
  {
    productId:   { type: String, default: "" },
    productName: { type: String, required: true },
    category:    { type: String, default: "" },
    quantity:    { type: Number, default: 1 },
    price:       { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    customerName:    { type: String, required: true },
    customerPhone:   { type: String, required: true },
    customerEmail:   { type: String, default: "" },
    customerAddress: { type: String, default: "" },
    items:           { type: [OrderItemSchema], required: true },
    totalAmount:     { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    paymentMethod: { type: String, default: "razorpay" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    notes: { type: String, default: "" },
    giftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gift",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Order || mongoose.model("Order", OrderSchema);
