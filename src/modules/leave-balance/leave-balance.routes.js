// src/modules/leave-balance/leave-balance.routes.js

import express from "express";
import {
  getLeaveBalanceController,
  getLeaveBalanceByTypeController,
} from "./leave-balance.controller.js";

const router = express.Router();

// GET /api/leave-balance/:employeeId
router.get("/:employeeId", getLeaveBalanceController);

// GET /api/leave-balance/:employeeId/type/:leaveTypeId
router.get("/:employeeId/type/:leaveTypeId", getLeaveBalanceByTypeController);

export default router;

// ── Register in app.js ────────────────────────────────────────────────────────
// import leaveBalanceRoutes from "./modules/leave-balance/leave-balance.routes.js";
// app.use("/api/leave-balance", leaveBalanceRoutes);