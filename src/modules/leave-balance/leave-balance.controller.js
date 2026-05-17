// src/modules/leave-balance/leave-balance.controller.js

import {
  getLeaveBalance,
  getLeaveBalanceByType,
} from "./leave-balance.service.js";

// GET /api/leave-balance/:employeeId
// GET /api/leave-balance/:employeeId?year=2025
export const getLeaveBalanceController = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const year = req.query.year ? parseInt(req.query.year) : null;

    const data = await getLeaveBalance(employeeId, year);
    res.json({ success: true, data });
  } catch (err) {
    console.error("getLeaveBalanceController error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/leave-balance/:employeeId/type/:leaveTypeId
// GET /api/leave-balance/:employeeId/type/:leaveTypeId?year=2025
export const getLeaveBalanceByTypeController = async (req, res) => {
  try {
    const { employeeId, leaveTypeId } = req.params;
    const year = req.query.year ? parseInt(req.query.year) : null;

    const data = await getLeaveBalanceByType(employeeId, leaveTypeId, year);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Leave type not found." });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error("getLeaveBalanceByTypeController error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};