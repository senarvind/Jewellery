import { Router } from "express";
import { register, login, getMe, logout, updateProfile } from "../controllers/authController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/signup", register);
router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateToken, getMe);
router.post("/logout", logout);
router.put("/profile", authenticateToken, updateProfile);

export default router;
