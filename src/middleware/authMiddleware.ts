import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "keshar_jewellers_jwt_secret_key_2026";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function generateToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    req.user = undefined;
    return next();
  }

  const payload = verifyToken(token);
  if (payload) {
    req.user = payload;
  }

  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  authenticateToken(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }
    next();
  });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  authenticateToken(req, res, () => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }
    next();
  });
}
