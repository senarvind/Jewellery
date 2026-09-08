import { Router } from "express";
import { getCart, saveCart, clearCart } from "../controllers/cartController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticateToken, getCart);
router.post("/", authenticateToken, saveCart);
router.delete("/", authenticateToken, clearCart);

export default router;
