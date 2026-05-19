// src/modules/attendance-correction/attendance-correction.controller.js
import {
  createCorrectionRequest,
  getAllCorrections,
  getCorrectionsByEmployee,
  getCorrectionsByTeam,
  approveCorrection,
  rejectCorrection,
  deleteCorrectionRequest,
} from "./attendance-correction.service.js";

// GET /api/attendance-correction
export const getAllCorrectionsController = async (req, res) => {
  console.log("req.user", req.user);
  try {
    const data = await getAllCorrections(req.query);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error("getAllCorrectionsController error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/attendance-correction/employee/:personId
export const getCorrectionsByEmployeeController = async (req, res) => {
  try {
    const { personId } = req.params;
    const { status, page, limit, sortBy, sortOrder } = req.query;
    const data = await getCorrectionsByEmployee({
      personId,
      status:    status    || "",
      page,
      limit,
      sortBy:    sortBy    || "CORRECTION_ID",
      sortOrder: sortOrder || "DESC",
    });
    res.json({ success: true, ...data });
  } catch (err) {
    console.error("getCorrectionsByEmployeeController error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/attendance-correction/team/:supervisorId
export const getCorrectionsByTeamController = async (req, res) => {
  try {
    const { supervisorId } = req.params;
    const { status, page, limit, sortBy, sortOrder } = req.query;
    const data = await getCorrectionsByTeam({
      supervisorId,
      status:    status    || "",
      page,
      limit,
      sortBy:    sortBy    || "CORRECTION_ID",
      sortOrder: sortOrder || "DESC",
    });
    res.json({ success: true, ...data });
  } catch (err) {
    console.error("getCorrectionsByTeamController error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/attendance-correction
export const createCorrectionRequestController = async (req, res) => {
  try {
    const data = await createCorrectionRequest(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("createCorrectionRequestController error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/attendance-correction/:id/approve
export const approveCorrectionController = async (req, res) => {
  try {
    const { id } = req.params;
    const { approverId, notificationId } = req.body;
    await approveCorrection(id, approverId, notificationId);
    res.json({ success: true });
  } catch (err) {
    console.error("approveCorrectionController error:", err);
    const status = err.message.includes("already") ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

// POST /api/attendance-correction/:id/reject
export const rejectCorrectionController = async (req, res) => {
  try {
    const { id } = req.params;
    const { approverId, notificationId, reason } = req.body;
    await rejectCorrection(id, approverId, notificationId, reason);
    res.json({ success: true });
  } catch (err) {
    console.error("rejectCorrectionController error:", err);
    const status = err.message.includes("already") ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

// DELETE /api/attendance-correction/:id
export const deleteCorrectionRequestController = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteCorrectionRequest(id);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteCorrectionRequestController error:", err);
    const status = err.message.includes("already") ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};