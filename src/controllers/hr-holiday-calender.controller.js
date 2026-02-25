import * as service from "../services/hr-holiday-calender.service.js";

/* INSERT */
export const create = async (req, res) => {
  try {
    await service.insertHoliday(req.body);
    res.status(201).json({ message: "Holiday Created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* UPDATE */
export const update = async (req, res) => {
  try {
    await service.updateHoliday(req.params.id, req.body);
    res.json({ message: "Holiday Updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* SOFT DELETE */
export const remove = async (req, res) => {
  try {
    await service.softDeleteHoliday(req.params.id);
    res.json({ message: "Holiday Soft Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* GET SINGLE */
export const getOne = async (req, res) => {
  try {
    const data = await service.getHolidayById(req.params.id);
    res.json({success: true, count: data.length , data});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* GET ALL */
export const getAll = async (req, res) => {
  try {
    const data = await service.getAllHoliday();
    res.json({success: true, count: data.length , data});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};