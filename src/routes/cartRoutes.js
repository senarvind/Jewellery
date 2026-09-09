const express = require("express");
const { getCart, saveCart, clearCart } = require("../controllers/cartController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticateToken, getCart);
router.post("/", authenticateToken, saveCart);
router.delete("/", authenticateToken, clearCart);

module.exports = router;
