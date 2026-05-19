// src\modules\attendacne\attendance.service.js
// ─────────────────────────────────────────────────────────────────────────────
//  ATTENDANCE SERVICE
// ─────────────────────────────────────────────────────────────────────────────

// ── 3.4 ATTENDANCE DATA ───────────────────────────────────────────────────────
// TODO: receiveMobileAttendance  — insert AI face-detection punches from the mobile app
//                                  (Supervisor only via ATT_REALTIME_AI permission)
//                                  inserts into ATT_LOG then calls processAttendance
//                                  for that employee + date

// TODO: manualAttendanceEdit     — Admin/HR restricted direct edit of HR_ATTENDANCE
//                                  (ATT_CORRECTION_APPROVE); must log editor + timestamp

// ── 3.5 ATTENDANCE REPORTS ───────────────────────────────────────────────────
// TODO: getLateReport            — employees late in a date range with minutes late
// TODO: getAbsentReport          — employees with no attendance on working days
// TODO: getEarlyLeaveReport      — employees who punched out before shift end
// TODO: getAttendanceExceptions  — combined: late + absent + early leave in one query
// TODO: getMonthlyAttendanceSummaryPerEmployee
//                                — per-employee monthly breakdown
//                                  (present / late / absent / weekly-off / holiday / leave counts)

// ── ATTENDANCE CORRECTION (Self-Service side) ─────────────────────────────────
// TODO: submitCorrectionRequest  — employee requests correction for wrong/missing punch
// TODO: approveCorrectionRequest — Admin/HR reviews and applies the correction
// TODO: getCorrectionRequests    — list pending correction requests for HR/Admin dashboard

import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS = {
  PRESENT: "PRESENT",
  LATE: "LATE",
  EARLY_LEAVE: "EARLY_LEAVE",
  ABSENT: "ABSENT",
  UNSCHEDULED: "UNSCHEDULED", // punched in but no shift assigned — cannot classify
  HOLIDAY: "HOLIDAY", // date is a public/company holiday for the employee's location
  WEEKLY_OFF: "WEEKLY_OFF", // date falls on the shift's configured weekly rest day(s)
  ON_LEAVE: "ON_LEAVE", // approved leave record covers this date
};

const ISO_TZ_FMT = `'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM'`;

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const extractTime = (dt) => {
  if (!dt) return null;
  const d = new Date(dt);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const diffMinutes = (start, end) => {
  if (!start || !end) return 0;
  return Math.max(0, Math.floor((new Date(end) - new Date(start)) / 60_000));
};

/**
 * Calculates:
 *   status          — ABSENT | UNSCHEDULED | LATE | EARLY_LEAVE | PRESENT
 *   workMinutes     — total minutes between first IN and last OUT
 *   overtimeMinutes — minutes beyond scheduled shift end (0 if no shift)
 *
 * NOTE: HOLIDAY, WEEKLY_OFF, ON_LEAVE are resolved upstream in processAttendance
 *       before this function is called.
 *
 * No-shift policy:
 *   - No IN punch            → ABSENT,      workMinutes = 0, overtimeMinutes = 0
 *   - IN punch, no shift row → UNSCHEDULED, workMinutes computed, overtimeMinutes = 0
 *   - IN punch + shift row   → normal late / early-leave / present logic
 */
const calculateStatusAndHours = (inTime, outTime, shift) => {
  // ── ABSENT ──────────────────────────────────────────────────────────────────
  if (!inTime) {
    return { status: STATUS.ABSENT, workMinutes: 0, overtimeMinutes: 0 };
  }

  const workMinutes = diffMinutes(inTime, outTime);

  // ── NO SHIFT ASSIGNED ───────────────────────────────────────────────────────
  if (!shift || !shift.START_TIME || !shift.END_TIME) {
    return { status: STATUS.UNSCHEDULED, workMinutes, overtimeMinutes: 0 };
  }

  // ── SHIFT-AWARE LOGIC ───────────────────────────────────────────────────────
  const actualInMinutes = toMinutes(extractTime(inTime));
  const actualOutMinutes = outTime ? toMinutes(extractTime(outTime)) : null;

  const shiftStartMinutes = toMinutes(shift.START_TIME);
  const shiftEndMinutes = toMinutes(shift.END_TIME);
  const graceIn = shift.GRACE_IN_MINUTES ?? 0;
  const graceOut = shift.GRACE_OUT_MINUTES ?? 0;

  // Overnight: explicitly flagged OR end < start (e.g. 22:00–06:00)
  const isOvernightShift =
    shift.OVERNIGHT_FLAG === 1 || shiftEndMinutes < shiftStartMinutes;

  const isLate = actualInMinutes > shiftStartMinutes + graceIn;

  let isEarlyLeave = false;
  let overtimeMinutes = 0;

  if (actualOutMinutes !== null) {
    if (isOvernightShift) {
      if (actualOutMinutes >= shiftStartMinutes) {
        isEarlyLeave = true; // left before crossing midnight
      } else {
        isEarlyLeave = actualOutMinutes < shiftEndMinutes - graceOut;
        overtimeMinutes = Math.max(0, actualOutMinutes - shiftEndMinutes);
      }
    } else {
      isEarlyLeave = actualOutMinutes < shiftEndMinutes - graceOut;
      overtimeMinutes = Math.max(0, actualOutMinutes - shiftEndMinutes);
    }
  }

  // Late takes priority over early leave when both are true (edge case)
  let status = STATUS.PRESENT;
  if (isLate) status = STATUS.LATE;
  else if (isEarlyLeave) status = STATUS.EARLY_LEAVE;

  return { status, workMinutes, overtimeMinutes };
};

// ─────────────────────────────────────────────────────────────────────────────
//  PROCESS ATTENDANCE
//  employeeId is optional — pass it to scope the run to a single employee.
//  When null (default), all employees in the date range are processed.
//  Called by:
//    • Nightly scheduler      → processAttendance(yesterday, yesterday)
//    • triggerProcess (bulk)  → processAttendance(fromDate, toDate)
//    • reprocessAttendance    → processAttendance(fromDate, toDate, employeeId)
// ─────────────────────────────────────────────────────────────────────────────

export const processAttendance = async (
  fromDate,
  toDate,
  employeeId = null,
) => {
  const conn = await getConnection();
  try {
    console.log(
      `[Attendance] Processing ATT_LOG from ${fromDate} to ${toDate}` +
        (employeeId ? ` for employee ${employeeId}` : " (all employees)") +
        "...",
    );

    // ── STEP 1: MERGE raw punches → HR_ATTENDANCE ────────────────────────────
    //
    // SHIFT_ID comes from HR_EMP_SHIFT (effective-dated).
    // MIN(AM_MAC_ID) collapses multiple devices per employee per day
    // to avoid ORA-30926 (unstable row set in MERGE).
    //
    // :EMPLOYEE_ID IS NULL → bulk mode (all employees)
    // :EMPLOYEE_ID = value → single-employee reprocess mode

    await conn.execute(
      `
      MERGE INTO HR_ATTENDANCE target
      USING (
        SELECT
          E.PERSON_ID,
          TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))  AS ATT_DATE,
          MIN(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))    AS FIRST_IN,
          MAX(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))    AS LAST_OUT,
          MIN(ES.SHIFT_ID)                                          AS SHIFT_ID,
          MIN(L.AM_MAC_ID)                                          AS DEVICE_ID
        FROM ATT_LOG L
        JOIN HR_EMPLOYEE E
          ON TO_CHAR(L.AM_EMPNO) = E.EMP_NO
        LEFT JOIN HR_EMP_SHIFT ES
          ON  E.PERSON_ID = ES.EMP_NO
          AND ES.STATUS   = 1
          AND TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))
              BETWEEN NVL(ES.EFFECTIVE_START_DATE, TO_DATE('1900-01-01','YYYY-MM-DD'))
                  AND NVL(ES.EFFECTIVE_END_DATE,   TO_DATE('9999-12-31','YYYY-MM-DD'))
        WHERE TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))
              BETWEEN TO_DATE(:FROM_DATE,'YYYY-MM-DD')
                  AND TO_DATE(:TO_DATE,  'YYYY-MM-DD')
          AND (:EMPLOYEE_ID IS NULL OR E.PERSON_ID = :EMPLOYEE_ID)
        GROUP BY
          E.PERSON_ID,
          TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))
      ) source
      ON (
            target.EMPLOYEE_ID     = source.PERSON_ID
        AND target.ATTENDANCE_DATE = source.ATT_DATE
      )
      WHEN MATCHED THEN
        UPDATE SET
          target.IN_TIME      = source.FIRST_IN,
          target.OUT_TIME     = source.LAST_OUT,
          target.SHIFT_ID     = source.SHIFT_ID,
          target.DEVICE_ID    = source.DEVICE_ID,
          target.UPDATED_DATE = SYSTIMESTAMP,
          target.UPDATED_BY   = 'SCHEDULER'
      WHEN NOT MATCHED THEN
        INSERT (
          EMPLOYEE_ID, ATTENDANCE_DATE, IN_TIME, OUT_TIME,
          SHIFT_ID, DEVICE_ID, STATUS, PAYROLL_FLAG,
          WORK_MINUTES, OVERTIME_MINUTES,
          CREATED_BY, CREATED_DATE
        )
        VALUES (
          source.PERSON_ID, source.ATT_DATE, source.FIRST_IN, source.LAST_OUT,
          source.SHIFT_ID, source.DEVICE_ID, 'PENDING', 'Y',
          0, 0,
          'SCHEDULER', SYSTIMESTAMP
        )
      `,
      { FROM_DATE: fromDate, TO_DATE: toDate, EMPLOYEE_ID: employeeId ?? null },
    );

    // ── STEP 1.5: Seed ABSENT rows for employees with no punch ───────────────
    //
    // For every active employee who has a shift assignment covering the date
    // but zero ATT_LOG records on that date → insert HR_ATTENDANCE with
    // STATUS = 'PENDING' (IN_TIME = NULL). Step 3 will classify as ABSENT.
    // Already-existing rows (from Step 1) are skipped via WHEN NOT MATCHED.

    await conn.execute(
      `
      MERGE INTO HR_ATTENDANCE target
      USING (
        SELECT DISTINCT
          e.PERSON_ID,
          cal.DT       AS ATT_DATE,
          es.SHIFT_ID
        FROM (
          SELECT TO_DATE(:FROM_DATE,'YYYY-MM-DD') + LEVEL - 1 AS DT
            FROM DUAL
          CONNECT BY LEVEL <=
            TO_DATE(:TO_DATE,'YYYY-MM-DD') - TO_DATE(:FROM_DATE,'YYYY-MM-DD') + 1
        ) cal
        JOIN HR_EMP_SHIFT es
          ON cal.DT
             BETWEEN NVL(es.EFFECTIVE_START_DATE, TO_DATE('1900-01-01','YYYY-MM-DD'))
                 AND NVL(es.EFFECTIVE_END_DATE,   TO_DATE('9999-12-31','YYYY-MM-DD'))
         AND es.STATUS = 1
        JOIN HR_EMPLOYEE e ON es.EMP_NO = e.PERSON_ID
        -- Only employees with zero punches on that date
        WHERE NOT EXISTS (
          SELECT 1
            FROM ATT_LOG l
           WHERE TO_CHAR(l.AM_EMPNO) = e.EMP_NO
             AND TRUNC(TO_TIMESTAMP_TZ(l.AM_TIME_IN_OUT, ${ISO_TZ_FMT})) = cal.DT
        )
          AND (:EMPLOYEE_ID IS NULL OR e.PERSON_ID = :EMPLOYEE_ID)
      ) source
      ON (
            target.EMPLOYEE_ID     = source.PERSON_ID
        AND target.ATTENDANCE_DATE = source.ATT_DATE
      )
      WHEN NOT MATCHED THEN
        INSERT (
          EMPLOYEE_ID, ATTENDANCE_DATE, IN_TIME, OUT_TIME,
          SHIFT_ID, STATUS, PAYROLL_FLAG,
          WORK_MINUTES, OVERTIME_MINUTES,
          CREATED_BY, CREATED_DATE
        )
        VALUES (
          source.PERSON_ID, source.ATT_DATE, NULL, NULL,
          source.SHIFT_ID, 'PENDING', 'Y',
          0, 0,
          'SCHEDULER', SYSTIMESTAMP
        )
      `,
      { FROM_DATE: fromDate, TO_DATE: toDate, EMPLOYEE_ID: employeeId ?? null },
    );

    // ── STEP 2: Fetch PENDING rows with all classification data ──────────────
    //
    // IS_HOLIDAY  — 1 if HR_HOLIDAY_CALENDER has an active record for the
    //               employee's LOCATION_ID from HR_EMP_ASSIGNMENT on that date.
    //
    // IS_ON_LEAVE — 1 if an APPROVED HR_LEAVE_REQUEST covers that date.
    //
    // DAY_OF_WEEK — TRIM(UPPER(TO_CHAR(...,'DAY'))) to avoid Oracle padding.
    //               Compared against WEEKLY_HOLIDAY_1/2 stored in HR_SHIFT.

    const pendingResult = await conn.execute(
      `
      SELECT
        att.ATTENDANCE_ID,
        att.EMPLOYEE_ID,
        att.ATTENDANCE_DATE,
        att.IN_TIME,
        att.OUT_TIME,
        -- Shift details (NULL when no shift assigned)
        s.START_TIME,
        s.END_TIME,
        s.GRACE_IN_MINUTES,
        s.GRACE_OUT_MINUTES,
        s.OVERNIGHT_FLAG,
        s.WEEKLY_HOLIDAY_1,
        s.WEEKLY_HOLIDAY_2,
        -- Day-of-week string, trimmed and uppercased to avoid Oracle padding gotcha
        TRIM(UPPER(TO_CHAR(att.ATTENDANCE_DATE, 'DAY'))) AS DAY_OF_WEEK,
        -- Public holiday check via employee's assigned location
        (
          SELECT COUNT(*)
            FROM HR_HOLIDAY_CALENDER hc
            JOIN HR_EMP_ASSIGNMENT   ea
              ON ea.PERSON_ID = att.EMPLOYEE_ID
             AND ea.STATUS    = 1
           WHERE TRUNC(hc.TDATE) = TRUNC(att.ATTENDANCE_DATE)
             AND hc.LOCATION_ID  = ea.LOCATION_ID
             AND hc.STATUS       = 1
        ) AS IS_HOLIDAY,
        -- Approved leave check
        (
          SELECT COUNT(*)
            FROM HR_LEAVE_REQUEST lr
           WHERE lr.EMPLOYEE_ID = att.EMPLOYEE_ID
             AND lr.STATUS      = 'APPROVED'
             AND TRUNC(att.ATTENDANCE_DATE)
                 BETWEEN TRUNC(lr.START_DATE) AND TRUNC(lr.END_DATE)
        ) AS IS_ON_LEAVE
      FROM HR_ATTENDANCE att
      LEFT JOIN HR_SHIFT s ON att.SHIFT_ID = s.SHIFT_ID
      WHERE att.STATUS = 'PENDING'
        AND att.ATTENDANCE_DATE
            BETWEEN TO_DATE(:FROM_DATE,'YYYY-MM-DD')
                AND TO_DATE(:TO_DATE,  'YYYY-MM-DD')
        AND (:EMPLOYEE_ID IS NULL OR att.EMPLOYEE_ID = :EMPLOYEE_ID)
      `,
      { FROM_DATE: fromDate, TO_DATE: toDate, EMPLOYEE_ID: employeeId ?? null },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    // ── STEP 3: Classify each PENDING row (5-step priority) ──────────────────
    //
    //   1. HOLIDAY    — public holiday for employee's location
    //   2. WEEKLY_OFF — date matches shift's weekly rest day(s)
    //   3. ON_LEAVE   — approved leave covers this date
    //   4. ABSENT     — no IN_TIME punch (IN_TIME = NULL)
    //   5. LATE / EARLY_LEAVE / PRESENT — calculated from punch vs shift

    for (const row of pendingResult.rows) {
      let status = null;
      let workMinutes = 0;
      let overtimeMinutes = 0;

      // Priority 1 — Public holiday
      if (row.IS_HOLIDAY > 0) {
        status = STATUS.HOLIDAY;
      }
      // Priority 2 — Weekly off
      else if (
        row.WEEKLY_HOLIDAY_1 &&
        row.DAY_OF_WEEK === row.WEEKLY_HOLIDAY_1.trim().toUpperCase()
      ) {
        status = STATUS.WEEKLY_OFF;
      } else if (
        row.WEEKLY_HOLIDAY_2 &&
        row.DAY_OF_WEEK === row.WEEKLY_HOLIDAY_2.trim().toUpperCase()
      ) {
        status = STATUS.WEEKLY_OFF;
      }
      // Priority 3 — Approved leave
      else if (row.IS_ON_LEAVE > 0) {
        status = STATUS.ON_LEAVE;
      }
      // Priority 4 & 5 — Absent / Late / Early leave / Present
      else {
        ({ status, workMinutes, overtimeMinutes } = calculateStatusAndHours(
          row.IN_TIME,
          row.OUT_TIME,
          row, // contains START_TIME, END_TIME, GRACE_IN_MINUTES, GRACE_OUT_MINUTES, OVERNIGHT_FLAG
        ));
      }

      await conn.execute(
        `
        UPDATE HR_ATTENDANCE
           SET STATUS           = :STATUS,
               WORK_MINUTES     = :WORK_MINUTES,
               OVERTIME_MINUTES = :OVERTIME_MINUTES,
               UPDATED_DATE     = SYSTIMESTAMP,
               UPDATED_BY       = 'SCHEDULER'
         WHERE ATTENDANCE_ID    = :ATTENDANCE_ID
        `,
        {
          STATUS: status,
          WORK_MINUTES: workMinutes,
          OVERTIME_MINUTES: overtimeMinutes,
          ATTENDANCE_ID: row.ATTENDANCE_ID,
        },
      );
    }

    // ── STEP 4: Mark processed ATT_LOG rows ───────────────────────────────────

    await conn.execute(
      `
      UPDATE ATT_LOG
         SET PROCESS_STATUS = 'Y'
       WHERE PROCESS_STATUS = 'N'
         AND TRUNC(TO_TIMESTAMP_TZ(AM_TIME_IN_OUT, ${ISO_TZ_FMT}))
             BETWEEN TO_DATE(:FROM_DATE,'YYYY-MM-DD')
                 AND TO_DATE(:TO_DATE,  'YYYY-MM-DD')
         AND (:EMPLOYEE_ID IS NULL OR TO_CHAR(AM_EMPNO) = TO_CHAR(:EMPLOYEE_ID))
      `,
      { FROM_DATE: fromDate, TO_DATE: toDate, EMPLOYEE_ID: employeeId ?? null },
    );

    await conn.commit();
    console.log(
      `[Attendance] Processing complete for ${fromDate} → ${toDate}` +
        (employeeId ? ` (employee ${employeeId})` : ""),
    );

    return {
      success: true,
      processedDate: `${fromDate} → ${toDate}`,
      updatedRows: pendingResult.rows.length,
    };
  } catch (err) {
    await conn.rollback();
    console.error("[Attendance] Processing failed:", err.message);
    throw err;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ATTENDANCE LIST
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_SORT_COLUMNS = {
  ATTENDANCE_DATE: "att.ATTENDANCE_DATE",
  FIRST_NAME: "e.FIRST_NAME",
};

export const getAttendanceList = async ({
  page = 1,
  limit = 20,
  date = "",
  fromDate = "",
  toDate = "",
  employeeId = "",
  companyId = "",
  orgId = "",
  locationId = "",
  shiftId = "",
  supervisorId = "",
  status = "",
  sortBy = "ATTENDANCE_DATE",
  sortOrder = "DESC",
} = {}) => {
  const conn = await getConnection();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);
  const rownumMin = (pageNum - 1) * limitNum + 1;
  const rownumMax = pageNum * limitNum;

  const orderCol = ALLOWED_SORT_COLUMNS[sortBy] ?? "att.ATTENDANCE_DATE";
  const orderDir = sortOrder === "ASC" ? "ASC" : "DESC";

  const conditions = [];
  const bindParams = {};

  if (date && date.trim()) {
    conditions.push(
      `TRUNC(att.ATTENDANCE_DATE) = TO_DATE(:ATT_DATE, 'YYYY-MM-DD')`,
    );
    bindParams.ATT_DATE = date.trim();
  }

  if (fromDate && toDate && !date) {
    conditions.push(
      `att.ATTENDANCE_DATE BETWEEN TO_DATE(:FROM_DATE,'YYYY-MM-DD') AND TO_DATE(:TO_DATE,'YYYY-MM-DD')`,
    );
    bindParams.FROM_DATE = fromDate;
    bindParams.TO_DATE = toDate;
  }

  if (employeeId && employeeId !== "") {
    conditions.push(`att.EMPLOYEE_ID = :EMPLOYEE_ID`);
    bindParams.EMPLOYEE_ID = parseInt(employeeId, 10);
  }

  if (companyId && companyId !== "") {
    conditions.push(`a.COMPANY_ID = :COMPANY_ID`);
    bindParams.COMPANY_ID = parseInt(companyId, 10);
  }

  if (orgId && orgId !== "") {
    conditions.push(`a.ORG_ID = :ORG_ID`);
    bindParams.ORG_ID = parseInt(orgId, 10);
  }
  if (locationId && locationId !== "") {
    conditions.push(`a.LOCATION_ID = :LOCATION_ID`);
    bindParams.LOCATION_ID = parseInt(locationId, 10);
  }

  if (shiftId && shiftId !== "") {
    conditions.push(`att.SHIFT_ID = :SHIFT_ID`); // HR_ATTENDANCE.SHIFT_ID directly
    bindParams.SHIFT_ID = parseInt(shiftId, 10);
  }
  if (supervisorId && supervisorId !== "") {
    conditions.push(`es.SUPERVISOR_ID = :SUPERVISOR_ID`);
    bindParams.SUPERVISOR_ID = parseInt(supervisorId, 10);
  }

  if (status && status.trim()) {
    conditions.push(`att.STATUS = :STATUS`);
    bindParams.STATUS = status.trim().toUpperCase();
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join("\n      AND ")}` : "";
  const supervisorJoin = supervisorId
    ? `JOIN HR_EMPLOYEE_SUPERVISOR es ON e.PERSON_ID = es.PERSON_ID AND es.STATUS = 1`
    : "";

  try {
    const countResult = await conn.execute(
      `
      SELECT COUNT(*) AS TOTAL
        FROM HR_ATTENDANCE         att
        JOIN HR_EMPLOYEE           e  ON att.EMPLOYEE_ID = e.PERSON_ID
        ${supervisorJoin} 
        LEFT JOIN HR_EMP_ASSIGNMENT a  ON e.PERSON_ID    = a.PERSON_ID AND a.STATUS = 1
        LEFT JOIN HR_COMPANY       c  ON a.COMPANY_ID    = c.COMPANY_ID
        LEFT JOIN HR_SHIFT         s  ON att.SHIFT_ID    = s.SHIFT_ID
        ${whereClause}
      `,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const total = countResult.rows[0].TOTAL;

    const result = await conn.execute(
      `
      SELECT * FROM (
        SELECT ROWNUM AS RN, sq.* FROM (

          SELECT
            att.ATTENDANCE_ID,
            att.EMPLOYEE_ID,
            att.ATTENDANCE_DATE,
            att.IN_TIME,
            att.OUT_TIME,
            att.STATUS,
            att.SHIFT_ID,
            att.DEVICE_ID,
            att.PUNCH_TYPE,
            att.PAYROLL_FLAG,
            att.WORK_MINUTES,
            att.OVERTIME_MINUTES,
            ROUND(att.WORK_MINUTES     / 60, 2) AS WORK_HOURS,
            ROUND(att.OVERTIME_MINUTES / 60, 2) AS OVERTIME_HOURS,
            att.CREATED_DATE,
            att.UPDATED_DATE,
            e.EMP_NO,
            e.TITLE,
            e.FIRST_NAME,
            e.LAST_NAME,
            e.GENDER,
            e.JOIN_DATE,
            s.CODE            AS SHIFT_CODE,
            s.NAME            AS SHIFT_NAME,
            s.START_TIME      AS SHIFT_START,
            s.END_TIME        AS SHIFT_END,
            s.GRACE_IN_MINUTES,
            s.GRACE_OUT_MINUTES,
            c.COMPANY_NAME

          FROM HR_ATTENDANCE         att
          JOIN HR_EMPLOYEE           e  ON att.EMPLOYEE_ID = e.PERSON_ID
          ${supervisorJoin} 
          LEFT JOIN HR_EMP_ASSIGNMENT a  ON e.PERSON_ID    = a.PERSON_ID AND a.STATUS = 1
          LEFT JOIN HR_COMPANY       c  ON a.COMPANY_ID    = c.COMPANY_ID
          LEFT JOIN HR_SHIFT         s  ON att.SHIFT_ID    = s.SHIFT_ID
          ${whereClause}
          ORDER BY ${orderCol} ${orderDir}

        ) sq WHERE ROWNUM <= ${rownumMax}
      ) WHERE RN >= ${rownumMin}
      `,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return {
      data: result.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ATTENDANCE DETAIL
// ─────────────────────────────────────────────────────────────────────────────

export const getAttendanceDetail = async (employeeId, date) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `
      SELECT
        L.AM_EMPNO,
        L.AM_TIME_IN_OUT,
        L.AM_TYPE_IN_OUT,
        L.AM_MAC_ID,
        L.PROCESS_STATUS,
        L.CREATION_DATE,
        L.AM_LAT_IN_OUT,
        L.AM_LON_IN_OUT,
        L.LOCATION_ID,
        L.TEAM_LEAD_ID,
        loc.LOCATION_NAME,
        CASE L.AM_TYPE_IN_OUT
          WHEN 1 THEN 'IN'
          WHEN 2 THEN 'OUT'
          ELSE 'UNKNOWN'
        END AS PUNCH_LABEL
      FROM ATT_LOG      L
      JOIN HR_EMPLOYEE  E   ON TO_CHAR(L.AM_EMPNO) = E.EMP_NO
      LEFT JOIN HR_LOCATION loc ON L.LOCATION_ID = loc.ID
      WHERE E.EMP_NO = :EMP_NO
        AND TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))
            = TO_DATE(:ATT_DATE, 'YYYY-MM-DD')
      ORDER BY TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}) ASC
      `,
      {
        EMP_NO: String(employeeId),
        ATT_DATE: date,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET EXPORT DATA
// ─────────────────────────────────────────────────────────────────────────────

export const getAttendanceForExport = async (filters = {}) => {
  const {
    date = "",
    fromDate = "",
    toDate = "",
    employeeId = "",
    companyId = "",
    orgId = "",
    status = "",
    supervisorId = "", // ← ADD
  } = filters;

  const conn = await getConnection();

  const conditions = [];
  const bindParams = {};

  if (date && date.trim()) {
    conditions.push(
      `TRUNC(att.ATTENDANCE_DATE) = TO_DATE(:ATT_DATE, 'YYYY-MM-DD')`,
    );
    bindParams.ATT_DATE = date.trim();
  }

  if (fromDate && toDate && !date) {
    conditions.push(
      `att.ATTENDANCE_DATE BETWEEN TO_DATE(:FROM_DATE,'YYYY-MM-DD') AND TO_DATE(:TO_DATE,'YYYY-MM-DD')`,
    );
    bindParams.FROM_DATE = fromDate;
    bindParams.TO_DATE = toDate;
  }

  if (employeeId && employeeId !== "") {
    conditions.push(`att.EMPLOYEE_ID = :EMPLOYEE_ID`);
    bindParams.EMPLOYEE_ID = parseInt(employeeId, 10);
  }

  if (companyId && companyId !== "") {
    conditions.push(`a.COMPANY_ID = :COMPANY_ID`);
    bindParams.COMPANY_ID = parseInt(companyId, 10);
  }

  if (orgId && orgId !== "") {
    conditions.push(`a.ORG_ID = :ORG_ID`);
    bindParams.ORG_ID = parseInt(orgId, 10);
  }

  if (status && status.trim()) {
    conditions.push(`att.STATUS = :STATUS`);
    bindParams.STATUS = status.trim().toUpperCase();
  }

  // ── Supervisor filter ──────────────────────────────────────────────────────
  const supervisorJoin = supervisorId
    ? `JOIN HR_EMPLOYEE_SUPERVISOR es ON e.PERSON_ID = es.PERSON_ID AND es.STATUS = 1`
    : "";

  if (supervisorId && supervisorId !== "") {
    conditions.push(`es.SUPERVISOR_ID = :SUPERVISOR_ID`);
    bindParams.SUPERVISOR_ID = parseInt(supervisorId, 10);
  }
  // ──────────────────────────────────────────────────────────────────────────

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join("\n      AND ")}` : "";

  try {
    const result = await conn.execute(
      `
      SELECT
        att.ATTENDANCE_ID,
        att.ATTENDANCE_DATE,
        att.IN_TIME,
        att.OUT_TIME,
        att.STATUS,
        att.PAYROLL_FLAG,
        att.WORK_MINUTES,
        att.OVERTIME_MINUTES,
        ROUND(att.WORK_MINUTES     / 60, 2) AS WORK_HOURS,
        ROUND(att.OVERTIME_MINUTES / 60, 2) AS OVERTIME_HOURS,
        e.EMP_NO,
        e.TITLE,
        e.FIRST_NAME,
        e.LAST_NAME,
        s.NAME        AS SHIFT_NAME,
        s.START_TIME  AS SHIFT_START,
        s.END_TIME    AS SHIFT_END,
        c.COMPANY_NAME
      FROM HR_ATTENDANCE         att
      JOIN HR_EMPLOYEE           e  ON att.EMPLOYEE_ID = e.PERSON_ID
      ${supervisorJoin}
      LEFT JOIN HR_EMP_ASSIGNMENT a  ON e.PERSON_ID    = a.PERSON_ID AND a.STATUS = 1
      LEFT JOIN HR_COMPANY       c  ON a.COMPANY_ID    = c.COMPANY_ID
      LEFT JOIN HR_SHIFT         s  ON att.SHIFT_ID    = s.SHIFT_ID
      ${whereClause}
      ORDER BY att.ATTENDANCE_DATE DESC, e.FIRST_NAME ASC
      `,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ATTENDANCE SUMMARY STATS
// ─────────────────────────────────────────────────────────────────────────────

export const getAttendanceSummary = async ({
  date = "",
  fromDate = "",
  toDate = "",
  employeeId = "",
  companyId = "",
  orgId = "",
  status = "",
  supervisorId = "",
} = {}) => {
  const conn = await getConnection();
  try {
    const conditions = [];
    const bindParams = {};

    if (date && date.trim()) {
      conditions.push(
        `TRUNC(att.ATTENDANCE_DATE) = TO_DATE(:ATT_DATE, 'YYYY-MM-DD')`,
      );
      bindParams.ATT_DATE = date.trim();
    } else if (fromDate && toDate) {
      conditions.push(
        `att.ATTENDANCE_DATE BETWEEN TO_DATE(:FROM_DATE,'YYYY-MM-DD') AND TO_DATE(:TO_DATE,'YYYY-MM-DD')`,
      );
      bindParams.FROM_DATE = fromDate;
      bindParams.TO_DATE = toDate;
    }

    if (employeeId && employeeId !== "") {
      conditions.push(`att.EMPLOYEE_ID = :EMPLOYEE_ID`);
      bindParams.EMPLOYEE_ID = parseInt(employeeId, 10);
    }

    if (companyId && companyId !== "") {
      conditions.push(`a.COMPANY_ID = :COMPANY_ID`);
      bindParams.COMPANY_ID = parseInt(companyId, 10);
    }

    if (orgId && orgId !== "") {
      conditions.push(`a.ORG_ID = :ORG_ID`);
      bindParams.ORG_ID = parseInt(orgId, 10);
    }

    if (status && status.trim()) {
      conditions.push(`att.STATUS = :STATUS`);
      bindParams.STATUS = status.trim().toUpperCase();
    }

    // ── Supervisor filter ──────────────────────────────────────────────────
    const supervisorJoin = supervisorId
      ? `JOIN HR_EMPLOYEE_SUPERVISOR es ON e.PERSON_ID = es.PERSON_ID AND es.STATUS = 1`
      : "";

    if (supervisorId && supervisorId !== "") {
      conditions.push(`es.SUPERVISOR_ID = :SUPERVISOR_ID`);
      bindParams.SUPERVISOR_ID = parseInt(supervisorId, 10);
    }
    // ──────────────────────────────────────────────────────────────────────

    // companyId / orgId filters need the assignment join
    const assignmentJoin =
      companyId || orgId
        ? `LEFT JOIN HR_EMP_ASSIGNMENT a ON e.PERSON_ID = a.PERSON_ID AND a.STATUS = 1
           LEFT JOIN HR_COMPANY        c ON a.COMPANY_ID = c.COMPANY_ID`
        : "";

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join("\n        AND ")}` : "";

    const result = await conn.execute(
      `
      SELECT
        COUNT(*)                                                          AS TOTAL,
        SUM(CASE WHEN att.STATUS = 'PRESENT'     THEN 1 ELSE 0 END)    AS PRESENT,
        SUM(CASE WHEN att.STATUS = 'LATE'        THEN 1 ELSE 0 END)    AS LATE,
        SUM(CASE WHEN att.STATUS = 'EARLY_LEAVE' THEN 1 ELSE 0 END)    AS EARLY_LEAVE,
        SUM(CASE WHEN att.STATUS = 'ABSENT'      THEN 1 ELSE 0 END)    AS ABSENT,
        SUM(CASE WHEN att.STATUS = 'UNSCHEDULED' THEN 1 ELSE 0 END)    AS UNSCHEDULED,
        SUM(CASE WHEN att.STATUS = 'HOLIDAY'     THEN 1 ELSE 0 END)    AS HOLIDAY,
        SUM(CASE WHEN att.STATUS = 'WEEKLY_OFF'  THEN 1 ELSE 0 END)    AS WEEKLY_OFF,
        SUM(CASE WHEN att.STATUS = 'ON_LEAVE'    THEN 1 ELSE 0 END)    AS ON_LEAVE,
        ROUND(SUM(NVL(att.WORK_MINUTES,     0)) / 60, 2)               AS TOTAL_WORK_HOURS,
        ROUND(SUM(NVL(att.OVERTIME_MINUTES, 0)) / 60, 2)               AS TOTAL_OVERTIME_HOURS
      FROM HR_ATTENDANCE att
      JOIN HR_EMPLOYEE   e  ON att.EMPLOYEE_ID = e.PERSON_ID
      ${supervisorJoin}
      ${assignmentJoin}
      ${whereClause}
      `,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return result.rows[0];
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  REPROCESS ATTENDANCE FOR EMPLOYEE
//  Call after assigning / changing a shift so past rows get reclassified with
//  the correct shift, holiday, leave, status, work hours and overtime.
//
//  POST /api/attendance/reprocess/employee
//  Body : { employeeId, fromDate, toDate }
//  Roles: Admin, HR only
//
//  Fix notes:
//  1. conn is closed BEFORE calling processAttendance — avoids orphaned
//     rollback calls if processAttendance throws.
//  2. processAttendance is called with employeeId so only that employee's
//     PENDING rows are picked up — no bleed into other employees.
//  3. SHIFT_ID subquery uses ORDER BY EFFECTIVE_START_DATE DESC so the
//     most recently effective shift wins instead of a random ROWNUM = 1 pick.
// ─────────────────────────────────────────────────────────────────────────────

export const reprocessAttendanceForEmployee = async (
  employeeId,
  fromDate,
  toDate,
) => {
  // ── Phase 1: Reset existing rows to PENDING ──────────────────────────────
  // Scoped strictly to this employee. Connection is opened and closed here
  // independently of processAttendance, which manages its own connection.

  const conn = await getConnection();
  try {
    await conn.execute(
      `
      UPDATE HR_ATTENDANCE att
         SET att.STATUS     = 'PENDING',
             att.SHIFT_ID   = (
               SELECT ES.SHIFT_ID
                 FROM HR_EMP_SHIFT ES
                WHERE ES.EMP_NO = att.EMPLOYEE_ID
                  AND ES.STATUS = 1
                  AND att.ATTENDANCE_DATE
                      BETWEEN NVL(ES.EFFECTIVE_START_DATE, TO_DATE('1900-01-01','YYYY-MM-DD'))
                          AND NVL(ES.EFFECTIVE_END_DATE,   TO_DATE('9999-12-31','YYYY-MM-DD'))
                ORDER BY ES.EFFECTIVE_START_DATE DESC
                FETCH FIRST 1 ROW ONLY
             ),
             att.UPDATED_BY   = 'REPROCESS',
             att.UPDATED_DATE = SYSTIMESTAMP
       WHERE att.EMPLOYEE_ID  = :EMPLOYEE_ID
         AND att.ATTENDANCE_DATE
             BETWEEN TO_DATE(:FROM_DATE,'YYYY-MM-DD')
                 AND TO_DATE(:TO_DATE,  'YYYY-MM-DD')
      `,
      { EMPLOYEE_ID: employeeId, FROM_DATE: fromDate, TO_DATE: toDate },
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    // Close before calling processAttendance so there is no orphaned
    // connection and no risk of calling rollback on an already-closed conn.
    await conn.close();
  }

  // ── Phase 2: Re-run the full 5-step processor scoped to this employee ────
  // processAttendance opens its own connection internally.
  return await processAttendance(fromDate, toDate, employeeId);
};

// ─────────────────────────────────────────────────────────────────────────────
//  SUPERVISOR — TEAM ATTENDANCE LIST
//  Returns paginated attendance records for direct reports of a supervisor.
//  Same shape as getAttendanceList — just scoped to the supervisor's team
//  via HR_EMPLOYEE_SUPERVISOR.
//
//  GET /api/attendance/team/:supervisorId
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_SORT_COLUMNS_TEAM = {
  ATTENDANCE_DATE: "att.ATTENDANCE_DATE",
  FIRST_NAME: "e.FIRST_NAME",
};

export const getSupervisorTeamAttendance = async (
  supervisorId,
  {
    page = 1,
    limit = 20,
    date = "",
    fromDate = "",
    toDate = "",
    status = "",
    sortBy = "ATTENDANCE_DATE",
    sortOrder = "DESC",
  } = {},
) => {
  const conn = await getConnection();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);
  const rownumMin = (pageNum - 1) * limitNum + 1;
  const rownumMax = pageNum * limitNum;

  const orderCol = ALLOWED_SORT_COLUMNS_TEAM[sortBy] ?? "att.ATTENDANCE_DATE";
  const orderDir = sortOrder === "ASC" ? "ASC" : "DESC";

  const conditions = [
    `es.SUPERVISOR_ID = :SUPERVISOR_ID`,
    `es.STATUS        = 1`,
  ];
  const bindParams = { SUPERVISOR_ID: parseInt(supervisorId, 10) };

  if (date && date.trim()) {
    conditions.push(
      `TRUNC(att.ATTENDANCE_DATE) = TO_DATE(:ATT_DATE,'YYYY-MM-DD')`,
    );
    bindParams.ATT_DATE = date.trim();
  } else if (fromDate && toDate) {
    conditions.push(
      `att.ATTENDANCE_DATE BETWEEN TO_DATE(:FROM_DATE,'YYYY-MM-DD') AND TO_DATE(:TO_DATE,'YYYY-MM-DD')`,
    );
    bindParams.FROM_DATE = fromDate;
    bindParams.TO_DATE = toDate;
  }

  if (status && status.trim()) {
    conditions.push(`att.STATUS = :STATUS`);
    bindParams.STATUS = status.trim().toUpperCase();
  }

  const whereClause = `WHERE ${conditions.join("\n      AND ")}`;

  try {
    const countResult = await conn.execute(
      `
      SELECT COUNT(*) AS TOTAL
        FROM HR_ATTENDANCE              att
        JOIN HR_EMPLOYEE                e   ON att.EMPLOYEE_ID  = e.PERSON_ID
        JOIN HR_EMPLOYEE_SUPERVISOR     es  ON e.PERSON_ID      = es.PERSON_ID
        LEFT JOIN HR_EMP_ASSIGNMENT     a   ON e.PERSON_ID      = a.PERSON_ID AND a.STATUS = 1
        LEFT JOIN HR_COMPANY            c   ON a.COMPANY_ID     = c.COMPANY_ID
        LEFT JOIN HR_SHIFT              s   ON att.SHIFT_ID     = s.SHIFT_ID
        ${whereClause}
      `,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const total = countResult.rows[0].TOTAL;

    const result = await conn.execute(
      `
      SELECT * FROM (
        SELECT ROWNUM AS RN, sq.* FROM (

          SELECT
            att.ATTENDANCE_ID,
            att.EMPLOYEE_ID,
            att.ATTENDANCE_DATE,
            att.IN_TIME,
            att.OUT_TIME,
            att.STATUS,
            att.SHIFT_ID,
            att.DEVICE_ID,
            att.PAYROLL_FLAG,
            att.WORK_MINUTES,
            att.OVERTIME_MINUTES,
            ROUND(att.WORK_MINUTES     / 60, 2) AS WORK_HOURS,
            ROUND(att.OVERTIME_MINUTES / 60, 2) AS OVERTIME_HOURS,
            att.CREATED_DATE,
            att.UPDATED_DATE,
            e.EMP_NO,
            e.TITLE,
            e.FIRST_NAME,
            e.LAST_NAME,
            e.GENDER,
            e.JOIN_DATE,
            s.CODE       AS SHIFT_CODE,
            s.NAME       AS SHIFT_NAME,
            s.START_TIME AS SHIFT_START,
            s.END_TIME   AS SHIFT_END,
            s.GRACE_IN_MINUTES,
            s.GRACE_OUT_MINUTES,
            c.COMPANY_NAME

          FROM HR_ATTENDANCE              att
          JOIN HR_EMPLOYEE                e   ON att.EMPLOYEE_ID  = e.PERSON_ID
          JOIN HR_EMPLOYEE_SUPERVISOR     es  ON e.PERSON_ID      = es.PERSON_ID
          LEFT JOIN HR_EMP_ASSIGNMENT     a   ON e.PERSON_ID      = a.PERSON_ID AND a.STATUS = 1
          LEFT JOIN HR_COMPANY            c   ON a.COMPANY_ID     = c.COMPANY_ID
          LEFT JOIN HR_SHIFT              s   ON att.SHIFT_ID     = s.SHIFT_ID
          ${whereClause}
          ORDER BY ${orderCol} ${orderDir}

        ) sq WHERE ROWNUM <= ${rownumMax}
      ) WHERE RN >= ${rownumMin}
      `,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return {
      data: result.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SUPERVISOR — TEAM ATTENDANCE STATS
//  Quick count aggregation for dashboard widgets.
//  Returns: present, late, absent, early leave, on leave, holiday, weekly off
//  for the supervisor's direct reports on a given date / date range.
//
//  GET /api/attendance/team/:supervisorId/stats
// ─────────────────────────────────────────────────────────────────────────────

export const getTeamAttendanceStats = async (
  supervisorId,
  { date = "", fromDate = "", toDate = "" } = {},
) => {
  const conn = await getConnection();

  const conditions = [
    `es.SUPERVISOR_ID = :SUPERVISOR_ID`,
    `es.STATUS        = 1`,
  ];
  const bindParams = { SUPERVISOR_ID: parseInt(supervisorId, 10) };

  if (date && date.trim()) {
    conditions.push(
      `TRUNC(att.ATTENDANCE_DATE) = TO_DATE(:ATT_DATE,'YYYY-MM-DD')`,
    );
    bindParams.ATT_DATE = date.trim();
  } else if (fromDate && toDate) {
    conditions.push(
      `att.ATTENDANCE_DATE BETWEEN TO_DATE(:FROM_DATE,'YYYY-MM-DD') AND TO_DATE(:TO_DATE,'YYYY-MM-DD')`,
    );
    bindParams.FROM_DATE = fromDate;
    bindParams.TO_DATE = toDate;
  }

  const whereClause = `WHERE ${conditions.join("\n      AND ")}`;

  try {
    const result = await conn.execute(
      `
      SELECT
        COUNT(*)                                                         AS TOTAL,
        SUM(CASE WHEN att.STATUS = 'PRESENT'     THEN 1 ELSE 0 END)   AS PRESENT,
        SUM(CASE WHEN att.STATUS = 'LATE'        THEN 1 ELSE 0 END)   AS LATE,
        SUM(CASE WHEN att.STATUS = 'EARLY_LEAVE' THEN 1 ELSE 0 END)   AS EARLY_LEAVE,
        SUM(CASE WHEN att.STATUS = 'ABSENT'      THEN 1 ELSE 0 END)   AS ABSENT,
        SUM(CASE WHEN att.STATUS = 'ON_LEAVE'    THEN 1 ELSE 0 END)   AS ON_LEAVE,
        SUM(CASE WHEN att.STATUS = 'HOLIDAY'     THEN 1 ELSE 0 END)   AS HOLIDAY,
        SUM(CASE WHEN att.STATUS = 'WEEKLY_OFF'  THEN 1 ELSE 0 END)   AS WEEKLY_OFF,
        SUM(CASE WHEN att.STATUS = 'UNSCHEDULED' THEN 1 ELSE 0 END)   AS UNSCHEDULED,
        ROUND(SUM(NVL(att.WORK_MINUTES,     0)) / 60, 2)              AS TOTAL_WORK_HOURS,
        ROUND(SUM(NVL(att.OVERTIME_MINUTES, 0)) / 60, 2)              AS TOTAL_OVERTIME_HOURS
      FROM HR_ATTENDANCE          att
      JOIN HR_EMPLOYEE            e   ON att.EMPLOYEE_ID = e.PERSON_ID
      JOIN HR_EMPLOYEE_SUPERVISOR es  ON e.PERSON_ID     = es.PERSON_ID
      ${whereClause}
      `,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return result.rows[0];
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ESS — MY ATTENDANCE LIST
//  Employee's own paginated attendance history.
//  Hard-filtered by employeeId — no cross-employee data possible.
//
//  GET /api/attendance/my/:employeeId
// ─────────────────────────────────────────────────────────────────────────────

export const getMyAttendanceList = async (
  employeeId,
  {
    page = 1,
    limit = 20,
    date = "",
    fromDate = "",
    toDate = "",
    status = "",
    sortBy = "ATTENDANCE_DATE",
    sortOrder = "DESC",
  } = {},
) => {
  const conn = await getConnection();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);
  const rownumMin = (pageNum - 1) * limitNum + 1;
  const rownumMax = pageNum * limitNum;

  const orderCol = ALLOWED_SORT_COLUMNS[sortBy] ?? "att.ATTENDANCE_DATE";
  const orderDir = sortOrder === "ASC" ? "ASC" : "DESC";

  const conditions = [`att.EMPLOYEE_ID = :EMPLOYEE_ID`];
  const bindParams = { EMPLOYEE_ID: parseInt(employeeId, 10) };

  if (date && date.trim()) {
    conditions.push(
      `TRUNC(att.ATTENDANCE_DATE) = TO_DATE(:ATT_DATE,'YYYY-MM-DD')`,
    );
    bindParams.ATT_DATE = date.trim();
  } else if (fromDate && toDate) {
    conditions.push(
      `att.ATTENDANCE_DATE BETWEEN TO_DATE(:FROM_DATE,'YYYY-MM-DD') AND TO_DATE(:TO_DATE,'YYYY-MM-DD')`,
    );
    bindParams.FROM_DATE = fromDate;
    bindParams.TO_DATE = toDate;
  }

  if (status && status.trim()) {
    conditions.push(`att.STATUS = :STATUS`);
    bindParams.STATUS = status.trim().toUpperCase();
  }

  const whereClause = `WHERE ${conditions.join("\n      AND ")}`;

  try {
    const countResult = await conn.execute(
      `
      SELECT COUNT(*) AS TOTAL
        FROM HR_ATTENDANCE         att
        JOIN HR_EMPLOYEE           e  ON att.EMPLOYEE_ID = e.PERSON_ID
        LEFT JOIN HR_EMP_ASSIGNMENT a  ON e.PERSON_ID    = a.PERSON_ID AND a.STATUS = 1
        LEFT JOIN HR_COMPANY       c  ON a.COMPANY_ID    = c.COMPANY_ID
        LEFT JOIN HR_SHIFT         s  ON att.SHIFT_ID    = s.SHIFT_ID
        ${whereClause}
      `,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const total = countResult.rows[0].TOTAL;

    const result = await conn.execute(
      `
      SELECT * FROM (
        SELECT ROWNUM AS RN, sq.* FROM (

          SELECT
            att.ATTENDANCE_ID,
            att.ATTENDANCE_DATE,
            att.IN_TIME,
            att.OUT_TIME,
            att.STATUS,
            att.SHIFT_ID,
            att.DEVICE_ID,
            att.PAYROLL_FLAG,
            att.WORK_MINUTES,
            att.OVERTIME_MINUTES,
            ROUND(att.WORK_MINUTES     / 60, 2) AS WORK_HOURS,
            ROUND(att.OVERTIME_MINUTES / 60, 2) AS OVERTIME_HOURS,
            att.CREATED_DATE,
            att.UPDATED_DATE,
            e.EMP_NO,
            e.TITLE,
            e.FIRST_NAME,
            e.LAST_NAME,
            s.CODE       AS SHIFT_CODE,
            s.NAME       AS SHIFT_NAME,
            s.START_TIME AS SHIFT_START,
            s.END_TIME   AS SHIFT_END,
            c.COMPANY_NAME

          FROM HR_ATTENDANCE         att
          JOIN HR_EMPLOYEE           e  ON att.EMPLOYEE_ID = e.PERSON_ID
          LEFT JOIN HR_EMP_ASSIGNMENT a  ON e.PERSON_ID    = a.PERSON_ID AND a.STATUS = 1
          LEFT JOIN HR_COMPANY       c  ON a.COMPANY_ID    = c.COMPANY_ID
          LEFT JOIN HR_SHIFT         s  ON att.SHIFT_ID    = s.SHIFT_ID
          ${whereClause}
          ORDER BY ${orderCol} ${orderDir}

        ) sq WHERE ROWNUM <= ${rownumMax}
      ) WHERE RN >= ${rownumMin}
      `,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return {
      data: result.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ESS — MY ATTENDANCE SUMMARY
//  Aggregated attendance totals for a single employee.
//  Defaults to current calendar month if no date range is provided.
//  Used for the ESS dashboard widget and mobile app home screen.
//
//  GET /api/attendance/my/:employeeId/summary
// ─────────────────────────────────────────────────────────────────────────────

export const getMyAttendanceSummary = async (
  employeeId,
  { fromDate = "", toDate = "" } = {},
) => {
  const conn = await getConnection();

  // Default to current month if no range supplied
  const from = fromDate || format(startOfMonth(new Date()), "yyyy-MM-dd");
  const to = toDate || format(endOfMonth(new Date()), "yyyy-MM-dd");

  try {
    const result = await conn.execute(
      `
      SELECT
        COUNT(*)                                                         AS TOTAL_DAYS,
        SUM(CASE WHEN att.STATUS = 'PRESENT'     THEN 1 ELSE 0 END)   AS PRESENT,
        SUM(CASE WHEN att.STATUS = 'LATE'        THEN 1 ELSE 0 END)   AS LATE,
        SUM(CASE WHEN att.STATUS = 'EARLY_LEAVE' THEN 1 ELSE 0 END)   AS EARLY_LEAVE,
        SUM(CASE WHEN att.STATUS = 'ABSENT'      THEN 1 ELSE 0 END)   AS ABSENT,
        SUM(CASE WHEN att.STATUS = 'ON_LEAVE'    THEN 1 ELSE 0 END)   AS ON_LEAVE,
        SUM(CASE WHEN att.STATUS = 'HOLIDAY'     THEN 1 ELSE 0 END)   AS HOLIDAY,
        SUM(CASE WHEN att.STATUS = 'WEEKLY_OFF'  THEN 1 ELSE 0 END)   AS WEEKLY_OFF,
        -- Working days = days the employee was actually expected to work
        SUM(CASE WHEN att.STATUS NOT IN ('HOLIDAY','WEEKLY_OFF')
                 THEN 1 ELSE 0 END)                                    AS WORKING_DAYS,
        -- Attended = present + late + early leave (physically came in)
        SUM(CASE WHEN att.STATUS IN ('PRESENT','LATE','EARLY_LEAVE')
                 THEN 1 ELSE 0 END)                                    AS ATTENDED_DAYS,
        ROUND(SUM(NVL(att.WORK_MINUTES,     0)) / 60, 2)              AS TOTAL_WORK_HOURS,
        ROUND(SUM(NVL(att.OVERTIME_MINUTES, 0)) / 60, 2)              AS TOTAL_OVERTIME_HOURS,
        -- Average work hours on days the employee came in
        ROUND(
          CASE
            WHEN SUM(CASE WHEN att.IN_TIME IS NOT NULL THEN 1 ELSE 0 END) = 0 THEN 0
            ELSE SUM(NVL(att.WORK_MINUTES, 0)) /
                 SUM(CASE WHEN att.IN_TIME IS NOT NULL THEN 1 ELSE 0 END) / 60
          END, 2
        )                                                              AS AVG_WORK_HOURS_PER_DAY
      FROM HR_ATTENDANCE att
      WHERE att.EMPLOYEE_ID    = :EMPLOYEE_ID
        AND att.ATTENDANCE_DATE
            BETWEEN TO_DATE(:FROM_DATE,'YYYY-MM-DD')
                AND TO_DATE(:TO_DATE,  'YYYY-MM-DD')
      `,
      {
        EMPLOYEE_ID: parseInt(employeeId, 10),
        FROM_DATE: from,
        TO_DATE: to,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return {
      period: { from, to },
      ...result.rows[0],
    };
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MANUAL ATTENDANCE EDIT  (Admin & HR only — ATT_CORRECTION_APPROVE)
//  Direct privileged edit of HR_ATTENDANCE IN_TIME / OUT_TIME.
//  No approval flow — this is a restricted direct write.
//  Every edit is logged to HR_AUDIT_LOG with OPERATION = 'MAN_EDIT'.
//  The connection is closed BEFORE calling reprocessAttendanceForEmployee
//  because reprocess opens its own connection internally.
// ─────────────────────────────────────────────────────────────────────────────

export const manualAttendanceEdit = async (
  attendanceId,
  inTime,
  outTime,
  editorUsername,
) => {
  const conn = await getConnection();

  let oldRow = null; // captured in step 2, used after conn.close() for reprocess call

  try {
    // ── STEP 2: Fetch the existing row ───────────────────────────────────────
    const selectResult = await conn.execute(
      `
      SELECT
        ATTENDANCE_ID,
        EMPLOYEE_ID,
        ATTENDANCE_DATE,
        IN_TIME,
        OUT_TIME,
        STATUS
      FROM HR_ATTENDANCE
      WHERE ATTENDANCE_ID = :ATTENDANCE_ID
      `,
      { ATTENDANCE_ID: attendanceId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    if (!selectResult.rows || selectResult.rows.length === 0) {
      throw new Error("Attendance record not found");
    }

    oldRow = selectResult.rows[0];
    // ── STEP 2.5: Normalize inTime / outTime for Oracle binding ─────────────────
    // Oracle's oracledb driver maps JS Date → TIMESTAMP(6) WITH TIME ZONE natively.
    // Raw ISO strings go through NLS parsing and fail with ORA-01843.
    // date-fns/parseISO handles the ISO string safely; null passthrough = no-punch.

    const inTimeVal = inTime ? parseISO(inTime) : null;
    const outTimeVal = outTime ? parseISO(outTime) : null;

    // ── STEP 3: Insert audit log row ─────────────────────────────────────────
    // AUDIT_ID: no sequence or BEFORE-INSERT trigger exists for HR_AUDIT_LOG
    //           in the schema, so we derive the next value with MAX+1.
    // CHANGED_ON: has DEFAULT SYSTIMESTAMP on the column — omitted from INSERT.
    await conn.execute(
      `
      INSERT INTO HR_AUDIT_LOG (
        AUDIT_ID,
        TABLE_NAME,
        OPERATION,
        CHANGED_BY,
        KEY_VALUES,
        OLD_VALUES,
        NEW_VALUES
      ) VALUES (
        (SELECT NVL(MAX(AUDIT_ID), 0) + 1 FROM HR_AUDIT_LOG),
        'HR_ATTENDANCE',
        'MAN_EDIT',
        :CHANGED_BY,
        :KEY_VALUES,
        :OLD_VALUES,
        :NEW_VALUES
      )
      `,
      {
        CHANGED_BY: editorUsername,
        KEY_VALUES: `ATTENDANCE_ID=${attendanceId}`,
        OLD_VALUES: JSON.stringify({
          ATTENDANCE_ID: oldRow.ATTENDANCE_ID,
          IN_TIME: oldRow.IN_TIME,
          OUT_TIME: oldRow.OUT_TIME,
          STATUS: oldRow.STATUS,
        }),
        NEW_VALUES: JSON.stringify({
          IN_TIME: inTime ?? null,
          OUT_TIME: outTime ?? null,
          STATUS: "PENDING",
        }),
      },
    );

    // ── STEP 4: Update HR_ATTENDANCE ─────────────────────────────────────────
    // STATUS is reset to PENDING so reprocessAttendanceForEmployee picks it up.
    // Passing null for IN_TIME / OUT_TIME is valid — marks the record as no-punch
    // which reprocess will classify as ABSENT.
    await conn.execute(
      `
      UPDATE HR_ATTENDANCE
         SET IN_TIME      = :IN_TIME,
             OUT_TIME     = :OUT_TIME,
             STATUS       = 'PENDING',
             UPDATED_BY   = :UPDATED_BY,
             UPDATED_DATE = SYSTIMESTAMP
       WHERE ATTENDANCE_ID = :ATTENDANCE_ID
      `,
      {
  IN_TIME:       inTimeVal,        
  OUT_TIME:      outTimeVal,       
  UPDATED_BY:    editorUsername,
  ATTENDANCE_ID: attendanceId,
},
    );

    // ── STEP 5: Commit ───────────────────────────────────────────────────────
    await conn.commit();
  } catch (err) {
    // Rollback covers both the audit log insert and the attendance update
    // if either fails before commit.
    await conn.rollback();
    throw err;
  } finally {
    // ── STEP 6: Close connection BEFORE calling reprocess ───────────────────
    // reprocessAttendanceForEmployee opens its own connection internally.
    // Closing here prevents orphaned connections and avoids any risk of
    // calling rollback on an already-committed / closed connection.
    await conn.close();
  }

  // ── STEP 7: Reprocess outside try/catch ─────────────────────────────────
  // The edit is already committed. If reprocess throws, the correction is
  // preserved — the failure is a separate concern and must not roll back the
  // edit that the admin/HR intentionally made.
  const attendanceDate = format(new Date(oldRow.ATTENDANCE_DATE), "yyyy-MM-dd");

  const reprocessResult = await reprocessAttendanceForEmployee(
    oldRow.EMPLOYEE_ID,
    attendanceDate,
    attendanceDate,
  );

  // ── STEP 8: Return ────────────────────────────────────────────────────────
  return {
    success: true,
    attendanceId,
    newStatus: reprocessResult,
  };
};
