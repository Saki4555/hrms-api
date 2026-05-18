// src/modules/late-application/late-application.controller.js
import {
  createLateApplication,
  getAllLateApplications,
  getLateApplicationsByEmployee,
  getLateApplicationsByTeam,
  approveLateApplication,
  rejectLateApplication,
  deleteLateApplication,
} from "./late-application.service.js";

// GET /api/late-application
export const getAllLateApplicationsController = async (req, res) => {
  try {
    const data = await getAllLateApplications(req.query);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error("getAllLateApplicationsController error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/late-application/employee/:personId
export const getLateApplicationsByEmployeeController = async (req, res) => {
  try {
    const { personId } = req.params;
    const { status, page, limit, sortBy, sortOrder } = req.query;
    const data = await getLateApplicationsByEmployee({
      personId,
      status: status || "",
      page,
      limit,
      sortBy: sortBy || "LATE_ID",
      sortOrder: sortOrder || "DESC",
    });
    res.json({ success: true, ...data }); // ← was: { success: true, data }
  } catch (err) {
    console.error("getLateApplicationsByEmployeeController error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/late-application/team/:supervisorId
export const getLateApplicationsByTeamController = async (req, res) => {
  try {
    const { supervisorId } = req.params;
   const { status, page, limit, sortBy, sortOrder } = req.query;
const data = await getLateApplicationsByTeam({
  supervisorId,
  status:    status    || "",
  page,
  limit,
  sortBy:    sortBy    || "LATE_ID",
  sortOrder: sortOrder || "DESC",
});
    res.json({ success: true, ...data }); // ← was: { success: true, data }
  } catch (err) {
    console.error("getLateApplicationsByTeamController error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/late-application
export const createLateApplicationController = async (req, res) => {
  try {
    const data = await createLateApplication(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("createLateApplicationController error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/late-application/:id/approve
export const approveLateApplicationController = async (req, res) => {
  try {
    const { id } = req.params;
    const { approverId, notificationId } = req.body;
    await approveLateApplication(id, approverId, notificationId);
    res.json({ success: true });
  } catch (err) {
    console.error("approveLateApplicationController error:", err);
    const status = err.message.includes("already") ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

// POST /api/late-application/:id/reject
export const rejectLateApplicationController = async (req, res) => {
  try {
    const { id } = req.params;
    const { approverId, notificationId, reason } = req.body;
    await rejectLateApplication(id, approverId, notificationId, reason);
    res.json({ success: true });
  } catch (err) {
    console.error("rejectLateApplicationController error:", err);
    const status = err.message.includes("already") ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

// DELETE /api/late-application/:id
export const deleteLateApplicationController = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteLateApplication(id);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteLateApplicationController error:", err);
    const status = err.message.includes("already") ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};
