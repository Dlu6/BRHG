import express from "express";
import {
  saveIVRFlow,
  getIVRFlow,
  getAllIVRFlows,
  updateIVRFlow,
  deleteIVRFlow,
  publishIVRFlow,
} from "../controllers/ivrController.js";
import { authMiddlewareMain } from "../utils/auth.js";
const router = express.Router();

// Ensure all routes use authMiddleware
router.use(authMiddlewareMain);

router.post("/flow", saveIVRFlow);
router.get("/flow/:id", getIVRFlow);
router.get("/flows", getAllIVRFlows);
router.put("/flow/:id", updateIVRFlow);
router.delete("/flow/:id", deleteIVRFlow);
router.post("/publish/:id", publishIVRFlow);

export default router;
