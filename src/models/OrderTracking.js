const mongoose = require("mongoose");
const { Schema } = mongoose;

const TrackingCheckpointSchema = new Schema(
  {
    status: { type: String, required: true },
    location: { type: String, default: "Sehore Main Hub" },
    description: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderTrackingSchema = new Schema(
  {
    orderId: { type: String, required: true, index: true },
    trackingNumber: { type: String, default: "" },
    courierPartner: { type: String, default: "BlueDart Express Insured" },
    currentStatus: {
      type: String,
      enum: ["order_placed", "payment_verified", "quality_checked", "shipped", "out_for_delivery", "delivered", "cancelled"],
      default: "order_placed",
      index: true,
    },
    currentLocation: { type: String, default: "Sarafa Bazar Showroom, Sehore" },
    estimatedDelivery: { type: String, default: "" },
    customerName: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    history: { type: [TrackingCheckpointSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

OrderTrackingSchema.index({ trackingNumber: 1 });
OrderTrackingSchema.index({ customerPhone: 1 });
OrderTrackingSchema.index({ customerEmail: 1 });

module.exports =
  mongoose.models.OrderTracking ||
  mongoose.model("OrderTracking", OrderTrackingSchema);
