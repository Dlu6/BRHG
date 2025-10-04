import jwt from "jsonwebtoken";
import UserModel from "../models/usersModel.js";

// middleware/sipAuth.js
export const sipAuthMiddleware = async (req, res, next) => {
  // Log all headers for debugging
  // console.log("Request headers:", JSON.stringify(req.headers, null, 2));

  // Try different ways to get the authorization header
  const authHeader = req.headers.authorization || req.headers.Authorization;

  // console.log("Auth header detected:", authHeader);

  try {
    if (!authHeader) {
      // If the authorization header is missing, check if it's in the body for agent-login
      if (
        req.path === "/agent-login" &&
        req.body &&
        req.body.email &&
        req.body.password
      ) {
        console.log(
          "No auth header but found credentials in body, proceeding..."
        );
        // For agent-login, we'll allow credentials in the body
        req.user = { email: req.body.email };
        return next();
      }

      throw new Error("No authorization header provided");
    }

    let user;
    let token;

    if (authHeader.startsWith("Bearer ")) {
      // Extract token and remove any duplicate 'Bearer' prefixes
      token = authHeader
        .replace(/^Bearer\s+Bearer\s+/, "Bearer ")
        .split(" ")[1];

      if (!token) {
        throw new Error("Invalid token format");
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await UserModel.findOne({
        where: { id: decoded.userId, disabled: false },
      });
    } else if (authHeader.startsWith("Basic ")) {
      // Basic auth
      const credentials = Buffer.from(
        authHeader.split(" ")[1],
        "base64"
      ).toString();

      console.log(
        "Decoded credentials (format only):",
        credentials.includes(":") ? "valid" : "invalid"
      );

      const [email, password] = credentials.split(":");

      if (!email || !password) {
        throw new Error("Invalid Basic auth format");
      }

      user = await UserModel.findExtensionByEmail(email);

      if (!user || user.auth?.password !== password) {
        throw new Error("Invalid credentials");
      }
    } else {
      throw new Error("Invalid authorization type");
    }

    if (!user) {
      throw new Error("User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

// Phonebar Verify Extension Access
export const verifyExtensionAccess = async (req, res, next) => {
  const { extension } = req.body;

  try {
    const user = await UserModel.findOne({
      where: {
        extension,
        disabled: false,
      },
    });

    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to clear this extension",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying extension access",
    });
  }
};
