// src/modules/pay-structure/pay-component.controller.js
import * as service from "./pay-component.service.js";

export const getAll = async (req, res) => {
  try {
    res.json(await service.getPayComponents());
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getOne = async (req, res) => {
  try {
    const row = await service.getPayComponentById(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found." });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const create = async (req, res) => {
  try {
    const created_by = req.user?.username ?? "SYSTEM";
    res.status(201).json(await service.createPayComponent({ ...req.body, created_by }));
  } catch (err) { res.status(400).json({ error: err.message }); }
};

export const update = async (req, res) => {
  try {
    const updated_by = req.user?.username ?? "SYSTEM";
    res.json(await service.updatePayComponent(req.params.id, { ...req.body, updated_by }));
  } catch (err) { res.status(400).json({ error: err.message }); }
};

export const remove = async (req, res) => {
  try {
    res.json(await service.deletePayComponent(req.params.id));
  } catch (err) { res.status(400).json({ error: err.message }); }
};