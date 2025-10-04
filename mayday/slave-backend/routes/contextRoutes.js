import { Router } from "express";
import DialplanContext from "../models/dialplanContextModel.js";
import { updateContextsConfig } from "../utils/asteriskConfigWriter.js";

const router = Router();

router.get("/contexts", async (req, res) => {
  try {
    const items = await DialplanContext.findAll({ order: [["name", "ASC"]] });
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/contexts", async (req, res) => {
  try {
    const { name, include, realtimeKey, description, active } = req.body || {};
    if (!name)
      return res.status(400).json({ success: false, error: "name required" });
    const created = await DialplanContext.create({
      name,
      include: include || null,
      realtimeKey: realtimeKey || name,
      description: description || null,
      active: active !== false,
    });
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put("/contexts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const found = await DialplanContext.findByPk(id);
    if (!found)
      return res.status(404).json({ success: false, error: "not found" });
    const { name, include, realtimeKey, description, active } = req.body || {};
    await found.update({
      name: name ?? found.name,
      include: include ?? found.include,
      realtimeKey: realtimeKey ?? found.realtimeKey,
      description: description ?? found.description,
      active: typeof active === "boolean" ? active : found.active,
    });
    res.json({ success: true, data: found });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete("/contexts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const found = await DialplanContext.findByPk(id);
    if (!found)
      return res.status(404).json({ success: false, error: "not found" });
    await found.destroy();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;

// Sync generated contexts into Asterisk and reload dialplan
router.post("/contexts/sync", async (req, res) => {
  try {
    await updateContextsConfig();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
