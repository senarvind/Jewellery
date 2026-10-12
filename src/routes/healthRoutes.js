const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";

  return res.json({
    success: true,
    status: "ok",
    message: "Keshar Jewellers Express Backend API is running! 💎",
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      readyState: dbState,
    },
    emailService: {
      provider: process.env.BREVO_API_KEY ? "brevo_https" : process.env.RESEND_API_KEY ? "resend_https" : (process.env.EMAIL_USER && process.env.EMAIL_PASS) ? "gmail_smtp" : "none",
      configured: Boolean(process.env.BREVO_API_KEY || process.env.RESEND_API_KEY || (process.env.EMAIL_USER && process.env.EMAIL_PASS)),
      user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.slice(0, 4)}***@gmail.com` : null,
    },
  });
});

module.exports = router;
