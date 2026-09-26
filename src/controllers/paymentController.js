const crypto = require("crypto");
const connectToDatabase = require("../config/db");
const { razorpayInstance, razorpayKeyId, razorpayKeySecret } = require("../config/razorpay");
const OrderModel = require("../models/Order");

function sanitizeOrder(doc) {
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    customerName: doc.customerName || "Customer",
    customerPhone: doc.customerPhone || "",
    customerEmail: doc.customerEmail || "",
    customerAddress: doc.customerAddress || "",
    items: doc.items || [],
    totalAmount: doc.totalAmount || 0,
    status: doc.status || "pending",
    paymentMethod: doc.paymentMethod || "razorpay",
    paymentStatus: doc.paymentStatus || "pending",
    razorpayOrderId: doc.razorpayOrderId || "",
    razorpayPaymentId: doc.razorpayPaymentId || "",
    notes: doc.notes || "",
    giftId: doc.giftId || null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Get public Razorpay Key ID
 */
async function getRazorpayKey(req, res) {
  const key = (process.env.RAZORPAY_KEY_ID || razorpayKeyId || "").trim();
  return res.json({
    success: true,
    key,
  });
}

/**
 * Create an official Razorpay Order
 */
async function createRazorpayOrder(req, res) {
  try {
    const { amount, currency = "INR", notes = {} } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Valid order amount is required" });
    }

    const currentKeyId = (process.env.RAZORPAY_KEY_ID || razorpayKeyId || "").trim();
    const currentKeySecret = (process.env.RAZORPAY_KEY_SECRET || razorpayKeySecret || "").trim();

    if (!currentKeyId || !currentKeySecret) {
      return res.status(500).json({
        success: false,
        error: "Razorpay credentials missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server environment variables.",
      });
    }

    const amountInPaise = Math.round(Number(amount) * 100);

    const options = {
      amount: amountInPaise,
      currency,
      receipt: `receipt_${Date.now()}`,
      notes,
    };

    const client = razorpayInstance || new (require("razorpay"))({
      key_id: currentKeyId,
      key_secret: currentKeySecret,
    });
    const razorpayOrder = await client.orders.create(options);

    return res.status(201).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: currentKeyId,
    });
  } catch (error) {
    console.error("Error creating official Razorpay order:", error);
    return res.status(500).json({
      success: false,
      error: error?.error?.description || error.message || "Failed to create Razorpay payment order",
    });
  }
}

/**
 * Verify official Razorpay payment HMAC SHA256 signature & save order to MongoDB
 */
async function verifyRazorpayPayment(req, res) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      items,
      totalAmount,
      notes,
      giftId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Missing required Razorpay payment verification parameters",
      });
    }

    const secret = (process.env.RAZORPAY_KEY_SECRET || razorpayKeySecret || "").trim();

    if (!secret) {
      return res.status(500).json({
        success: false,
        error: "RAZORPAY_KEY_SECRET is not configured on server",
      });
    }

    // Official Razorpay HMAC SHA256 signature verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        error: "Payment verification failed! Invalid Razorpay signature.",
      });
    }

    // Save verified order to database
    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection failed" });
    }

    const newOrder = await OrderModel.create({
      customerName: customerName || "Valued Customer",
      customerPhone: customerPhone || "",
      customerEmail: customerEmail || "",
      customerAddress: customerAddress || "",
      items: Array.isArray(items) ? items : [],
      totalAmount: Number(totalAmount) || 0,
      status: "confirmed",
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      notes: notes || "Paid online via Official Razorpay Gateway",
      ...(giftId ? { giftId } : {}),
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified & order placed successfully! 💎",
      order: sanitizeOrder(newOrder),
    });
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to verify Razorpay payment",
    });
  }
}

module.exports = {
  getRazorpayKey,
  createRazorpayOrder,
  verifyRazorpayPayment,
};
