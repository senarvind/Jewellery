const connectToDatabase = require("../config/db");
const OrderTrackingModel = require("../models/OrderTracking");
const OrderModel = require("../models/Order");

/**
 * Generate default checkpoint history logs based on current status & date
 */
function generateDefaultHistory(orderDoc) {
  const createdDate = orderDoc.createdAt ? new Date(orderDoc.createdAt) : new Date();
  const status = (orderDoc.status || "pending").toLowerCase();

  const history = [
    {
      status: "order_placed",
      location: "Keshar Jewellers Showroom, Sehore",
      description: "Order placed & registered in system.",
      timestamp: createdDate,
    },
  ];

  if (["confirmed", "shipped", "delivered"].includes(status)) {
    history.push({
      status: "payment_verified",
      location: "Razorpay Payment Gateway",
      description: "Payment verified & order approved.",
      timestamp: new Date(createdDate.getTime() + 15 * 60 * 1000), // +15 mins
    });
    history.push({
      status: "quality_checked",
      location: "Hallmark Verification Lab, Sarafa Bazar",
      description: "22K/925 Hallmark certification & luxury packaging passed.",
      timestamp: new Date(createdDate.getTime() + 2 * 60 * 60 * 1000), // +2 hrs
    });
  }

  if (["shipped", "delivered"].includes(status)) {
    history.push({
      status: "shipped",
      location: "BlueDart Logistics Hub, Bhopal",
      description: "Handed over to courier for insured transit.",
      timestamp: new Date(createdDate.getTime() + 24 * 60 * 60 * 1000), // +1 day
    });
  }

  if (status === "delivered") {
    history.push({
      status: "out_for_delivery",
      location: "Local Courier Hub",
      description: "Delivery executive out for delivery.",
      timestamp: new Date(createdDate.getTime() + 48 * 60 * 60 * 1000), // +2 days
    });
    history.push({
      status: "delivered",
      location: orderDoc.customerAddress || "Customer Address",
      description: "Successfully delivered & signed by customer.",
      timestamp: new Date(createdDate.getTime() + 52 * 60 * 60 * 1000),
    });
  }

  if (status === "cancelled") {
    history.push({
      status: "cancelled",
      location: "Keshar Jewellers Support",
      description: "Order cancelled as per customer request / stock verification.",
      timestamp: new Date(),
    });
  }

  return history;
}

function mapOrderStatusToTrackingStatus(orderStatus) {
  const s = (orderStatus || "pending").toLowerCase();
  if (s === "confirmed") return "quality_checked";
  if (s === "shipped") return "shipped";
  if (s === "delivered") return "delivered";
  if (s === "cancelled") return "cancelled";
  return "order_placed";
}

function sanitizeTracking(doc) {
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    orderId: doc.orderId,
    trackingNumber: doc.trackingNumber || `KJ-BD-${(doc.orderId || "").substring(0, 6).toUpperCase()}`,
    courierPartner: doc.courierPartner || "BlueDart Insured Courier",
    currentStatus: doc.currentStatus || "order_placed",
    currentLocation: doc.currentLocation || "Sarafa Bazar, Sehore",
    estimatedDelivery: doc.estimatedDelivery || "3-5 Business Days",
    customerName: doc.customerName || "Customer",
    customerPhone: doc.customerPhone || "",
    customerEmail: doc.customerEmail || "",
    history: doc.history || [],
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Get Tracking details by Order ID or Tracking Number
 */
async function getTrackingByOrderId(req, res) {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ success: false, error: "Order ID or Tracking Number is required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    // 1. Find existing Tracking Record in DB
    let trackingDoc = await OrderTrackingModel.findOne({
      $or: [{ orderId }, { trackingNumber: orderId }],
    }).lean();

    if (trackingDoc) {
      return res.json({ success: true, tracking: sanitizeTracking(trackingDoc) });
    }

    // 2. If not found in OrderTrackingModel, search in OrderModel
    let orderDoc = null;
    if (orderId.match(/^[0-9a-fA-F]{24}$/)) {
      orderDoc = await OrderModel.findById(orderId).lean();
    }
    if (!orderDoc) {
      orderDoc = await OrderModel.findOne({
        $or: [{ razorpayOrderId: orderId }, { razorpayPaymentId: orderId }],
      }).lean();
    }

    if (orderDoc) {
      // Auto-create tracking record for this order
      const trackingNumber = `KJ-BD-${(orderDoc._id || Date.now()).toString().slice(-6).toUpperCase()}`;
      const mappedStatus = mapOrderStatusToTrackingStatus(orderDoc.status);
      const defaultHistory = generateDefaultHistory(orderDoc);

      const createdTracking = await OrderTrackingModel.create({
        orderId: orderDoc._id ? orderDoc._id.toString() : orderId,
        trackingNumber,
        courierPartner: "BlueDart Insured Courier",
        currentStatus: mappedStatus,
        currentLocation: mappedStatus === "delivered" ? (orderDoc.customerAddress || "Delivered") : "Sarafa Bazar, Sehore",
        estimatedDelivery: "3-5 Business Days",
        customerName: orderDoc.customerName || "Customer",
        customerPhone: orderDoc.customerPhone || "",
        customerEmail: orderDoc.customerEmail || "",
        history: defaultHistory,
      });

      return res.json({ success: true, tracking: sanitizeTracking(createdTracking.toObject()) });
    }

    return res.status(404).json({ success: false, error: "Tracking record or order not found" });
  } catch (error) {
    console.error("Error in getTrackingByOrderId:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update Tracking status & append new checkpoint location update
 */
async function updateTrackingStatus(req, res) {
  try {
    const orderId = req.params.orderId || req.body.orderId;
    const {
      status,
      location = "In Transit Hub",
      description = "",
      courierPartner,
      trackingNumber,
      estimatedDelivery,
    } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ success: false, error: "Order ID and status are required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    let tracking = await OrderTrackingModel.findOne({
      $or: [{ orderId }, { trackingNumber: orderId }],
    });

    const checkpoint = {
      status,
      location: location || "Transit Hub",
      description: description || `Status updated to ${status}`,
      timestamp: new Date(),
    };

    if (!tracking) {
      // Find parent order for customer details if available
      let orderDoc = null;
      if (orderId.match(/^[0-9a-fA-F]{24}$/)) {
        orderDoc = await OrderModel.findById(orderId).lean();
      }

      // Create new tracking if it doesn't exist
      tracking = await OrderTrackingModel.create({
        orderId,
        trackingNumber: trackingNumber || `KJ-BD-${Date.now().toString().slice(-6)}`,
        courierPartner: courierPartner || "BlueDart Insured Courier",
        currentStatus: status,
        currentLocation: location,
        estimatedDelivery: estimatedDelivery || "3-5 Business Days",
        customerName: orderDoc?.customerName || req.body.customerName || "Customer",
        customerPhone: orderDoc?.customerPhone || req.body.customerPhone || "",
        customerEmail: orderDoc?.customerEmail || req.body.customerEmail || "",
        history: [checkpoint],
      });
    } else {
      // Update existing
      tracking.currentStatus = status;
      if (location) tracking.currentLocation = location;
      if (courierPartner) tracking.courierPartner = courierPartner;
      if (trackingNumber) tracking.trackingNumber = trackingNumber;
      if (estimatedDelivery) tracking.estimatedDelivery = estimatedDelivery;
      if (req.body.customerName) tracking.customerName = req.body.customerName;
      if (req.body.customerPhone) tracking.customerPhone = req.body.customerPhone;
      if (req.body.customerEmail) tracking.customerEmail = req.body.customerEmail;
      tracking.history.push(checkpoint);
      await tracking.save();
    }

    // Also sync master Order status if order exists
    if (orderId.match(/^[0-9a-fA-F]{24}$/)) {
      let mappedOrderStatus = "pending";
      if (["quality_checked", "payment_verified"].includes(status)) mappedOrderStatus = "confirmed";
      else if (status === "shipped" || status === "out_for_delivery") mappedOrderStatus = "shipped";
      else if (status === "delivered") mappedOrderStatus = "delivered";
      else if (status === "cancelled") mappedOrderStatus = "cancelled";

      await OrderModel.findByIdAndUpdate(orderId, { status: mappedOrderStatus });
    }

    return res.json({
      success: true,
      message: "Tracking updated successfully! 🚚",
      tracking: sanitizeTracking(tracking.toObject()),
    });
  } catch (error) {
    console.error("Error in updateTrackingStatus:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Search Tracking records by phone, email, or tracking number
 */
async function searchTracking(req, res) {
  try {
    const query = (req.query.q || req.query.query || req.query.phone || req.query.email || "").trim();
    if (!query) {
      return res.status(400).json({ success: false, error: "Search query is required", trackings: [] });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection failed", trackings: [] });
    }

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const docs = await OrderTrackingModel.find({
      $or: [
        { trackingNumber: regex },
        { orderId: regex },
        { customerPhone: regex },
        { customerEmail: regex },
        { customerName: regex },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: docs.length,
      trackings: docs.map(sanitizeTracking),
    });
  } catch (error) {
    console.error("Error in searchTracking:", error);
    return res.status(500).json({ success: false, error: error.message, trackings: [] });
  }
}

module.exports = {
  getTrackingByOrderId,
  updateTrackingStatus,
  searchTracking,
};
