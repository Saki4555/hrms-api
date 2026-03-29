import { success } from "zod";
import {
  createLeaveService,
  getAllLeavesService,
  getLeaveByIdService,
  updateLeaveService,
  deleteLeaveService,
} from "../services/hr-leave-request.service.js";

// CREATE
export const createLeave = async (req, res) => {
  try {
    await createLeaveService(req.body);
    res.status(201).json({ message: "Leave created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET ALL
export const getAllLeaves = async (req, res) => {
  try {
    const data = await getAllLeavesService();
    res.json({success: true, count: data.length, data});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET SINGLE
export const getLeaveById = async (req, res) => {
  try {
    const data = await getLeaveByIdService(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Leave not found" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
export const updateLeave = async (req, res) => {
  try {
    await updateLeaveService(req.params.id, req.body);
    res.json({ message: "Leave updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
export const deleteLeave = async (req, res) => {
  try {
    await deleteLeaveService(req.params.id);
    res.json({ message: "Leave deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};