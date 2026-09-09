const express = require("express");
const {
  getWishlist,
  saveWishlist,
  toggleWishlistItem,
  clearWishlist,
} = require("../controllers/wishlistController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticateToken, getWishlist);
router.post("/", authenticateToken, saveWishlist);
router.post("/toggle", authenticateToken, toggleWishlistItem);
router.delete("/", authenticateToken, clearWishlist);

module.exports = router;
