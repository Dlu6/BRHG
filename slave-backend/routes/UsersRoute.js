import express from "express";
import {
  registerAgent,
  createPJSIPUser,
  deleteAgent,
  getAgentDetailsByExtension,
  getAllUsers,
  getProfile,
  superUserLogin,
  updateAgentDetails,
  resetAgentPassword,
  agentLogout,
  pauseAgent,
  unpauseAgent,
  getAgentPauseStatus,
} from "../controllers/usersController.js";
import { sipAuthMiddleware } from "../middleware/sipAuth.js";

const router = express.Router();

router.post("/login", superUserLogin);

router.post("/agent-login", sipAuthMiddleware, registerAgent);

router.post("/agent-logout", sipAuthMiddleware, agentLogout);

// Agent pause/unpause routes
router.post("/pause", sipAuthMiddleware, pauseAgent);
router.post("/unpause", sipAuthMiddleware, unpauseAgent);
router.get("/pause-status", sipAuthMiddleware, getAgentPauseStatus);

router.get("/profile", getProfile);

router.post("/createAgent", createPJSIPUser);

router.get("/agents/:id", getAgentDetailsByExtension);

router.get("/agents", getAllUsers);

router.put("/agents/:id", updateAgentDetails);

router.post("/agents/:id/reset-password", resetAgentPassword);

router.delete("/agents/:id", deleteAgent);

export default router;
