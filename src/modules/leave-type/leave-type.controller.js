import * as leaveTypeService from "./leave-type.service.js";

/* CREATE */
export const create = async (req, res) => {
  try {
    await leaveTypeService.createLeaveType(req.body);
    res.status(201).json({ success: true, message: "Leave type created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* GET ALL */
export const getAll = async (req, res) => {
  try {
    const data = await leaveTypeService.getAllLeaveTypes();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* GET ONE */
export const getOne = async (req, res) => {
  try {
    const data = await leaveTypeService.getLeaveTypeById(req.params.id);
    if (!data) return res.status(404).json({ error: "Leave type not found" });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* UPDATE */
export const update = async (req, res) => {
  try {
    const affected = await leaveTypeService.updateLeaveType(req.params.id, req.body);
    if (!affected) return res.status(404).json({ error: "Leave type not found" });
    res.json({ success: true, message: "Leave type updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* DELETE */
export const remove = async (req, res) => {
  try {
    const affected = await leaveTypeService.deleteLeaveType(req.params.id);
    if (!affected) return res.status(404).json({ error: "Leave type not found" });
    res.json({ success: true, message: "Leave type deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};