const connectToDatabase = require("../config/db");
const UserModel = require("../models/User");
const bcrypt = require("bcryptjs");
const { generateToken, verifyToken } = require("../middleware/authMiddleware");
const { sendResetOtpEmail } = require("../utils/sendEmail");

function sanitizeUser(user, token) {
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

async function register(req, res) {
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
      phone: phone ? phone.trim() : "",
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
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Registration failed" });
  }
}

async function login(req, res) {
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
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Login failed" });
  }
}

async function getMe(req, res) {
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
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Authentication error" });
  }
}

async function logout(req, res) {
  return res.json({ success: true, message: "Logged out successfully" });
}

async function updateProfile(req, res) {
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
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to update profile" });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const emailNormalized = email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: emailNormalized });
    if (!user) {
      return res.status(404).json({ success: false, error: "No account found with this email address" });
    }

    // Generate 6-digit random numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiration to 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = expiresAt;
    await user.save();

    // Send Email
    await sendResetOtpEmail(user.email, otp, user.name);

    return res.json({
      success: true,
      message: "Verification OTP code has been sent to your email! ✉️",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to process forgot password request" });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: "Email, OTP code and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "New password must be at least 6 characters long" });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return res.status(500).json({ success: false, error: "Database connection unavailable" });
    }

    const emailNormalized = email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: emailNormalized });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.trim()) {
      return res.status(400).json({ success: false, error: "Invalid OTP verification code" });
    }

    if (!user.resetPasswordOtpExpires || new Date(user.resetPasswordOtpExpires) < new Date()) {
      return res.status(400).json({ success: false, error: "OTP verification code has expired. Please request a new code." });
    }

    // Hash new password and reset OTP fields
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
    await user.save();

    return res.json({
      success: true,
      message: "Password reset successful! You can now log in with your new password. 💎",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to reset password" });
  }
}

module.exports = {
  register,
  login,
  getMe,
  logout,
  updateProfile,
  forgotPassword,
  resetPassword,
};
