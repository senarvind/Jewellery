const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "keshar_jewellers_jwt_secret_key_2026";

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function authenticateToken(req, res, next) {
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

function requireAuth(req, res, next) {
  authenticateToken(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }
    next();
  });
}

function requireAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }
    next();
  });
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  requireAuth,
  requireAdmin,
};
