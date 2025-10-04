import sequelize, { Op } from "../config/sequelize.js";
import dns from "dns";
import { promisify } from "util";
import {
  PJSIPEndpoint,
  PJSIPAuth,
  PJSIPAor,
  PJSIPEndpointIdentifier,
  // PJSIPRegistration,
  // PJSIPEndpointIdentifier,
  // PJSIPIdentify,
} from "../models/pjsipModel.js";
import amiService from "../services/amiService.js";
import { updatePJSIPConfig } from "../utils/asteriskConfigWriter.js";
import { checkBalance } from "../services/trunkBalanceService.js";

export const createTrunk = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      name,
      defaultUser,
      password,
      host,
      context,
      transport,
      codecs = "ulaw,alaw",
      endpoint_type = "trunk",
      isP2P = false,
      fromUser,
      providerIPs, // optional CSV from UI for identify match
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: Truck name!",
      });
    }

    // Ensure PJSIP transport configurations exist before creating trunk
    try {
      const { updatePJSIPTransports, checkPJSIPTransports } = await import(
        "../utils/asteriskConfigWriter.js"
      );

      // First check if transports exist
      const transportStatus = await checkPJSIPTransports();
      console.log("Current transport status:", transportStatus);

      if (!transportStatus.exists) {
        // If no transports exist, try to create them
        await updatePJSIPTransports();
        console.log(
          "PJSIP transport configurations created before trunk creation"
        );
      } else {
        console.log("PJSIP transport configurations already exist");
      }
    } catch (transportError) {
      console.error(
        "Failed to ensure PJSIP transport configurations:",
        transportError.message
      );
      return res.status(500).json({
        success: false,
        message:
          "Cannot create trunk: External IP configuration required. Please configure an external IP in Network Settings first.",
        details: transportError.message,
      });
    }

    const baseId = name;
    const cleanHost = host.replace(/^sip:/, "").replace(/:\d+$/, "");

    // Resolve provider IPs for identify mapping (prefer explicit input)
    const lookup = promisify(dns.lookup);
    let ipList = [];
    try {
      if (typeof providerIPs === "string" && providerIPs.trim() !== "") {
        ipList = providerIPs
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        const results = await lookup(cleanHost, { all: true, family: 4 });
        ipList = Array.from(new Set(results.map((r) => r.address)));
      }
    } catch (e) {
      // Fallback: leave empty, but continue; match_header will still help
      ipList = [];
    }
    // Sanitize any CIDR suffixes in input and build proper /32 CIDRs
    const sanitizedIps = ipList.map((ip) => ip.replace(/\/.+$/, ""));
    const matchValue =
      sanitizedIps.length > 0
        ? sanitizedIps.map((ip) => `${ip}/32`).join(",")
        : cleanHost;

    // 1. Create Endpoint
    await PJSIPEndpoint.create(
      {
        id: baseId,
        transport,
        context,
        identify_by: "ip,username,auth_username",
        disallow: "all",
        allow: codecs,
        auth: isP2P ? null : `${baseId}_auth`,
        aors: `${baseId}_aor`,
        // Ensure identity headers are sent by default for trunks
        send_pai: "yes",
        trust_remote_party_id: "yes",
        send_remote_party_id_header: "yes",
        endpoint_type,
        trunk_id: baseId,
        outbound_proxy: `sip:${cleanHost}:5060`,
        from_domain: cleanHost,
        from_user: fromUser,
        rtp_symmetric: "yes",
        force_rport: "yes",
        rewrite_contact: "yes",
        direct_media: "no",
        account_number: null,
        phone_number: null,
      },
      { transaction }
    );

    if (!isP2P) {
      // 2. Create Auth
      await PJSIPAuth.create(
        {
          id: `${baseId}_auth`,
          auth_type: "userpass",
          username: defaultUser,
          password,
        },
        { transaction }
      );
    }

    // 3. Create AOR (prefer IP contact if available to avoid DNS issues)
    const contactHost = sanitizedIps.length > 0 ? sanitizedIps[0] : cleanHost;
    await PJSIPAor.create(
      {
        id: `${baseId}_aor`,
        contact: `sip:${contactHost}:5060`,
        qualify_frequency: 60,
        max_contacts: 1,
        remove_existing: "yes",
        support_path: "yes",
      },
      { transaction }
    );

    // 4. Create Endpoint Identifier
    await PJSIPEndpointIdentifier.create(
      {
        id: `${baseId}_identify`,
        endpoint: baseId,
        match: matchValue,
        srv_lookups: "no",
        match_header: `P-Asserted-Identity: <sip:.*@${cleanHost}>`,
        match_request_uri: "no",
      },
      { transaction }
    );

    // Best-effort PJSIP conf update (do not fail transaction if remote-managed)
    try {
      await updatePJSIPConfig({
        name: baseId,
        username: defaultUser,
        password,
        host: cleanHost,
        transport,
        context,
        codecs,
        isP2P,
      });
    } catch (confErr) {
      console.warn("PJSIP conf update skipped:", confErr?.message || confErr);
    }

    await transaction.commit();

    // Reload PJSIP
    await amiService.executeAction({
      Action: "Command",
      Command: "pjsip reload",
    });

    res.status(201).json({
      success: true,
      message: "Trunk created successfully",
      trunk: {
        endpoint: {
          id: baseId,
          active: 1,
          enabled: true,
        },
        auth: isP2P ? null : { id: `${baseId}_auth`, username: defaultUser },
        aor: {
          id: `${baseId}_aor`,
          contact: `sip:${contactHost}:5060`,
        },
        identify: {
          endpoint: baseId,
          match: matchValue,
          srv_lookups: "no",
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating trunk:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create trunk",
      error: error.message,
    });
  }
};

export const updateTrunk = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { trunkId } = req.params;
    const updates = req.body;

    // Fetch the endpoint for the given trunk ID
    const endpoint = await PJSIPEndpoint.findOne({
      where: { trunk_id: trunkId },
      transaction,
    });

    if (!endpoint) {
      return res.status(404).json({
        success: false,
        message: "Trunk not found",
      });
    }

    // Ensure the transport value is properly formatted
    const transportValue = updates.transport || "transport-udp";
    if (!transportValue.startsWith("transport-")) {
      updates.transport = `transport-${transportValue}`;
    }

    // Update the endpoint
    await endpoint.update(
      {
        enabled: Boolean(updates.enabled),
        active: updates.enabled ? 1 : 0,
        transport: updates.transport || "transport-udp",
        context: updates.context || "from-voip-provider",
        identify_by: "ip,username,auth_username",
        allow: updates.codecs || "ulaw,alaw",
        from_user: updates.fromUser || updates.defaultUser,
        from_domain: updates.fromDomain || updates.host,
        direct_media: updates.directMedia || "no",
        outbound_proxy: updates.outboundProxy || "",
        rewrite_contact: updates.rewriteContact || "yes",
        rtp_symmetric: updates.rtpSymmetric || "yes",
        // Identity header controls (defaults to yes for trunks)
        send_pai: updates.send_pai || "yes",
        trust_remote_party_id: updates.trust_remote_party_id || "yes",
        send_remote_party_id_header:
          updates.send_remote_party_id_header || "yes",
        call_counter: updates.callCounter || "yes",
        encryption: updates.encryption || "no",
        account_number: updates.account_number || endpoint.account_number,
        phone_number: updates.phone_number || endpoint.phone_number,
      },
      { transaction }
    );

    // Update the PJSIP Auth
    await PJSIPAuth.update(
      {
        auth_type: updates.auth_type || "userpass",
        username: updates.defaultUser,
        password: updates.password,
        realm: updates.realm || updates.host,
      },
      {
        where: { id: endpoint.auth },
        transaction,
      }
    );

    // Update the PJSIP AOR
    await PJSIPAor.update(
      {
        // If providerIPs provided, prefer first IP for contact; strip CIDR if present
        contact: (() => {
          if (
            updates.providerIPs &&
            typeof updates.providerIPs === "string" &&
            updates.providerIPs.split(",").filter(Boolean).length > 0
          ) {
            const first = updates.providerIPs
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)[0];
            const ip = first.replace(/\/.+$/, "");
            return `sip:${ip}:5060`;
          }
          const host = (updates.host || "").replace(/^sip:/, "");
          return host ? `sip:${host}:5060` : null;
        })(),
        qualify_frequency: updates.qualifyFrequency || 60,
        max_contacts: updates.maxContacts || 1,
        remove_existing: updates.removeExisting || "yes",
      },
      {
        where: { id: endpoint.aors },
        transaction,
      }
    );

    // Update the Endpoint Identifier: prefer explicit providerIPs, else resolve host
    if (updates.providerIPs || updates.host) {
      let matchValue = updates.host || "";
      try {
        if (updates.providerIPs && typeof updates.providerIPs === "string") {
          const ips = updates.providerIPs
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((ip) => ip.replace(/\/.+$/, "")) // strip any existing CIDR
            .map((ip) => `${ip}/32`);
          if (ips.length > 0) matchValue = ips.join(",");
        } else if (matchValue) {
          matchValue = matchValue.replace(/^sip:/, "");
        }
      } catch (_) {}

      await PJSIPEndpointIdentifier.update(
        {
          match: matchValue,
          match_request_uri: "no",
          srv_lookups: "no",
        },
        { where: { endpoint: trunkId }, transaction }
      );
    }
    // Reload PJSIP configurations via AMI
    await amiService.executeAction({
      Action: "Command",
      Command: "pjsip reload",
    });

    await transaction.commit();

    // Best-effort PJSIP conf update post-commit
    try {
      await updatePJSIPConfig({
        name: trunkId,
        username: updates.defaultUser,
        password: updates.password,
        host: updates.host,
        context: updates.context,
        codecs: updates.codecs,
        transport: updates.transport,
      });
    } catch (confErr) {
      console.warn("PJSIP conf update skipped:", confErr?.message || confErr);
    }

    // Fetch updated configurations
    const [updatedEndpoint, updatedAuth, updatedAor] = await Promise.all([
      PJSIPEndpoint.findOne({
        where: { trunk_id: trunkId },
        attributes: { include: ["enabled", "active"] },
      }),
      PJSIPAuth.findByPk(endpoint.auth),
      PJSIPAor.findByPk(endpoint.aors),
    ]);

    res.json({
      success: true,
      message: "Trunk updated successfully",
      trunk: {
        endpoint: updatedEndpoint,
        auth: updatedAuth,
        aor: updatedAor,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating trunk:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update trunk",
      error: error.message,
    });
  }
};

export const deleteTrunk = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { trunkId } = req.params;
    console.log(`Attempting to delete trunk with ID: ${trunkId}`);

    // Find the endpoint using either trunk_id or id (name)
    const endpoint = await PJSIPEndpoint.findOne({
      where: {
        [Op.or]: [{ trunk_id: trunkId }, { id: trunkId }],
      },
      transaction,
    });

    if (!endpoint) {
      console.log(`No endpoint found for trunkId: ${trunkId}`);
      return res.status(404).json({
        success: false,
        message: "Trunk endpoint not found",
      });
    }

    console.log(`Found endpoint:`, {
      id: endpoint.id,
      trunk_id: endpoint.trunk_id,
      auth: endpoint.auth,
      aors: endpoint.aors,
    });

    // Get the actual IDs from the endpoint
    const endpointId = endpoint.id; // This is the actual endpoint ID (name)
    const authId = endpoint.auth; // This will be the actual auth ID like "MyTrunk_auth"
    const aorId = endpoint.aors; // This will be the actual aor ID like "MyTrunk_aor"

    console.log(`Deleting trunk configurations:`, {
      endpointId,
      authId,
      aorId,
      trunkId,
    });

    // Validate that we have the required endpoint ID
    if (!endpointId) {
      throw new Error("Endpoint ID is required for deletion");
    }

    // Delete all PJSIP configurations in parallel
    const deletePromises = [];

    // Only delete auth if it exists
    if (authId) {
      deletePromises.push(
        PJSIPAuth.destroy({
          where: { id: authId },
          transaction,
        })
      );
    }

    // Only delete aor if it exists
    if (aorId) {
      deletePromises.push(
        PJSIPAor.destroy({
          where: { id: aorId },
          transaction,
        })
      );
    }

    // Always delete endpoint and identifier
    deletePromises.push(
      PJSIPEndpoint.destroy({
        where: { id: endpointId },
        transaction,
      }),
      PJSIPEndpointIdentifier.destroy({
        where: { endpoint: endpointId },
        transaction,
      })
    );

    await Promise.all(deletePromises);

    // Remove configurations from pjsip.conf
    try {
      await updatePJSIPConfig({
        name: endpointId, // Use the endpoint's actual ID
        delete: true,
      });
      console.log(
        `Successfully removed PJSIP configurations for: ${endpointId}`
      );
    } catch (configError) {
      console.warn(
        `Failed to remove PJSIP configurations for ${endpointId}:`,
        configError.message
      );
      // Continue with deletion even if config removal fails
    }

    // Reload PJSIP
    try {
      await amiService.executeAction({
        Action: "Command",
        Command: "pjsip reload",
      });
      console.log("PJSIP reload successful");
    } catch (reloadError) {
      console.warn("Failed to reload PJSIP:", reloadError.message);
      // Continue with deletion even if reload fails
    }

    await transaction.commit();

    res.json({
      success: true,
      message: "Trunk and all related configurations deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting trunk:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete trunk",
      error: error.message,
    });
  }
};

export const getTrunks = async (req, res) => {
  try {
    const trunks = await PJSIPEndpoint.findAll({
      attributes: [
        "id",
        "trunk_id",
        "transport",
        "endpoint_type",
        "enabled",
        "active",
        "context",
        "disallow",
        "allow",
        "auth",
        "aors",
        "from_user",
        "from_domain",
        "outbound_proxy",
        "direct_media",
        "rtp_symmetric",
        "force_rport",
        "rewrite_contact",
      ],
      where: { endpoint_type: "trunk" },
      include: [
        {
          model: PJSIPAor,
          as: "aorConfig",
          required: false,
          attributes: [
            "id",
            "contact",
            "qualify_frequency",
            "support_path",
            "default_expiration",
            "remove_existing",
            "max_contacts",
            // Note: removed user_id as it doesn't exist in the database
          ],
        },
        {
          model: PJSIPAuth,
          as: "authConfig",
          required: false,
          attributes: ["id", "auth_type", "password", "username"],
        },
        {
          model: PJSIPEndpointIdentifier,
          as: "identifies",
          required: false,
          attributes: ["id", "match", "match_request_uri", "srv_lookups"],
        },
      ],
    });

    const formattedTrunks = trunks.map((trunk) => {
      const identifyMatches = Array.isArray(trunk.identifies)
        ? trunk.identifies.map((i) => i.match).filter(Boolean)
        : [];
      const identify = Array.isArray(trunk.identifies)
        ? trunk.identifies[0] || null
        : null;

      return {
        trunkId: trunk.trunk_id,
        name: trunk.id,
        endpoint: {
          ...trunk.get(),
          registration: trunk.registration ? trunk.registration.get() : null,
        },
        aor: trunk.aorConfig || null,
        auth: trunk.authConfig || null,
        identifyMatches,
        identify,
      };
    });

    res.json({
      success: true,
      trunks: formattedTrunks,
    });
  } catch (error) {
    console.error("Error fetching trunks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trunks",
      error: error.message,
    });
  }
};

export const getTrunkById = async (req, res) => {
  try {
    const { trunkId } = req.params;

    // Find the trunk endpoint by trunk_id
    const endpoint = await PJSIPEndpoint.findOne({
      where: {
        trunk_id: trunkId,
        endpoint_type: "trunk",
      },
      include: [
        {
          model: PJSIPAor,
          as: "aorConfig",
          required: false,
        },
        {
          model: PJSIPAuth,
          as: "authConfig",
          required: false,
        },
      ],
    });

    if (!endpoint) {
      return res.status(404).json({
        success: false,
        message: "Trunk not found",
      });
    }

    // Fetch identify mappings (provider IPs / header rules)
    const identifies = await PJSIPEndpointIdentifier.findAll({
      where: { endpoint: endpoint.id },
      attributes: [
        "id",
        "endpoint",
        "match",
        "match_header",
        "match_request_uri",
      ],
    });

    const identifyMatches = identifies.map((i) => i.match).filter(Boolean);

    res.json({
      success: true,
      trunk: {
        name: trunkId,
        endpoint: endpoint.get(),
        auth: endpoint.authConfig,
        aor: endpoint.aorConfig,
        identify: identifies?.[0] || null,
        identifyMatches,
      },
    });
  } catch (error) {
    console.error("Error fetching trunk:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trunk",
      error: error.message,
    });
  }
};

export const checkTrunkBalance = async (req, res) => {
  try {
    const { trunkId } = req.params;

    // Find the trunk endpoint
    const endpoint = await PJSIPEndpoint.findOne({
      where: { trunk_id: trunkId },
    });

    if (!endpoint) {
      return res.status(404).json({
        success: false,
        message: "Trunk not found",
      });
    }

    if (!endpoint.account_number) {
      return res.status(400).json({
        success: false,
        message: "No account number configured for this trunk",
      });
    }

    // Check balance with provider
    const balanceResult = await checkBalance(endpoint.account_number);

    if (balanceResult.success) {
      // Update the trunk with new balance information
      await endpoint.update({
        current_balance: balanceResult.balance.amount,
        balance_currency: balanceResult.balance.currency,
        balance_last_updated: balanceResult.balance.lastUpdated,
        balance_error: null,
      });

      res.json({
        success: true,
        balance: balanceResult.balance,
        message: "Balance updated successfully",
      });
    } else {
      // Update error information
      await endpoint.update({
        balance_error: balanceResult.error || balanceResult.message,
        balance_last_updated: new Date(),
      });

      res.status(400).json({
        success: false,
        message: "Failed to check balance",
        error: balanceResult.error || balanceResult.message,
      });
    }
  } catch (error) {
    console.error("Error checking trunk balance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check balance",
      error: error.message,
    });
  }
};

export const updateTrunkBalanceInfo = async (req, res) => {
  try {
    const { trunkId } = req.params;
    const { account_number, phone_number } = req.body;

    // Find the trunk endpoint
    const endpoint = await PJSIPEndpoint.findOne({
      where: { trunk_id: trunkId },
    });

    if (!endpoint) {
      return res.status(404).json({
        success: false,
        message: "Trunk not found",
      });
    }

    // Update balance information
    await endpoint.update({
      account_number,
      phone_number,
    });

    res.json({
      success: true,
      message: "Trunk balance information updated successfully",
    });
  } catch (error) {
    console.error("Error updating trunk balance info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update balance information",
      error: error.message,
    });
  }
};

export const getTrunkBalance = async (req, res) => {
  try {
    const { trunkId } = req.params;

    // Find the trunk endpoint
    const endpoint = await PJSIPEndpoint.findOne({
      where: { trunk_id: trunkId },
    });

    if (!endpoint) {
      return res.status(404).json({
        success: false,
        message: "Trunk not found",
      });
    }

    res.json({
      success: true,
      balance: {
        amount: endpoint.current_balance || 0,
        currency: endpoint.balance_currency || "USD",
        lastUpdated: endpoint.balance_last_updated,
        error: endpoint.balance_error,
        accountNumber: endpoint.account_number,
        phoneNumber: endpoint.phone_number,
      },
    });
  } catch (error) {
    console.error("Error getting trunk balance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get balance",
      error: error.message,
    });
  }
};
