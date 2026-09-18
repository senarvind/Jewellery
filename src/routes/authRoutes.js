const express = require("express");
const { register, login, getMe, logout, updateProfile, forgotPassword, resetPassword } = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", register);
router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateToken, getMe);
router.post("/logout", logout);
router.put("/profile", authenticateToken, updateProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
