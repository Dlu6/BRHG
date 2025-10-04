const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Not authorized, no token",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Not authorized, user not found",
      });
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Not authorized, token failed",
    });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: "Not authorized as admin",
    });
  }
};

// Internal API key middleware for slave server communication
const protectInternal = (req, res, next) => {
  try {
    const internalApiKey = req.headers["x-internal-api-key"];
    const expectedKey = process.env.SECRET_INTERNAL_API_KEY;

    // Debug logging (remove in production)
    console.log(
      "Received API key>>>>>>>>>:",
      internalApiKey ? "present" : "missing"
    );
    console.log("Expected key set>>>>>>>>>:", expectedKey ? "yes" : "no");

    if (!internalApiKey) {
      return res.status(401).json({
        success: false,
        error: "Internal API key required",
      });
    }

    if (internalApiKey !== expectedKey) {
      return res.status(401).json({
        success: false,
        error: "Invalid internal API key",
      });
    }

    // Mark request as internal
    req.isInternal = true;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Internal authentication failed",
    });
  }
};

// Combined middleware: allow either JWT token or internal API key
const protectOrInternal = (req, res, next) => {
  // Check for internal API key first
  const internalApiKey = req.headers["x-internal-api-key"];

  if (internalApiKey) {
    return protectInternal(req, res, next);
  }

  // Fall back to regular JWT protection
  return protect(req, res, next);
};

module.exports = { protect, admin, protectInternal, protectOrInternal };
