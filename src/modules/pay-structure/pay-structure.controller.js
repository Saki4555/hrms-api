// src/modules/pay-structure/pay-structure.controller.js
import * as service from "./pay-structure.service.js";

// ── Pay Structure CRUD ────────────────────────────────────────────────────────
export const getAll = async (req, res) => {
  try {
    res.json(await service.getPayStructures());
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getOne = async (req, res) => {
  try {
    const row = await service.getPayStructureById(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found." });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const create = async (req, res) => {
  try {
    const created_by = req.user?.username ?? "SYSTEM";
    res.status(201).json(await service.createPayStructure({ ...req.body, created_by }));
  } catch (err) { res.status(400).json({ error: err.message }); }
};

export const update = async (req, res) => {
  try {
    const updated_by = req.user?.username ?? "SYSTEM";
    res.json(await service.updatePayStructure(req.params.id, { ...req.body, updated_by }));
  } catch (err) { res.status(400).json({ error: err.message }); }
};

export const remove = async (req, res) => {
  try {
    res.json(await service.deletePayStructure(req.params.id));
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// ── Structure Components ──────────────────────────────────────────────────────
export const addComponent = async (req, res) => {
  try {
    res.status(201).json(
      await service.addComponentToStructure(req.params.id, req.body)
    );
  } catch (err) { res.status(400).json({ error: err.message }); }
};

export const updateComponent = async (req, res) => {
  try {
    res.json(
      await service.updateComponentInStructure(req.params.id, req.params.componentId, req.body)
    );
  } catch (err) { res.status(400).json({ error: err.message }); }
};

export const removeComponent = async (req, res) => {
  try {
    res.json(
      await service.removeComponentFromStructure(req.params.id, req.params.componentId)
    );
  } catch (err) { res.status(400).json({ error: err.message }); }
};