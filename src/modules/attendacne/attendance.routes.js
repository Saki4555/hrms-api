// src\modules\attendacne\attendance.routes.js
import express from "express";
import {
  getAttendance,
  getDetail,
  getSummary,
  triggerProcess,
  exportCSV,
  exportExcel,
  exportPDF,
  getTeamAttendance,
  getTeamStats,
  getMyAttendance,
  getMyAttendanceSummaryHandler,
  reprocessEmployee,
  manualAttendanceEditController,   
} from "./attendance.controller.js";
import { protectRouteV2 } from "../auth-v2/auth-v2.middleware.js";

const router = express.Router();

// ── Core attendance ────────────────────────────────────────────────────────
router.get("/",                                getAttendance);
router.get("/summary",                         getSummary);
router.get("/detail/:employeeId/:date",        getDetail);

// ── Manual processing trigger ──────────────────────────────────────────────
router.post("/process",                        triggerProcess);
router.post("/reprocess/employee",             reprocessEmployee);

// ── Manual Attendance Edit (Admin & HR only — ATT_CORRECTION_APPROVE) ─────  ← ADDED
router.put(
  "/:attendanceId/manual-edit",
  manualAttendanceEditController,
);

// ── Export ────────────────────────────────────────────────────────────────
router.get("/export/csv",                      exportCSV);
router.get("/export/excel",                    exportExcel);
router.get("/export/pdf",                      exportPDF);

// ── Supervisor (MSS) ───────────────────────────────────────────────────────
router.get("/team/:supervisorId",              getTeamAttendance);
router.get("/team/:supervisorId/stats",        getTeamStats);

// ── Employee self-service (ESS) ────────────────────────────────────────────
router.get("/my/:employeeId",                  getMyAttendance);
router.get("/my/:employeeId/summary",          getMyAttendanceSummaryHandler);

export default router;