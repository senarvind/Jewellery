import { Request, Response } from "express";
import connectToDatabase from "../config/db";
import UserModel from "../models/User";
import bcrypt from "bcryptjs";
import { generateToken, verifyToken, AuthRequest } from "../middleware/authMiddleware";

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "admin";
  token?: string;
  createdAt?: string;
}

function sanitizeUser(user: any, token?: string): UserResponse {
  return {
    id: user._id ? user._id.toString() : user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role || "user",
    token,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
  };
}

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Name, email and password are required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const emailNormalized = email.toLowerCase().trim();
    const existingUser = await UserModel.findOne({ email: emailNormalized }).lean();
    if (existingUser) {
      return res.status(400).json({ success: false, error: "An account with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await UserModel.create({
      name: name.trim(),
      email: emailNormalized,
      password: hashedPassword,
      phone: phone?.trim() || "",
      role: "user",
    });

    const token = generateToken({
      userId: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully! 💎",
      user: sanitizeUser(newUser, token),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Registration failed" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const emailNormalized = email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: emailNormalized });
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return res.json({
      success: true,
      message: "Logged in successfully! 💎",
      user: sanitizeUser(user, token),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Login failed" });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    let token = authHeader?.replace("Bearer ", "");
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: "Invalid or expired token" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const user = await UserModel.findById(payload.userId).select("-password").lean();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({ success: true, user: sanitizeUser(user) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Authentication error" });
  }
}

export async function logout(req: Request, res: Response) {
  return res.json({ success: true, message: "Logged out successfully" });
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    let token = authHeader?.replace("Bearer ", "");
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const { name, phone, currentPassword, newPassword } = req.body;

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: "Current password is required to set a new password" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: "Current password is incorrect" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: "New password must be at least 6 characters long" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    const newToken = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return res.json({
      success: true,
      message: "Profile updated successfully! ✨",
      user: sanitizeUser(user, newToken),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to update profile" });
  }
}
