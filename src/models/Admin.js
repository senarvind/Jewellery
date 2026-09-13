/**
 * ============================================================
 * FILE: src/models/Admin.js
 * PURPOSE: Admin Mongoose Model & Schema for Keshar Jewellers
 * ============================================================
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const AdminSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Admin name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Admin email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    phone: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["superadmin", "admin", "manager"],
      default: "admin",
    },
    permissions: {
      type: [String],
      default: ["products", "orders", "inventory", "users", "analytics"],
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);

module.exports = Admin;
