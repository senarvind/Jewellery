const express = require("express");
const router = express.Router();
const {
  getRazorpayKey,
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("../controllers/paymentController");

// GET public Razorpay key ID
router.get("/key", getRazorpayKey);

// POST create Razorpay order
router.post("/create-order", createRazorpayOrder);

// POST verify Razorpay payment
router.post("/verify", verifyRazorpayPayment);

module.exports = router;
