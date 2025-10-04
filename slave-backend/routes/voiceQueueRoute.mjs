// voiceQueueRoutes.js
import express from "express";
import {
  addQueueMemberController,
  createVoiceQueueController,
  deleteVoiceQueueController,
  getAvailableEndpointsController,
  getQueueMembersController,
  getVoiceQueuesController,
  removeQueueMemberController,
  updateVoiceQueueController,
} from "../controllers/voiceQueueController.js";

const router = express.Router();

// Voice Queue Management Routes
router.post("/create", createVoiceQueueController);
router.get("/read", getVoiceQueuesController);
router.put("/update/:queueId", updateVoiceQueueController);
router.delete("/delete/:queueId", deleteVoiceQueueController);

// Queue Member Management Routes
router.post("/members_add/:queueId", addQueueMemberController);
router.delete("/members_remove/:queueId", removeQueueMemberController);
router.get("/available-endpoints", getAvailableEndpointsController);
router.get("/:queueId/members", getQueueMembersController);

export default router;
