import express from "express";
import {
  createExternIp,
  createLocalNet,
  createStun,
  createTurn,
  createPJSIPTransports,
  deleteExternIp,
  deleteLocalNet,
  deleteStun,
  deleteTurn,
  getExternIps,
  getLocalNets,
  getStuns,
  getTurns,
  updateExternIp,
  updateLocalNet,
  updateStun,
  updateTurn,
} from "../controllers/networkConfigController.js";

const router = express.Router();

// ExternIp routes
router.post("/extern-ip", createExternIp);
router.get("/extern-ip", getExternIps);
router.put("/extern-ip/:id", updateExternIp);
router.delete("/extern-ip/:id", deleteExternIp);

// Stun routes
router.post("/stun", createStun);
router.get("/stun", getStuns);
router.put("/stun/:id", updateStun);
router.delete("/stun/:id", deleteStun);

// Turn routes
router.post("/turn", createTurn);
router.get("/turn", getTurns);
router.put("/turn/:id", updateTurn);
router.delete("/turn/:id", deleteTurn);

// LocalNet routes
router.post("/local-net", createLocalNet);
router.get("/local-net", getLocalNets);
router.put("/local-net/:id", updateLocalNet);
router.delete("/local-net/:id", deleteLocalNet);

// PJSIP Transport routes
router.post("/pjsip-transports", createPJSIPTransports);

export default router;
