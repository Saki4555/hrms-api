// src/modules/dashboard/dashboard.controller.js
// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD CONTROLLER
//  Reads req.user (set by protectRouteV2), dispatches to the correct
//  service function based on role, and returns a single JSON response.
// ─────────────────────────────────────────────────────────────────────────────

import {
  getAdminHrDashboard,
  getSupervisorDashboard,
  getEmployeeDashboard,
} from "./dashboard.service.js";

// GET /api/dashboard/summary
export const getDashboardSummary = async (req, res) => {
  try {
    // req.user is attached by protectRouteV2 middleware
    // Shape: { id, username, employee_id, roles: [], permissions: [] }
    const { roles = [], employee_id } = req.user;

    // Role priority mirrors the pattern used in leave-request-list.jsx
    const isAdminOrHR  = roles.includes("ADMIN") || roles.includes("HR");
    const isSupervisor = !isAdminOrHR && roles.includes("SUPERVISOR");

    let data;
    if (isAdminOrHR) {
      data = await getAdminHrDashboard(employee_id);
    } else if (isSupervisor) {
      data = await getSupervisorDashboard(employee_id);
    } else {
      data = await getEmployeeDashboard(employee_id);
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[Dashboard] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};