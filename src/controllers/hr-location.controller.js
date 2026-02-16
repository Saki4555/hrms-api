
import * as service from "../services/hr-location.service.js";

export const create = async (req, res) => {
  try {
    await service.createLocation(req.body);
    res.json({ message: "Location created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const update = async (req, res) => {
  try {
    await service.updateLocation(req.params.id, req.body);
    res.json({ message: "Location updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    await service.softDeleteLocation(req.params.id);
    res.json({ message: "Location deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const data = await service.getLocation(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const data = await service.getAllLocations();
    res.json({success:true, count:data.length, data:data});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
