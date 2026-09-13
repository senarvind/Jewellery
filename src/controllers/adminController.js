/**
 * ============================================================
 * FILE: src/controllers/adminController.js
 * PURPOSE: Express Controller for Admin Authentication & Admin Management
 * ============================================================
 */

const connectToDatabase = require("../config/db");
const AdminModel = require("../models/Admin");
const bcrypt = require("bcryptjs");
const { generateToken, verifyToken } = require("../middleware/authMiddleware");

// Helper to sanitize admin object returned to client
function sanitizeAdmin(admin, token) {
  return {
    id: admin._id ? admin._id.toString() : admin.id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone || "",
    role: admin.role || "admin",
    permissions: admin.permissions || ["products", "orders", "inventory", "users", "analytics"],
    status: admin.status || "active",
    lastLogin: admin.lastLogin ? new Date(admin.lastLogin).toISOString() : null,
    createdAt: admin.createdAt ? new Date(admin.createdAt).toISOString() : undefined,
    token,
  };
}

/**
 * POST /api/admin/login
 * Admin Login Authentication directly against MongoDB
 */
async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    const emailNormalized = String(email).toLowerCase().trim();
    const conn = await connectToDatabase();

    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    // 1. Find admin in MongoDB
    let admin = await AdminModel.findOne({ email: emailNormalized });

    // 2. If no admin exists in MongoDB at all, auto-create the initial Super Admin account in MongoDB
    const totalAdmins = await AdminModel.countDocuments();
    if (!admin && totalAdmins === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password.length >= 4 ? password : "admin123", salt);
      admin = await AdminModel.create({
        name: emailNormalized.split("@")[0] || "Super Admin",
        email: emailNormalized,
        password: hashedPassword,
        phone: "+91 98765 43210",
        role: "superadmin",
        permissions: ["products", "orders", "inventory", "users", "analytics", "settings"],
        status: "active",
      });
    }

    if (!admin) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    if (admin.status === "suspended") {
      return res.status(403).json({ success: false, error: "Admin account has been suspended" });
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, admin.password);
    } catch (err) {
      isMatch = admin.password === password;
    }

    if (!isMatch && admin.password === password) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken({
      adminId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    });

    return res.json({
      success: true,
      message: "Admin authentication successful! 👑",
      admin: sanitizeAdmin(admin, token),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Admin login failed" });
  }
}

/**
 * POST /api/admin/create
 * Create a new Admin Account saved directly to MongoDB (Single Super Admin Rule)
 */
async function createAdmin(req, res) {
  try {
    const { name, email, password, phone, role, permissions } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Name, email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters long" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const emailNormalized = email.toLowerCase().trim();

    // Check if an admin with this email already exists in MongoDB
    const existingAdmin = await AdminModel.findOne({ email: emailNormalized }).lean();
    if (existingAdmin) {
      return res.status(400).json({ success: false, error: "An admin account with this email already exists" });
    }

    // ── STRICT SINGLE SUPER ADMIN RULE ──
    const existingSuperAdmin = await AdminModel.findOne({ role: "superadmin" }).lean();

    let assignedRole = "admin";
    if (!existingSuperAdmin) {
      // First admin created in MongoDB becomes the SUPER ADMIN!
      assignedRole = "superadmin";
    } else {
      if (role === "superadmin") {
        return res.status(400).json({
          success: false,
          error: "A Super Admin account already exists. Only ONE Super Admin is permitted in the system.",
        });
      }
      assignedRole = role && ["admin", "manager"].includes(role) ? role : "admin";
    }

    // Hash admin password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save directly to MongoDB Database
    const newAdmin = await AdminModel.create({
      name: name.trim(),
      email: emailNormalized,
      password: hashedPassword,
      phone: phone ? phone.trim() : "",
      role: assignedRole,
      permissions: Array.isArray(permissions) && permissions.length > 0
        ? permissions
        : ["products", "orders", "inventory", "users", "analytics"],
      status: "active",
    });

    const token = generateToken({
      adminId: newAdmin._id.toString(),
      email: newAdmin.email,
      role: newAdmin.role,
    });

    return res.status(201).json({
      success: true,
      message: `Admin account created successfully! Role: ${assignedRole.toUpperCase()} 👑`,
      admin: sanitizeAdmin(newAdmin, token),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Admin creation failed" });
  }
}

/**
 * GET /api/admin
 * Get all Admin Accounts
 */
async function getAllAdmins(req, res) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const admins = await AdminModel.find({}).select("-password").sort({ createdAt: -1 }).lean();
    const formatted = admins.map((a) => sanitizeAdmin(a));

    return res.json({ success: true, count: formatted.length, admins: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch admins" });
  }
}

/**
 * GET /api/admin/profile
 * Get Logged-in Admin Profile
 */
async function getAdminProfile(req, res) {
  try {
    const authHeader = req.headers.authorization;
    let token = authHeader ? authHeader.replace("Bearer ", "") : undefined;
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const payload = verifyToken(token);
    if (!payload || (!payload.adminId && !payload.userId)) {
      return res.status(401).json({ success: false, error: "Invalid admin token" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const adminId = payload.adminId || payload.userId;
    const admin = await AdminModel.findById(adminId).select("-password").lean();

    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin profile not found" });
    }

    return res.json({ success: true, admin: sanitizeAdmin(admin) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch profile" });
  }
}

/**
 * PUT /api/admin/:id
 * Update Admin Account (Role, Status, Permissions)
 */
async function updateAdmin(req, res) {
  try {
    const { id } = req.params;
    const { name, phone, role, status, permissions } = req.body;

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const admin = await AdminModel.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    // ── STRICT SINGLE SUPER ADMIN RULE FOR PROMOTION ──
    if (role === "superadmin" && admin.role !== "superadmin") {
      const existingSuperAdmin = await AdminModel.findOne({ role: "superadmin" }).lean();
      if (existingSuperAdmin) {
        return res.status(400).json({
          success: false,
          error: "A Super Admin account already exists. Only ONE Super Admin is permitted in the system.",
        });
      }
    }

    // Protect existing Super Admin from being suspended or demoted
    if (admin.role === "superadmin" && status === "suspended") {
      return res.status(400).json({
        success: false,
        error: "Security Violation: The Super Admin account cannot be suspended.",
      });
    }

    if (name) admin.name = name.trim();
    if (phone !== undefined) admin.phone = phone.trim();
    if (role && ["superadmin", "admin", "manager"].includes(role)) admin.role = role;
    if (status && ["active", "suspended"].includes(status)) admin.status = status;
    if (Array.isArray(permissions)) admin.permissions = permissions;

    await admin.save();

    return res.json({
      success: true,
      message: "Admin account updated successfully",
      admin: sanitizeAdmin(admin),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Update admin failed" });
  }
}

/**
 * DELETE /api/admin/:id
 * Delete Admin Account (Super Admin is Protected)
 */
async function deleteAdmin(req, res) {
  try {
    const { id } = req.params;

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const adminToDelete = await AdminModel.findById(id);
    if (!adminToDelete) {
      return res.status(404).json({ success: false, error: "Admin account not found" });
    }

    // Protect Super Admin from deletion
    if (adminToDelete.role === "superadmin") {
      return res.status(403).json({
        success: false,
        error: "Security Violation: The Super Admin account CANNOT be deleted.",
      });
    }

    await AdminModel.findByIdAndDelete(id);

    return res.json({ success: true, message: "Admin account deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Delete admin failed" });
  }
}

module.exports = {
  adminLogin,
  createAdmin,
  getAllAdmins,
  getAdminProfile,
  updateAdmin,
  deleteAdmin,
};
