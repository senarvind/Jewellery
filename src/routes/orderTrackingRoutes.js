const express = require("express");
const router = express.Router();
const {
  getTrackingByOrderId,
  updateTrackingStatus,
  searchTracking,
} = require("../controllers/orderTrackingController");

router.get("/search", searchTracking);
router.get("/:orderId", getTrackingByOrderId);
router.put("/:orderId", updateTrackingStatus);
router.post("/update", updateTrackingStatus);

module.exports = router;
