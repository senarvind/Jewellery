const Razorpay = require("razorpay");
const dotenv = require("dotenv");

dotenv.config();

const razorpayKeyId = (process.env.RAZORPAY_KEY_ID || "").trim();
const razorpayKeySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

let razorpayInstance = null;

if (razorpayKeyId && razorpayKeySecret) {
  try {
    razorpayInstance = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });
  } catch (err) {
    console.warn("⚠️ Razorpay initialization skipped:", err.message);
  }
}

module.exports = {
  razorpayInstance,
  razorpayKeyId,
  razorpayKeySecret,
};
