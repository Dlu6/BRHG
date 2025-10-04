import sequelize from "../config/sequelize.js";
import { PJSIPEndpoint } from "../models/pjsipModel.js";
import QueueMember from "../models/queueMemberModel.js";
import UserModel from "../models/usersModel.js";
import { VoiceQueue } from "../models/voiceQueueModel.js";
import amiService from "../services/amiService.js";

// Create Voice Queue
export const createVoiceQueueController = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const queueData = req.body;
    const voiceQueue = await VoiceQueue.create(queueData, { transaction });

    // Reload queues in Asterisk to pick up new queue
    // await amiService.executeAction({
    //   Action: "Command",
    //   Command: "queue reload all",
    // });

    await transaction.commit();

    return res.status(201).json({
      message: "Voice queue created successfully!",
      voiceQueue,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating voice queue:", error);
    return res.status(500).json({ message: "Failed to create voice queue" });
  }
};

//   Get Voice Queue
export const getVoiceQueuesController = async (req, res) => {
  try {
    // ✅ Step 1: Fetch all voice queues from the MySQL database
    const voiceQueues = await VoiceQueue.findAll({
      include: [
        {
          model: QueueMember,
          as: "queue_members",
        },
      ],
    });

    // ✅ Step 2: Return MySQL data without AMI
    res.status(200).json(voiceQueues);
  } catch (error) {
    console.error("❌ Error fetching voice queues:", error);
    res.status(500).json({ message: "Failed to fetch voice queues" });
  }
};

//   Update the voice queue
export const updateVoiceQueueController = async (req, res) => {
  const { queueId } = req.params;
  const updateData = req.body;
  const transaction = await sequelize.transaction();

  try {
    const voiceQueue = await VoiceQueue.findByPk(queueId);

    if (!voiceQueue) {
      return res.status(404).json({ message: "Voice queue not found" });
    }

    const updatedQueue = await voiceQueue.update(updateData, {
      transaction,
      returning: true,
    });

    await transaction.commit();

    res.status(200).json({
      message: "Voice queue updated successfully",
      voiceQueue: updatedQueue,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating voice queue:", error);
    console.log(updateData, "updateData in updateVoiceQueueController");
    res
      .status(500)
      .json({ message: "Failed to update queue: " + error.message });
  }
};

//   Delete Voice Queue
export const deleteVoiceQueueController = async (req, res) => {
  const { queueId } = req.params;
  const transaction = await sequelize.transaction();

  try {
    const voiceQueue = await VoiceQueue.findByPk(queueId);
    if (!voiceQueue) {
      return res.status(404).json({ message: "Voice queue not found" });
    }

    // Delete queue members from database
    await QueueMember.destroy({
      where: { queue_id: queueId },
      transaction,
    });

    // Delete queue from database
    await voiceQueue.destroy({ transaction });

    // Reload queues in Asterisk
    // await amiService.executeAction({
    //   Action: "Command",
    //   Command: "queue reload all",
    // });

    await transaction.commit();

    res.status(200).json({
      message: "Voice queue deleted successfully",
      id: queueId,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting voice queue:", error);
    res.status(500).json({ message: "Failed to delete voice queue" });
  }
};

export const addQueueMemberController = async (req, res) => {
  const { queueId } = req.params;
  const { members } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const voiceQueue = await VoiceQueue.findOne({
      where: { id: queueId },
    });

    if (!voiceQueue) {
      return res.status(404).json({ message: "Voice queue not found" });
    }

    const createdMembers = [];

    for (const member of members) {
      const { Interface, MemberName, Penalty } = member;
      const endpointId = Interface.replace("PJSIP/", ""); // Extract endpoint ID

      // Create queue member with endpoint_id
      const queueMember = await QueueMember.create(
        {
          queue_id: queueId,
          queue_name: voiceQueue.name,
          interface: Interface,
          membername: MemberName,
          penalty: Penalty || 0,
          endpoint_id: endpointId, // Add this line
        },
        { transaction }
      );

      createdMembers.push(queueMember);
    }

    await transaction.commit();

    // Reload queues after DB changes
    await amiService.executeAction({
      Action: "Command",
      Command: "queue reload all",
    });

    res.status(200).json({
      success: true,
      message: "Members added to queue successfully",
      queue: voiceQueue.name,
      members: createdMembers,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error adding queue member:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const removeQueueMemberController = async (req, res) => {
  const { queueId } = req.params;
  const { Interface } = req.body;
  // console.log(req.body, "req.body in removeQueueMemberController ?????");
  const transaction = await sequelize.transaction();

  try {
    const voiceQueue = await VoiceQueue.findByPk(queueId);

    if (!voiceQueue) {
      return res.status(404).json({ message: "Voice queue not found" });
    }

    // Remove from database
    await QueueMember.destroy({
      where: {
        queue_id: queueId,
        interface: Interface,
      },
      transaction,
    });

    // await amiService.executeAction({
    //   Action: "Command",
    //   Command: "queue reload all",
    // });

    await transaction.commit();

    res.status(200).json({
      message: "Member removed from queue successfully",
      queue: voiceQueue.name,
      Interface,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error removing queue member:", error);
    console.log(error, "error in removeQueueMemberController ?????");
    res.status(500).json({ message: "Failed to remove queue member" });
  }
};

// voiceQueueController.js
export const getAvailableEndpointsController = async (req, res) => {
  try {
    const pjsipEndpoints = await PJSIPEndpoint.findAll({
      where: { endpoint_type: "user" },
      include: [
        {
          model: UserModel,
          as: "user",
          required: false,
          attributes: ["extension", "full_name", "username"],
        },
      ],
      raw: true,
      nest: true,
    });

    const endpoints = pjsipEndpoints
      .filter((endpoint) => endpoint.user)
      .map((endpoint) => ({
        id: endpoint.id,
        extension: endpoint.id,
        name: endpoint.user?.full_name || endpoint.id,
        username: endpoint.user?.full_name || endpoint.id,
        status: endpoint.status,
        paused: endpoint.paused || false,
        registered: endpoint.registered || false,
        transport: endpoint.transport,
        webrtc: endpoint.webrtc,
      }));

    return res.status(200).json({
      success: true,
      endpoints,
      message: `✅ Successfully retrieved ${endpoints.length} endpoints`,
    });
  } catch (error) {
    console.error("❌ Error fetching available endpoints:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch available endpoints: " + error.message,
    });
  }
};

// Get queue members
export const getQueueMembersController = async (req, res) => {
  const { queueId } = req.params;

  try {
    const voiceQueue = await VoiceQueue.findByPk(queueId, {
      include: [
        {
          model: QueueMember,
          as: "queue_members",
          include: [
            {
              model: PJSIPEndpoint,
              as: "pjsip_endpoint",
              where: { endpoint_type: "user" },
              required: true,
            },
          ],
        },
      ],
    });

    if (!voiceQueue) {
      return res.status(404).json({ message: "Voice queue not found" });
    }

    // Map queue members directly from database
    const members = voiceQueue.queue_members.map((dbMember) => ({
      ...dbMember.toJSON(),
      status: dbMember.pjsip_endpoint?.status || "Unknown",
      paused: dbMember.paused || false,
    }));

    res.status(200).json({
      success: true,
      members,
      queueName: voiceQueue.name,
    });
  } catch (error) {
    console.error("❌ Error fetching queue members:", error);
    res.status(500).json({ message: "Failed to fetch queue members" });
  }
};
