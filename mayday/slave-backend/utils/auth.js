import jwt from "jsonwebtoken";
import UserModel from "../models/usersModel.js";
import { PJSIPAuth, PJSIPEndpoint } from "../models/pjsipModel.js";
import dotenv from "dotenv";

dotenv.config();

export const verifyToken = async (token) => {
  console.log("Token to verify:", token);
  try {
    if (!token) {
      throw new Error("No token provided");
    }

    // Handle Bearer prefix if present
    const actualToken = token.startsWith("Bearer ")
      ? token.split(" ")[1]
      : token;

    // Verify the token with proper JWT_SECRET
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);

    // Check if user still exists with proper associations
    const user = await UserModel.findOne({
      where: { id: decoded.id || decoded.userId },
      include: decoded.sipEnabled
        ? [
            {
              model: PJSIPEndpoint,
              as: "ps_endpoint",
            },
            {
              model: PJSIPAuth,
              as: "ps_auth",
            },
          ]
        : [],
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Return appropriate payload based on user type
    if (decoded.sipEnabled) {
      return {
        userId: user.id,
        username: user.username,
        role: user.role,
        extension: user.extension,
        sipEnabled: true,
        pjsip: user.ps_endpoint?.dataValues, // Include full PJSIP data
      };
    }

    return {
      userId: user.id,
      role: user.role,
      extension: user.extension,
    };
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      console.warn("Token has expired:", error.expiredAt);
      return null;
    }
    console.error("Token verification failed:", error);
    throw new Error(`Invalid token: ${error.message}`);
  }
};

export const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      extension: user.extension,
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" } // Updated from 24h to 8h for access tokens
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    {
      userId,
      type: "refresh",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // Refresh tokens last 7 days
  );
};

export const generateTokenPair = (user) => {
  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken(user.id);
  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token) => {
  try {
    if (!token) {
      throw new Error("No refresh token provided");
    }

    // Handle Bearer prefix if present
    const actualToken = token.startsWith("Bearer ")
      ? token.split(" ")[1]
      : token;

    // Verify the refresh token
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);

    // Verify it's a refresh token
    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Refresh token has expired");
    }
    throw new Error(`Invalid refresh token: ${error.message}`);
  }
};

export const parseJwtPayload = (token) => {
  try {
    if (!token) {
      return null;
    }

    // Handle Bearer prefix if present
    const actualToken = token.startsWith("Bearer ")
      ? token.split(" ")[1]
      : token;

    // Decode without verification to get payload
    const parts = actualToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token structure");
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf8")
    );
    return payload;
  } catch (error) {
    console.error("Failed to parse JWT payload:", error);
    return null;
  }
};

export const authMiddlewareMain = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = await verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Authentication failed" });
  }
};
