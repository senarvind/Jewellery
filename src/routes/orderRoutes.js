const express = require("express");
const router = express.Router();
const {
  getAllOrders,
  createOrder,
  updateOrderStatus,
  deleteOrder,
} = require("../controllers/orderController");

router.get("/", getAllOrders);
router.post("/", createOrder);
router.put("/:id", updateOrderStatus);
router.put("/", updateOrderStatus);
router.delete("/:id", deleteOrder);
router.delete("/", deleteOrder);

module.exports = router;
