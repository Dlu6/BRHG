// middleware/authMiddleware.js

import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  // 1. Check for the internal API key for server-to-server communication
  const internalApiKey = req.headers["x-internal-api-key"];
  if (
    internalApiKey &&
    internalApiKey === process.env.SECRET_INTERNAL_API_KEY
  ) {
    // This is a trusted request from the admin panel.
    // We grant it temporary admin rights for the scope of this request.
    req.user = { role: "admin" };
    return next();
  }

  // 2. If no API key, fall back to standard JWT Bearer token authentication for users
  const authHeader = req.headers.authorization;

  // Enhanced logging for debugging
  console.log(`[AuthMiddleware] ${req.method} ${req.path}`);
  console.log(
    `[AuthMiddleware] Authorization header:`,
    authHeader ? "Present" : "Missing"
  );

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      error: "No authorization header provided",
      details:
        "Please include an Authorization header with a valid Bearer token",
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization format",
      error: "Authorization header must use Bearer token format",
      details: "Expected format: 'Bearer <your-jwt-token>'",
    });
  }

  const token = authHeader.split(" ")[1];

  // Validate token structure before attempting to verify
  if (!token || token.trim() === "") {
    return res.status(401).json({
      success: false,
      message: "Missing token",
      error: "Bearer token is empty or missing",
      details:
        "Authorization header found but no token provided after 'Bearer '",
    });
  }

  // Basic JWT structure validation (should have 3 parts separated by dots)
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    console.log(`[AuthMiddleware] Malformed token structure:`, {
      tokenLength: token.length,
      tokenParts: tokenParts.length,
      tokenPreview: token.substring(0, 20) + "...",
    });

    return res.status(401).json({
      success: false,
      message: "Malformed token structure",
      error:
        "JWT token must have exactly 3 parts separated by dots (header.payload.signature)",
      details: `Token has ${tokenParts.length} parts instead of 3. Please ensure you're using a valid JWT token.`,
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(
      `[AuthMiddleware] Token verified successfully for user:`,
      decoded.id || decoded.userId || decoded.username || "unknown"
    );
    // console.log(`[AuthMiddleware] Decoded token structure:`, decoded);

    // Normalize the user object - handle different token formats
    req.user = {
      id: decoded.id || decoded.userId,
      username: decoded.username,
      role: decoded.role,
      extension: decoded.extension,
      ...decoded,
    };
    next();
  } catch (error) {
    console.error(`[AuthMiddleware] Token verification failed:`, {
      errorName: error.name,
      errorMessage: error.message,
      tokenPreview: token.substring(0, 20) + "...",
      jwtSecret: process.env.JWT_SECRET ? "Present" : "Missing",
    });

    let errorMessage, errorDetails;

    switch (error.name) {
      case "JsonWebTokenError":
        if (error.message === "jwt malformed") {
          errorMessage = "Token format is invalid";
          errorDetails =
            "The provided JWT token is not properly formatted. Please log in again to get a new token.";
        } else if (error.message === "invalid token") {
          errorMessage = "Token is invalid";
          errorDetails =
            "The provided token is not valid. Please log in again.";
        } else {
          errorMessage = "Token validation error";
          errorDetails = error.message;
        }
        break;

      case "TokenExpiredError":
        errorMessage = "Token has expired";
        errorDetails = "Your session has expired. Please log in again.";
        break;

      case "NotBeforeError":
        errorMessage = "Token not active yet";
        errorDetails =
          "This token is not yet valid. Please check your system time.";
        break;

      default:
        errorMessage = "Authentication failed";
        errorDetails =
          "Unable to verify your credentials. Please try logging in again.";
    }

    return res.status(403).json({
      success: false,
      message: errorMessage,
      error: error.message,
      details: errorDetails,
      errorType: error.name,
    });
  }
};

export const isAdmin = (req, res, next) => {
  // This middleware works for both scenarios now.
  // It checks for the role assigned by either the API key check or the JWT verification.
  // Accept both 'admin' and 'super_admin' roles for cross-server compatibility
  if (
    req.user &&
    (req.user.role === "admin" || req.user.role === "super_admin")
  ) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Admin access required",
      error: "Insufficient permissions",
      details: "This operation requires administrator privileges",
    });
  }
};

export default authMiddleware;
