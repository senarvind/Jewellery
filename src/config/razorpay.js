const Razorpay = require("razorpay");
const dotenv = require("dotenv");

dotenv.config();

const razorpayKeyId = (process.env.RAZORPAY_KEY_ID || "").trim();
const razorpayKeySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

const razorpayInstance = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

module.exports = {
  razorpayInstance,
  razorpayKeyId,
  razorpayKeySecret,
};
