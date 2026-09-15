const Razorpay = require("razorpay");
const dotenv = require("dotenv");

dotenv.config();

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_1234567890abcdef";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret_1234567890abcdef";

const razorpayInstance = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

module.exports = {
  razorpayInstance,
  razorpayKeyId,
};
