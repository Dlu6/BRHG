import express from "express";
import {
  createInboundRoute,
  deleteInboundRoute,
  getApplications,
  getInboundRoutes,
  getOneInboundRoute,
  updateInboundRoute,
} from "../controllers/inboundRouteController.js";
import InboundRoute from "../models/inboundRouteModel.js";
import DidInventory from "../models/didInventoryModel.js";

const router = express.Router();

router.post("/create", createInboundRoute);
router.get("/read", getInboundRoutes);
router.get("/get-one/:routeId", getOneInboundRoute);

router.get("/", getApplications);
// router.post("/create", createInboundRoute);
router.put("/update-inbound-route/:routeId", updateInboundRoute);
router.delete("/delete-inbound/:routeId", deleteInboundRoute);

// Minimal DID inventory list for dropdowns
router.get("/dids", async (req, res) => {
  try {
    // Prefer did_inventory if present; else fall back to inbound_routes
    let data = [];
    try {
      const inv = await DidInventory.findAll({
        where: { is_active: true, allow_outbound: true },
        order: [["did", "ASC"]],
      });
      if (Array.isArray(inv) && inv.length) {
        data = inv.map((r) => ({
          did: r.did,
          label: `${r.callerid_name || r.outlet || r.did} (${r.did})`,
        }));
      }
    } catch (_) {}
    if (!data.length) {
      const rows = await InboundRoute.findAll({
        attributes: ["phone_number", "alias", "enabled"],
        order: [["phone_number", "ASC"]],
      });
      data = rows
        .filter((r) => r.enabled !== false)
        .map((r) => ({
          did: r.phone_number,
          label: `${r.alias || r.phone_number} (${r.phone_number})`,
        }));
    }
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
