import { Router } from "express";
import {
  getWishlist,
  saveWishlist,
  toggleWishlistItem,
  clearWishlist,
} from "../controllers/wishlistController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticateToken, getWishlist);
router.post("/", authenticateToken, saveWishlist);
router.post("/toggle", authenticateToken, toggleWishlistItem);
router.delete("/", authenticateToken, clearWishlist);

export default router;
