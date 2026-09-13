const connectToDatabase = require("../config/db");
const UserModel = require("../models/User");
const AdminModel = require("../models/Admin");

const SAMPLE_USERS = [
  {
    id: "usr-sample-1",
    name: "Himanshu Soni (Super Admin)",
    email: "himanshu@kesharjewellers.com",
    phone: "+91 98765 43210",
    role: "admin",
    createdAt: new Date().toISOString(),
  },
  {
    id: "usr-sample-2",
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    phone: "+91 98765 12345",
    role: "user",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "usr-sample-3",
    name: "Vikram Malhotra",
    email: "vikram.m@example.com",
    phone: "+91 98123 45678",
    role: "user",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function sanitizeUser(doc) {
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    name: doc.name,
    email: doc.email,
    phone: doc.phone || "",
    role: doc.role || "user",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
  };
}

async function getAllUsers(req, res) {
  try {
    const conn = await connectToDatabase();
    let dbUsers = [];
    let dbAdmins = [];

    if (conn) {
      const usersDocs = await UserModel.find({}).select("-password").sort({ createdAt: -1 }).lean();
      dbUsers = usersDocs.map(sanitizeUser);

      const adminDocs = await AdminModel.find({}).select("-password").sort({ createdAt: -1 }).lean();
      dbAdmins = adminDocs.map((a) => ({
        id: a._id.toString(),
        name: a.name,
        email: a.email,
        phone: a.phone || "",
        role: "admin",
        createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : undefined,
      }));
    }

    const allCombined = [...dbAdmins, ...dbUsers];
    const finalUsers = allCombined.length > 0 ? allCombined : SAMPLE_USERS;

    return res.json({ success: true, count: finalUsers.length, users: finalUsers });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return res.json({ success: true, count: SAMPLE_USERS.length, users: SAMPLE_USERS });
  }
}

async function updateUserRole(req, res) {
  try {
    const id = req.body.id || req.params.id;
    const { role } = req.body;

    if (!id || !role) {
      return res.status(400).json({ success: false, error: "User ID and role are required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(id, { role }, { new: true }).lean();
    if (updatedUser) {
      return res.json({ success: true, message: "User role updated", user: sanitizeUser(updatedUser) });
    }

    const updatedAdmin = await AdminModel.findByIdAndUpdate(id, { role }, { new: true }).lean();
    if (updatedAdmin) {
      return res.json({ success: true, message: "Admin role updated", user: sanitizeUser(updatedAdmin) });
    }

    return res.status(404).json({ success: false, error: "Account not found" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to update role" });
  }
}

async function deleteUser(req, res) {
  try {
    const id = req.params.id || req.query.id || req.body.id;
    if (!id) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const deletedUser = await UserModel.findByIdAndDelete(id);
    if (deletedUser) {
      return res.json({ success: true, message: "User account deleted successfully" });
    }

    const deletedAdmin = await AdminModel.findByIdAndDelete(id);
    if (deletedAdmin) {
      return res.json({ success: true, message: "Admin account deleted successfully" });
    }

    return res.status(404).json({ success: false, error: "Account not found" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to delete user" });
  }
}

module.exports = {
  getAllUsers,
  updateUserRole,
  deleteUser,
};
