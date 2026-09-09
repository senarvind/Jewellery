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
  });
});

module.exports = router;
