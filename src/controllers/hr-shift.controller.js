import * as shiftService from "../services/hr-shift.service.js";

export const createShift = async (req, res) => {
  try {

    const data = req.body;

    const result = await shiftService.createShift(data);

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getAllShift = async (req, res) => {
  try {

    const data = await shiftService.getAllShift();

    res.json({message: true, count: data.length , data});

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getShiftById = async (req, res) => {
  try {

    const id = req.params.id;

    const data = await shiftService.getShiftById(id);

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const updateShift = async (req, res) => {
  try {

    const id = req.params.id;

    const result = await shiftService.updateShift(id, req.body);

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const deleteShift = async (req, res) => {
  try {

    const id = req.params.id;

    const result = await shiftService.deleteShift(id);

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};