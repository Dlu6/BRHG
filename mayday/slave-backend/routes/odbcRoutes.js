import express from "express";
import { authMiddlewareMain } from "../utils/auth.js";
import {
  createOdbcConnection,
  deleteOdbcConnection,
  getOdbcConnections,
  updateOdbcConnection,
} from "../controllers/odbcController.js";

const router = express.Router();

// Get all ODBC connections
router.get("/", authMiddlewareMain, getOdbcConnections);

// Create new ODBC connection
router.post("/", authMiddlewareMain, createOdbcConnection);

// Update ODBC connection
router.put("/:id", authMiddlewareMain, updateOdbcConnection);

// Delete ODBC connection
router.delete("/:id", authMiddlewareMain, deleteOdbcConnection);

export default router;
