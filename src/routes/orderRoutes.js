const express = require("express");
const router = express.Router();
const {
  getAllOrders,
  getOrderById,
  searchOrders,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  requestExchange,
} = require("../controllers/orderController");

router.get("/", getAllOrders);
router.get("/search", searchOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.post("/:id/exchange/:productId", requestExchange);
router.put("/:id", updateOrderStatus);
router.put("/", updateOrderStatus);
router.delete("/:id", deleteOrder);
router.delete("/", deleteOrder);

module.exports = router;
