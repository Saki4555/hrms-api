// ─────────────────────────────────────────────────────────────────────────────
//  ATTENDANCE SERVICE — TODO
// ─────────────────────────────────────────────────────────────────────────────

// ── 3.1 SETUP ────────────────────────────────────────────────────────────────
// TODO: createShift          — insert into HCM.HR_SHIFT (code, name, start_time, end_time, grace_in, grace_out)
// TODO: updateShift          — update shift details
// TODO: deleteShift          — delete or deactivate shift
// TODO: getAllShifts          — list all shifts (for dropdown + list page)
// TODO: getShiftById         — single shift detail

// TODO: createRotationPlan   — define a named rotation cycle (e.g. Week A/B/C)
// TODO: updateRotationPlan
// TODO: deleteRotationPlan
// TODO: getAllRotationPlans

// TODO: createHolidayCalendar — insert public/company holidays by year
// TODO: updateHoliday
// TODO: deleteHoliday
// TODO: getHolidaysByYear     — list holidays for a given year

// ── 3.2 EMPLOYEE ASSIGNMENT ───────────────────────────────────────────────────
// TODO: assignEmployeeToRotation   — link employee to a rotation plan
// TODO: changeEmployeeRotation     — update existing rotation assignment
// TODO: getEmployeeRotation        — get current rotation for an employee

// TODO: createTeam           — group employees under a supervisor
// TODO: updateTeam
// TODO: deleteTeam
// TODO: getTeamsByLeader     — get teams managed by a supervisor

// ── 3.3 WORK SCHEDULE ────────────────────────────────────────────────────────
// TODO: createWorkSchedule   — create weekly or monthly schedule for a team
// TODO: updateWorkSchedule   — modify existing schedule
// TODO: approveWorkSchedule  — supervisor/HR approval flow (status: DRAFT → APPROVED)
// TODO: getWorkSchedule      — get schedule by team/employee/date range
// TODO: getMyWorkSchedule    — self view — employee sees own schedule (ESS_ATT_VIEW)

// ── 3.4 ATTENDANCE DATA ───────────────────────────────────────────────────────
// TODO: receiveMobileAttendance  — insert AI face detection punches from mobile app
//                                  (used by Supervisor via ATT_REALTIME_AI)
//                                  inserts into ATT_LOG then triggers processAttendance

// TODO: manualAttendanceEdit     — Admin/HR restricted direct edit of HR_ATTENDANCE record
//                                  (ATT_CORRECTION_APPROVE) — logs who edited and when

// TODO: getMyAttendance          — self view for ESS (ESS_ATT_VIEW)
//                                  same as getAttendanceList but hard-filtered by req.user.employee_id

// ── 3.5 ATTENDANCE REPORTS ───────────────────────────────────────────────────
// TODO: getLateReport         — employees who were late in a date range, with minutes late
// TODO: getAbsentReport       — employees with no attendance record for working days
// TODO: getEarlyLeaveReport   — employees who punched out before shift end
// TODO: getAttendanceExceptions — combined: late + absent + early leave in one query
// TODO: getMonthlyAttendanceSummaryPerEmployee — per-employee monthly breakdown
//                                               (present count, late count, absent count, working days)

// ── LEAVE & LATE (Self-Service side of Attendance) ───────────────────────────
// TODO: applyLeave           — employee submits leave request (ESS_LEAVE_APPLY / ATT_LEAVE_APPLY)
// TODO: applyLate            — employee submits late request with reason
// TODO: approveLeave         — supervisor/HR/admin approves or rejects (ATT_LEAVE_APPROVE)
// TODO: approveLate          — approve late request
// TODO: getMyLeaveRequests   — employee sees own leave history and status
// TODO: getTeamLeaveRequests — supervisor sees pending requests from their team
// TODO: getLeaveBalance      — remaining leave days per employee per leave type

// ── ATTENDANCE CORRECTION (Self-Service side) ─────────────────────────────────
// TODO: submitCorrectionRequest  — employee requests correction for wrong/missing punch (ESS_ATT_CORRECT)
// TODO: approveCorrectionRequest — Admin/HR reviews and applies correction (ATT_CORRECTION_APPROVE)
// TODO: getCorrectionRequests    — list pending correction requests (for HR/Admin dashboard)



import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS = {
  PRESENT:     "PRESENT",
  LATE:        "LATE",
  EARLY_LEAVE: "EARLY_LEAVE",
  ABSENT:      "ABSENT",
  // Used when the employee punched in but has no shift assigned.
  // We know they came in but cannot determine late / early leave.
  UNSCHEDULED: "UNSCHEDULED",
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

/**
 * Returns minutes between two Date-like values, floored to zero.
 */
const diffMinutes = (start, end) => {
  if (!start || !end) return 0;
  return Math.max(0, Math.floor((new Date(end) - new Date(start)) / 60_000));
};

/**
 * Calculates:
 *   status        — ABSENT | UNSCHEDULED | LATE | EARLY_LEAVE | PRESENT
 *   workMinutes   — total minutes between first in and last out
 *   overtimeMinutes — minutes beyond the scheduled shift end (0 if no shift)
 *
 * No-shift policy:
 *   - No IN punch              → ABSENT,      workMinutes = 0, overtimeMinutes = 0
 *   - IN punch, no shift row   → UNSCHEDULED, workMinutes computed, overtimeMinutes = 0
 *   - IN punch + shift row     → normal late / early-leave / present logic
 */
const calculateStatusAndHours = (inTime, outTime, shift) => {
  // ── ABSENT ──────────────────────────────────────────────────────────────────
  if (!inTime) {
    return { status: STATUS.ABSENT, workMinutes: 0, overtimeMinutes: 0 };
  }

  // workMinutes uses real Date objects (millisecond diff) so overnight is
  // always calculated correctly regardless of shift type.
  const workMinutes = diffMinutes(inTime, outTime);

  // ── NO SHIFT ASSIGNED ───────────────────────────────────────────────────────
  if (!shift || !shift.START_TIME || !shift.END_TIME) {
    return { status: STATUS.UNSCHEDULED, workMinutes, overtimeMinutes: 0 };
  }

  // ── SHIFT-AWARE LOGIC ───────────────────────────────────────────────────────
  const actualInMinutes  = toMinutes(extractTime(inTime));
  const actualOutMinutes = outTime ? toMinutes(extractTime(outTime)) : null;

  const shiftStartMinutes = toMinutes(shift.START_TIME);
  const shiftEndMinutes   = toMinutes(shift.END_TIME);
  const graceIn           = shift.GRACE_IN_MINUTES  ?? 0;
  const graceOut          = shift.GRACE_OUT_MINUTES ?? 0;

  // Detect overnight shift: either flagged explicitly or end time < start time
  // e.g. START=22:00 (1320 min), END=06:00 (360 min) → 360 < 1320 → overnight
  const isOvernightShift =
    shift.OVERNIGHT_FLAG === 1 || shiftEndMinutes < shiftStartMinutes;

  // ── LATE CHECK (same for both shift types) ───────────────────────────────
  const isLate = actualInMinutes > shiftStartMinutes + graceIn;

  // ── EARLY LEAVE + OVERTIME (differs for overnight) ───────────────────────
  let isEarlyLeave    = false;
  let overtimeMinutes = 0;

  if (actualOutMinutes !== null) {
    if (isOvernightShift) {
      // Out time in the EVENING portion (>= shiftStart, e.g. 23:00 on a 22:00–06:00 shift)
      // means the employee left before crossing midnight → always early leave.
      // e.g. out=23:00 (1380) >= shiftStart=22:00 (1320) → early leave
      if (actualOutMinutes >= shiftStartMinutes) {
        isEarlyLeave = true;
      } else {
        // Out time is in the MORNING portion (< shiftStart, e.g. 05:00 or 07:00)
        // Compare directly against shiftEnd (e.g. 06:00 = 360 min)
        // e.g. out=05:00 (300) < shiftEnd=06:00 (360) → early leave
        // e.g. out=07:00 (420) > shiftEnd=06:00 (360) → overtime
        isEarlyLeave    = actualOutMinutes < shiftEndMinutes - graceOut;
        overtimeMinutes = Math.max(0, actualOutMinutes - shiftEndMinutes);
      }
    } else {
      // ── NORMAL (non-overnight) shift ──────────────────────────────────────
      // e.g. START=08:00 (480), END=17:00 (1020)
      isEarlyLeave    = actualOutMinutes < shiftEndMinutes - graceOut;
      overtimeMinutes = Math.max(0, actualOutMinutes - shiftEndMinutes);
    }
  }

  // Late takes priority over early leave when both are true (edge case)
  let status = STATUS.PRESENT;
  if (isLate)            status = STATUS.LATE;
  else if (isEarlyLeave) status = STATUS.EARLY_LEAVE;

  return { status, workMinutes, overtimeMinutes };
};

// ─────────────────────────────────────────────────────────────────────────────
//  PROCESS ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────
//
// Schema assumption: HR_ATTENDANCE has two extra columns added in your migration:
//   WORK_MINUTES    NUMBER          — total minutes between IN and OUT
//   OVERTIME_MINUTES NUMBER         — minutes beyond scheduled shift end
//
// If you prefer storing hours as decimals (e.g. 8.50) just divide by 60 in the
// UPDATE below — the JS calculation stays the same.

export const processAttendance = async (fromDate, toDate) => {
  const conn = await getConnection();
  try {
    console.log(`[Attendance] Processing ATT_LOG from ${fromDate} to ${toDate}...`);

    // ── STEP 1: MERGE raw punches → HR_ATTENDANCE ────────────────────────────
    //
    // Key change vs old code:
    //   • SHIFT_ID now comes from HR_EMP_SHIFT (effective-dated employee–shift
    //     assignment) instead of HR_EMP_ASSIGNMENT.POSITION_ID.
    //   • If no active shift row exists for that date the SHIFT_ID is NULL —
    //     the status loop below handles it as UNSCHEDULED.

    await conn.execute(
      `
      MERGE INTO HCM.HR_ATTENDANCE target
      USING (
        SELECT
          E.PERSON_ID,
          TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))  AS ATT_DATE,
          MIN(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))    AS FIRST_IN,
          MAX(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))    AS LAST_OUT,
          /*
           * Pick the shift that was active on the attendance date.
           * HR_EMP_SHIFT.STATUS = 1 means the assignment record itself is active.
           * EFFECTIVE_END_DATE can be NULL (open-ended), so we use NVL with a
           * far-future sentinel rather than SYSDATE to stay deterministic for
           * historical reprocessing.
           */
          MIN(ES.SHIFT_ID)                                          AS SHIFT_ID,
          L.AM_MAC_ID                                               AS DEVICE_ID
        FROM HCM.ATT_LOG L
        JOIN HCM.HR_EMPLOYEE E
          ON TO_CHAR(L.AM_EMPNO) = E.EMP_NO        -- AM_EMPNO is NUMBER, EMP_NO is VARCHAR2
        LEFT JOIN HCM.HR_EMP_SHIFT ES
          ON  E.PERSON_ID           = ES.EMP_NO     -- HR_EMP_SHIFT.EMP_NO stores PERSON_ID values
          AND ES.STATUS             = 1
          AND TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))
              BETWEEN NVL(ES.EFFECTIVE_START_DATE, TO_DATE('1900-01-01', 'YYYY-MM-DD'))
                  AND NVL(ES.EFFECTIVE_END_DATE, TO_DATE('9999-12-31', 'YYYY-MM-DD'))
        WHERE TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))
              BETWEEN TO_DATE(:FROM_DATE, 'YYYY-MM-DD')
                  AND TO_DATE(:TO_DATE,   'YYYY-MM-DD')
        GROUP BY
          E.PERSON_ID,
          TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT})),
          L.AM_MAC_ID
      ) source
      ON (
            target.EMPLOYEE_ID     = source.PERSON_ID
        AND target.ATTENDANCE_DATE = source.ATT_DATE
      )
      WHEN MATCHED THEN
        UPDATE SET
          target.IN_TIME       = source.FIRST_IN,
          target.OUT_TIME      = source.LAST_OUT,
          target.SHIFT_ID      = source.SHIFT_ID,   -- may be NULL (unscheduled)
          target.DEVICE_ID     = source.DEVICE_ID,
          target.UPDATED_DATE  = SYSTIMESTAMP,
          target.UPDATED_BY    = 'SCHEDULER'
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
      { FROM_DATE: fromDate, TO_DATE: toDate },
    );

    // ── STEP 2: Compute status, work hours, overtime for PENDING rows ─────────
    //
    // We join HR_SHIFT here (not HR_EMP_SHIFT — we already stored SHIFT_ID on
    // the attendance row in step 1) so the query stays simple.

    const pendingResult = await conn.execute(
      `
      SELECT
        att.ATTENDANCE_ID,
        att.IN_TIME,
        att.OUT_TIME,
        s.START_TIME,
        s.END_TIME,
        s.GRACE_IN_MINUTES,
        s.GRACE_OUT_MINUTES
      FROM HCM.HR_ATTENDANCE att
      LEFT JOIN HCM.HR_SHIFT s ON att.SHIFT_ID = s.SHIFT_ID
      WHERE att.STATUS = 'PENDING'
        AND att.ATTENDANCE_DATE
            BETWEEN TO_DATE(:FROM_DATE, 'YYYY-MM-DD')
                AND TO_DATE(:TO_DATE,   'YYYY-MM-DD')
      `,
      { FROM_DATE: fromDate, TO_DATE: toDate },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    for (const row of pendingResult.rows) {
      const { status, workMinutes, overtimeMinutes } = calculateStatusAndHours(
        row.IN_TIME,
        row.OUT_TIME,
        row, // contains START_TIME, END_TIME, GRACE_IN_MINUTES, GRACE_OUT_MINUTES (null when no shift)
      );

      await conn.execute(
        `
        UPDATE HCM.HR_ATTENDANCE
           SET STATUS           = :STATUS,
               WORK_MINUTES     = :WORK_MINUTES,
               OVERTIME_MINUTES = :OVERTIME_MINUTES,
               UPDATED_DATE     = SYSTIMESTAMP,
               UPDATED_BY       = 'SCHEDULER'
         WHERE ATTENDANCE_ID    = :ATTENDANCE_ID
        `,
        {
          STATUS:           status,
          WORK_MINUTES:     workMinutes,
          OVERTIME_MINUTES: overtimeMinutes,
          ATTENDANCE_ID:    row.ATTENDANCE_ID,
        },
      );
    }

    // ── STEP 3: Mark processed ATT_LOG rows ───────────────────────────────────
    await conn.execute(
      `
      UPDATE HCM.ATT_LOG
         SET PROCESS_STATUS = 'Y'
       WHERE PROCESS_STATUS = 'N'
         AND TRUNC(TO_TIMESTAMP_TZ(AM_TIME_IN_OUT, ${ISO_TZ_FMT}))
             BETWEEN TO_DATE(:FROM_DATE, 'YYYY-MM-DD')
                 AND TO_DATE(:TO_DATE,   'YYYY-MM-DD')
      `,
      { FROM_DATE: fromDate, TO_DATE: toDate },
    );

    await conn.commit();
    console.log(`[Attendance] Processing complete for ${fromDate} → ${toDate}`);

    return {
      success:       true,
      processedDate: `${fromDate} → ${toDate}`,
      updatedRows:   pendingResult.rows.length,
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

// Whitelist: frontend column key → Oracle expression (prevents SQL injection)
const ALLOWED_SORT_COLUMNS = {
  ATTENDANCE_DATE: "att.ATTENDANCE_DATE",
  FIRST_NAME:      "e.FIRST_NAME",
};

export const getAttendanceList = async ({
  page       = 1,
  limit      = 20,
  date       = "",
  fromDate   = "",
  toDate     = "",
  employeeId = "",
  companyId  = "",
  orgId      = "",
  status     = "",
  sortBy     = "ATTENDANCE_DATE",
  sortOrder  = "DESC",
} = {}) => {
  const conn = await getConnection();

  const pageNum   = Math.max(1, parseInt(page,  10) || 1);
  const limitNum  = Math.max(1, parseInt(limit, 10) || 20);
  const rownumMin = (pageNum - 1) * limitNum + 1;
  const rownumMax = pageNum * limitNum;

  // Sort — whitelist to prevent SQL injection
  const orderCol = ALLOWED_SORT_COLUMNS[sortBy] ?? "att.ATTENDANCE_DATE";
  const orderDir = sortOrder === "ASC" ? "ASC" : "DESC";

  const conditions = [];
  const bindParams = {};

  if (date && date.trim()) {
    conditions.push(`TRUNC(att.ATTENDANCE_DATE) = TO_DATE(:ATT_DATE, 'YYYY-MM-DD')`);
    bindParams.ATT_DATE = date.trim();
  }

  if (fromDate && toDate && !date) {
    conditions.push(
      `att.ATTENDANCE_DATE BETWEEN TO_DATE(:FROM_DATE, 'YYYY-MM-DD') AND TO_DATE(:TO_DATE, 'YYYY-MM-DD')`,
    );
    bindParams.FROM_DATE = fromDate;
    bindParams.TO_DATE   = toDate;
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

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join("\n      AND ")}` : "";

  try {
    const countResult = await conn.execute(
      `
      SELECT COUNT(*) AS TOTAL
        FROM HCM.HR_ATTENDANCE         att
        JOIN HCM.HR_EMPLOYEE           e   ON att.EMPLOYEE_ID = e.PERSON_ID
        LEFT JOIN HCM.HR_EMP_ASSIGNMENT a  ON e.PERSON_ID    = a.PERSON_ID AND a.STATUS = 1
        LEFT JOIN HCM.HR_COMPANY       c   ON a.COMPANY_ID   = c.COMPANY_ID
        LEFT JOIN HCM.HR_SHIFT         s   ON att.SHIFT_ID   = s.SHIFT_ID
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
            -- Convenience: decimal hours rounded to 2 dp for display
            ROUND(att.WORK_MINUTES     / 60, 2)  AS WORK_HOURS,
            ROUND(att.OVERTIME_MINUTES / 60, 2)  AS OVERTIME_HOURS,
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

          FROM HCM.HR_ATTENDANCE         att
          JOIN HCM.HR_EMPLOYEE           e   ON att.EMPLOYEE_ID = e.PERSON_ID
          LEFT JOIN HCM.HR_EMP_ASSIGNMENT a  ON e.PERSON_ID    = a.PERSON_ID AND a.STATUS = 1
          LEFT JOIN HCM.HR_COMPANY       c   ON a.COMPANY_ID   = c.COMPANY_ID
          LEFT JOIN HCM.HR_SHIFT         s   ON att.SHIFT_ID   = s.SHIFT_ID
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
        page:       pageNum,
        limit:      limitNum,
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
      FROM HCM.ATT_LOG      L
      JOIN HCM.HR_EMPLOYEE  E   ON TO_CHAR(L.AM_EMPNO) = E.EMP_NO
      LEFT JOIN HCM.HR_LOCATION loc ON L.LOCATION_ID = loc.ID
      WHERE E.EMP_NO = :EMP_NO
        AND TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))
            = TO_DATE(:ATT_DATE, 'YYYY-MM-DD')
      ORDER BY TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}) ASC
      `,
      {
        EMP_NO:   String(employeeId),
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
    date       = "",
    fromDate   = "",
    toDate     = "",
    employeeId = "",
    companyId  = "",
    orgId      = "",
    status     = "",
  } = filters;

  const conn = await getConnection();

  const conditions = [];
  const bindParams = {};

  if (date && date.trim()) {
    conditions.push(`TRUNC(att.ATTENDANCE_DATE) = TO_DATE(:ATT_DATE, 'YYYY-MM-DD')`);
    bindParams.ATT_DATE = date.trim();
  }

  if (fromDate && toDate && !date) {
    conditions.push(
      `att.ATTENDANCE_DATE BETWEEN TO_DATE(:FROM_DATE, 'YYYY-MM-DD') AND TO_DATE(:TO_DATE, 'YYYY-MM-DD')`,
    );
    bindParams.FROM_DATE = fromDate;
    bindParams.TO_DATE   = toDate;
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
        ROUND(att.WORK_MINUTES     / 60, 2)  AS WORK_HOURS,
        ROUND(att.OVERTIME_MINUTES / 60, 2)  AS OVERTIME_HOURS,
        e.EMP_NO,
        e.TITLE,
        e.FIRST_NAME,
        e.LAST_NAME,
        s.NAME        AS SHIFT_NAME,
        s.START_TIME  AS SHIFT_START,
        s.END_TIME    AS SHIFT_END,
        c.COMPANY_NAME
      FROM HCM.HR_ATTENDANCE         att
      JOIN HCM.HR_EMPLOYEE           e   ON att.EMPLOYEE_ID = e.PERSON_ID
      LEFT JOIN HCM.HR_EMP_ASSIGNMENT a  ON e.PERSON_ID    = a.PERSON_ID AND a.STATUS = 1
      LEFT JOIN HCM.HR_COMPANY       c   ON a.COMPANY_ID   = c.COMPANY_ID
      LEFT JOIN HCM.HR_SHIFT         s   ON att.SHIFT_ID   = s.SHIFT_ID
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

export const getAttendanceSummary = async ({ date, fromDate, toDate }) => {
  const conn = await getConnection();
  try {
    const conditions = [];
    const bindParams = {};

    if (date && date.trim()) {
      conditions.push(`TRUNC(att.ATTENDANCE_DATE) = TO_DATE(:ATT_DATE, 'YYYY-MM-DD')`);
      bindParams.ATT_DATE = date.trim();
    } else if (fromDate && toDate) {
      conditions.push(
        `att.ATTENDANCE_DATE BETWEEN TO_DATE(:FROM_DATE, 'YYYY-MM-DD') AND TO_DATE(:TO_DATE, 'YYYY-MM-DD')`,
      );
      bindParams.FROM_DATE = fromDate;
      bindParams.TO_DATE   = toDate;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await conn.execute(
      `
      SELECT
        COUNT(*)                                                         AS TOTAL,
        SUM(CASE WHEN att.STATUS = 'PRESENT'      THEN 1 ELSE 0 END)   AS PRESENT,
        SUM(CASE WHEN att.STATUS = 'LATE'         THEN 1 ELSE 0 END)   AS LATE,
        SUM(CASE WHEN att.STATUS = 'EARLY_LEAVE'  THEN 1 ELSE 0 END)   AS EARLY_LEAVE,
        SUM(CASE WHEN att.STATUS = 'ABSENT'       THEN 1 ELSE 0 END)   AS ABSENT,
        SUM(CASE WHEN att.STATUS = 'UNSCHEDULED'  THEN 1 ELSE 0 END)   AS UNSCHEDULED,
        ROUND(SUM(NVL(att.WORK_MINUTES,     0)) / 60, 2)               AS TOTAL_WORK_HOURS,
        ROUND(SUM(NVL(att.OVERTIME_MINUTES, 0)) / 60, 2)               AS TOTAL_OVERTIME_HOURS
      FROM HCM.HR_ATTENDANCE att
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
//  Call this after assigning / changing a shift so past attendance rows get
//  recalculated with the correct shift, status, work hours and overtime.
//
//  POST /api/attendance/reprocess
//  Body : { employeeId, fromDate, toDate }
//  Roles: Admin, HR only
// ─────────────────────────────────────────────────────────────────────────────

export const reprocessAttendanceForEmployee = async (employeeId, fromDate, toDate) => {
  const conn = await getConnection();
  try {

    // ── STEP 1: Reset rows to PENDING and stamp the correct SHIFT_ID ──────────
    //
    // HR_EMP_SHIFT.EMP_NO stores PERSON_ID values (NUMBER), so we match
    // directly on EMPLOYEE_ID (which is also PERSON_ID on HR_ATTENDANCE).
    // The correlated subquery picks the shift effective on each attendance date.

    await conn.execute(
      `
      UPDATE HCM.HR_ATTENDANCE att
         SET att.STATUS     = 'PENDING',
             att.SHIFT_ID   = (
               SELECT ES.SHIFT_ID
                 FROM HCM.HR_EMP_SHIFT ES
                WHERE ES.EMP_NO  = att.EMPLOYEE_ID   -- EMP_NO stores PERSON_ID
                  AND ES.STATUS  = 1
                  AND att.ATTENDANCE_DATE
                      BETWEEN NVL(ES.EFFECTIVE_START_DATE, TO_DATE('1900-01-01', 'YYYY-MM-DD'))
                          AND NVL(ES.EFFECTIVE_END_DATE, TO_DATE('9999-12-31', 'YYYY-MM-DD'))
                  AND ROWNUM = 1
             ),
             att.UPDATED_BY   = 'REPROCESS',
             att.UPDATED_DATE = SYSTIMESTAMP
       WHERE att.EMPLOYEE_ID  = :EMPLOYEE_ID
         AND att.ATTENDANCE_DATE
             BETWEEN TO_DATE(:FROM_DATE, 'YYYY-MM-DD')
                 AND TO_DATE(:TO_DATE,   'YYYY-MM-DD')
      `,
      { EMPLOYEE_ID: employeeId, FROM_DATE: fromDate, TO_DATE: toDate },
    );

    await conn.commit();

    // ── STEP 2: Run normal processor — picks up PENDING rows ──────────────────
    // Status, work hours and overtime are all recalculated fresh.
    return await processAttendance(fromDate, toDate);

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};