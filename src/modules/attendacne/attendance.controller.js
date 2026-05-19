// src\modules\attendacne\attendance.controller.js
import {
  getAttendanceList,
  getAttendanceDetail,
  getAttendanceForExport,
  getAttendanceSummary,
  processAttendance,
  getSupervisorTeamAttendance,
  getTeamAttendanceStats,
  getMyAttendanceList,
  getMyAttendanceSummary,
 manualAttendanceEdit,
  reprocessAttendanceForEmployee,
} from "./attendance.service.js";
import {
  generateCSV,
  generateExcel,
  generatePDF,
} from "./attendance.export.js";
import { format } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
//  ATTENDANCE LIST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/attendance
 * Returns paginated attendance records with all active filters applied.
 */
export const getAttendance = async (req, res) => {
  try {
    const result = await getAttendanceList({
      page: req.query.page,
      limit: req.query.limit,
      date: req.query.date,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      employeeId: req.query.employeeId,
      companyId: req.query.companyId,
      orgId: req.query.orgId,
      shiftId: req.query.shiftId,
      locationId: req.query.locationId,
      supervisorId: req.query.supervisorId,
      status: req.query.status,
      search: req.query.search,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[Attendance] getAttendance error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ATTENDANCE DETAIL (Raw ATT_LOG)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/attendance/detail/:employeeId/:date
 * Returns all raw ATT_LOG punches for an employee on a specific date.
 * Used by the "Details" popup.
 */
export const getDetail = async (req, res) => {
  try {
    const { employeeId, date } = req.params;
    if (!employeeId || !date) {
      return res
        .status(400)
        .json({ error: "employeeId and date are required" });
    }
    const data = await getAttendanceDetail(employeeId, date);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("[Attendance] getDetail error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SUMMARY STATS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/attendance/summary
 * Returns count totals: present, late, absent, early leave.
 */
export const getSummary = async (req, res) => {
  try {
    const data = await getAttendanceSummary({
      date: req.query.date,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      employeeId: req.query.employeeId,
      companyId: req.query.companyId,
      orgId: req.query.orgId,
      locationId: req.query.locationId,
      shiftId: req.query.shiftId,
      status: req.query.status,
      supervisorId: req.query.supervisorId,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("[Attendance] getSummary error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MANUAL TRIGGER (For testing / on-demand reprocessing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/attendance/process
 * Manually triggers ATT_LOG → HR_ATTENDANCE processing for a date range.
 * Useful for backfilling historical data or re-running failed nights.
 *
 * Body: { fromDate: "YYYY-MM-DD", toDate: "YYYY-MM-DD" }
 */
export const triggerProcess = async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;

    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({ error: "fromDate and toDate are required" });
    }

    const result = await processAttendance(fromDate, toDate);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[Attendance] triggerProcess error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORT ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds shared meta object for export headers/titles.
 */
const buildMeta = (query, companyName = "HRMS") => {
  let dateLabel = "";
  if (query.date) dateLabel = query.date;
  else if (query.fromDate && query.toDate)
    dateLabel = `${query.fromDate} to ${query.toDate}`;
  return { dateLabel, companyName };
};

/**
 * GET /api/attendance/export/csv
 * Downloads attendance as a CSV file.
 */
export const exportCSV = async (req, res) => {
  try {
    const rows = await getAttendanceForExport(req.query);
    const meta = buildMeta(req.query);
    const csv = generateCSV(rows, meta);

    const filename = `attendance_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error("[Attendance] exportCSV error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/attendance/export/excel
 * Downloads attendance as an Excel (.xlsx) file.
 */
export const exportExcel = async (req, res) => {
  try {
    const rows = await getAttendanceForExport(req.query);
    const meta = buildMeta(req.query);
    const buffer = await generateExcel(rows, meta);

    const filename = `attendance_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("[Attendance] exportExcel error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/attendance/export/pdf
 * Downloads attendance as a company letterhead style PDF.
 */
export const exportPDF = async (req, res) => {
  try {
    const rows = await getAttendanceForExport(req.query);
    const meta = buildMeta(req.query);
    const buffer = await generatePDF(rows, meta);

    const filename = `attendance_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("[Attendance] exportPDF error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── Supervisor: team attendance list ───────────────────────────────────────
// GET /api/attendance/team/:supervisorId
export const getTeamAttendance = async (req, res) => {
  try {
    const { supervisorId } = req.params;
    const result = await getSupervisorTeamAttendance(supervisorId, {
      page: req.query.page,
      limit: req.query.limit,
      date: req.query.date,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      status: req.query.status,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[Attendance] getTeamAttendance error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── Supervisor: team attendance stats ──────────────────────────────────────
// GET /api/attendance/team/:supervisorId/stats
export const getTeamStats = async (req, res) => {
  try {
    const { supervisorId } = req.params;
    const data = await getTeamAttendanceStats(supervisorId, {
      date: req.query.date,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("[Attendance] getTeamStats error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── ESS: my attendance list ────────────────────────────────────────────────
// GET /api/attendance/my/:employeeId
export const getMyAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const result = await getMyAttendanceList(employeeId, {
      page: req.query.page,
      limit: req.query.limit,
      date: req.query.date,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      status: req.query.status,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[Attendance] getMyAttendance error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── ESS: my attendance summary ─────────────────────────────────────────────
// GET /api/attendance/my/:employeeId/summary
export const getMyAttendanceSummaryHandler = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const data = await getMyAttendanceSummary(employeeId, {
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("[Attendance] getMyAttendanceSummary error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── Reprocess single employee by date range (Admin / HR) ───────────────────
// POST /api/attendance/reprocess/employee
// Body: { employeeId, fromDate: "YYYY-MM-DD", toDate: "YYYY-MM-DD" }
export const reprocessEmployee = async (req, res) => {
  try {
    const { employeeId, fromDate, toDate } = req.body;
    if (!employeeId || !fromDate || !toDate) {
      return res
        .status(400)
        .json({ error: "employeeId, fromDate and toDate are required" });
    }
    const result = await reprocessAttendanceForEmployee(
      employeeId,
      fromDate,
      toDate,
    );
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[Attendance] reprocessEmployee error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MANUAL ATTENDANCE EDIT  (Admin & HR only — ATT_CORRECTION_APPROVE)
//  PUT /api/attendance/:attendanceId/manual-edit
//
//  Body   : { inTime?: string (ISO), outTime?: string (ISO) }
//  Auth   : editorUsername is taken from req.user — NEVER from the body
//  Access : Admin & HR only (enforced at the route layer)
// ─────────────────────────────────────────────────────────────────────────────

export const manualAttendanceEditController = async (req, res) => {
  try {
    // ── Validation ───────────────────────────────────────────────────────────
    const attendanceId = parseInt(req.params.attendanceId, 10);

    if (!req.params.attendanceId || isNaN(attendanceId)) {
      return res.status(400).json({
        success: false,
        message: "attendanceId is required and must be a valid number.",
      });
    }

    // Both inTime and outTime may be null/omitted — that is a valid "no-punch"
    // edit that reprocess will classify as ABSENT.  We only reject if the param
    // key is missing entirely AND neither is provided at all; but since the spec
    // treats both-null as intentional, we accept it without further restriction.
    const inTime  = req.body.inTime  ?? null;
    const outTime = req.body.outTime ?? null;

    //TODO: editorUsername comes exclusively from the auth middleware — never the body
    const editorUsername = req.user?.username || "SYSTEM";

    if (!editorUsername) {
      return res.status(400).json({
        success: false,
        message: "Authenticated user context is missing.",
      });
    }

    // ── Service call ─────────────────────────────────────────────────────────
    await manualAttendanceEdit(attendanceId, inTime, outTime, editorUsername);

    return res.status(200).json({
      success: true,
      message: "Attendance updated and reprocessed.",
    });

  } catch (err) {
    // Surface 404 from service as a proper HTTP 404
    if (err.message === "Attendance record not found") {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    console.error("[Attendance] manualAttendanceEdit error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};