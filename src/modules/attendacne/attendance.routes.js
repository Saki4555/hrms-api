import express from "express";
import {
  getAttendance,
  getDetail,
  getSummary,
  triggerProcess,
  exportCSV,
  exportExcel,
  exportPDF,
} from "./attendance.controller.js";

const router = express.Router();

// ── Core attendance ────────────────────────────────────────────────────────
router.get("/",                          getAttendance);    // paginated list
router.get("/summary",                   getSummary);       // summary counts
router.get("/detail/:employeeId/:date",  getDetail);        // raw ATT_LOG detail

// ── Manual processing trigger ──────────────────────────────────────────────
router.post("/process",                  triggerProcess);   // manual reprocess

// ── Export ─────────────────────────────────────────────────────────────────
router.get("/export/csv",                exportCSV);
router.get("/export/excel",              exportExcel);
router.get("/export/pdf",                exportPDF);

export default router;