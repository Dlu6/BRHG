const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Check for token in cookies
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Not authorized to access this route",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          status: "error",
          message: "No user found with this token",
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          status: "error",
          message: "User account is deactivated",
        });
      }

      // Grant access to protected route
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        status: "error",
        message: "Not authorized to access this route",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      status: "error",
      message: "Server error in authentication",
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

// Grant access to admin level users (admin and super_admin)
const authorizeAdmin = (req, res, next) => {
  if (!User.isAdmin(req.user.role)) {
    return res.status(403).json({
      status: "error",
      message: "Access denied. Administrator privileges required.",
    });
  }
  next();
};

// Grant access to super admin only
const authorizeSuperAdmin = (req, res, next) => {
  if (!User.isSuperAdmin(req.user.role)) {
    return res.status(403).json({
      status: "error",
      message: "Access denied. Super administrator privileges required.",
    });
  }
  next();
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Check for token in cookies
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    // If no token, continue without auth
    if (!token) {
      return next();
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id);

      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token invalid, continue without auth
      console.log("Invalid token in optional auth:", error.message);
    }

    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    next(); // Continue even if there's an error
  }
};

module.exports = {
  protect,
  authorize,
  authorizeAdmin,
  authorizeSuperAdmin,
  optionalAuth,
};
