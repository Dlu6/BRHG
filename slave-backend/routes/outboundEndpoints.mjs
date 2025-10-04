// routes/outboundRouteRoutes.js
import express from "express";
import {
  createOutboundRoute,
  updateOutboundRoute,
  deleteOutboundRoute,
  getOutboundRoutes,
  getOutboundRouteById,
} from "../controllers/outboundRouteController.js";

const router = express.Router();

router.get("/read", getOutboundRoutes);
router.post("/create", createOutboundRoute);
router.get("/:routeId", getOutboundRouteById);
router.put("/update/:routeId", updateOutboundRoute);
router.delete("/delete/:routeId", deleteOutboundRoute);

export default router;
