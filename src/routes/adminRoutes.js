/**
 * ============================================================
 * FILE: src/routes/adminRoutes.js
 * PURPOSE: Express Router API Endpoints for Admin System
 * ============================================================
 */

const express = require("express");
const router = express.Router();
const {
  adminLogin,
  createAdmin,
  getAllAdmins,
  getAdminProfile,
  updateAdmin,
  deleteAdmin,
} = require("../controllers/adminController");

const { requireAdmin, requireSuperAdmin } = require("../middleware/authMiddleware");

// Admin Endpoints
router.post("/login", adminLogin);
router.post("/create", createAdmin);

// Protected Admin Endpoints
router.get("/profile", requireAdmin, getAdminProfile);
router.get("/", requireAdmin, getAllAdmins);

// Super Admin Only Operations
router.put("/:id", requireSuperAdmin, updateAdmin);
router.delete("/:id", requireSuperAdmin, deleteAdmin);

module.exports = router;
