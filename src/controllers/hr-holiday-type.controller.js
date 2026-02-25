import * as service from "../services/hr-holiday-type.service.js";

export const create = async (req, res) => {
  try {
    await service.createHolidayType(req.body);
    res.status(201).json({ message: "Holiday Type Created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const update = async (req, res) => {
  try {
    await service.updateHolidayType(req.params.id, req.body);
    res.json({ message: "Holiday Type Updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    await service.softDeleteHolidayType(req.params.id);
    res.json({ message: "Holiday Type Soft Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const data = await service.getHolidayTypeById(req.params.id);
    res.json({success: true, count: data.length, data});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const data = await service.getAllHolidayType();
    res.json({success: true, count: data.length, data});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};