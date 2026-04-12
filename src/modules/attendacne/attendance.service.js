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

const calculateStatus = (inTime, outTime, shift) => {
  if (!inTime) return STATUS.ABSENT;
  if (!shift)  return STATUS.PRESENT;

  const actualInMinutes  = toMinutes(extractTime(inTime));
  const actualOutMinutes = outTime ? toMinutes(extractTime(outTime)) : null;

  const shiftStartMinutes = toMinutes(shift.START_TIME);
  const shiftEndMinutes   = toMinutes(shift.END_TIME);
  const graceIn  = shift.GRACE_IN_MINUTES  ?? 0;
  const graceOut = shift.GRACE_OUT_MINUTES ?? 0;

  const isLate       = actualInMinutes > shiftStartMinutes + graceIn;
  const isEarlyLeave = actualOutMinutes !== null && actualOutMinutes < shiftEndMinutes - graceOut;

  if (isLate)       return STATUS.LATE;
  if (isEarlyLeave) return STATUS.EARLY_LEAVE;
  return STATUS.PRESENT;
};

// ─────────────────────────────────────────────────────────────────────────────
//  PROCESS ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────

export const processAttendance = async (fromDate, toDate) => {
  const conn = await getConnection();
  try {
    console.log(`[Attendance] Processing ATT_LOG from ${fromDate} to ${toDate}...`);

    await conn.execute(
      `
      MERGE INTO HCM.HR_ATTENDANCE target
      USING (
        SELECT
          E.PERSON_ID,
          TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT})) AS ATT_DATE,
          MIN(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))   AS FIRST_IN,
          MAX(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))   AS LAST_OUT,
          NVL(MIN(A.POSITION_ID), 1)                               AS SHIFT_ID,
          L.AM_MAC_ID                                              AS DEVICE_ID
        FROM HCM.ATT_LOG L
        JOIN HCM.HR_EMPLOYEE E ON L.AM_EMPNO = E.EMP_NO
        LEFT JOIN HCM.HR_EMP_ASSIGNMENT A ON E.PERSON_ID = A.PERSON_ID
                                          AND A.STATUS    = 1
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
          CREATED_BY, CREATED_DATE
        )
        VALUES (
          source.PERSON_ID, source.ATT_DATE, source.FIRST_IN, source.LAST_OUT,
          source.SHIFT_ID, source.DEVICE_ID, 'PENDING', 'Y',
          'SCHEDULER', SYSTIMESTAMP
        )
    `,
      { FROM_DATE: fromDate, TO_DATE: toDate },
    );

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
      const status = calculateStatus(row.IN_TIME, row.OUT_TIME, row);
      await conn.execute(
        `
        UPDATE HCM.HR_ATTENDANCE
           SET STATUS       = :STATUS,
               UPDATED_DATE = SYSTIMESTAMP,
               UPDATED_BY   = 'SCHEDULER'
         WHERE ATTENDANCE_ID = :ATTENDANCE_ID
      `,
        { STATUS: status, ATTENDANCE_ID: row.ATTENDANCE_ID },
      );
    }

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
        FROM HCM.HR_ATTENDANCE     att
        JOIN HCM.HR_EMPLOYEE       e   ON att.EMPLOYEE_ID = e.PERSON_ID
        LEFT JOIN HCM.HR_EMP_ASSIGNMENT a ON e.PERSON_ID  = a.PERSON_ID AND a.STATUS = 1
        LEFT JOIN HCM.HR_COMPANY   c   ON a.COMPANY_ID   = c.COMPANY_ID
        LEFT JOIN HCM.HR_SHIFT     s   ON att.SHIFT_ID   = s.SHIFT_ID
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
            att.CREATED_DATE,
            att.UPDATED_DATE,
            e.EMP_NO,
            e.TITLE,
            e.FIRST_NAME,
            e.LAST_NAME,
            e.GENDER,
            e.JOIN_DATE,
            s.CODE           AS SHIFT_CODE,
            s.NAME           AS SHIFT_NAME,
            s.START_TIME     AS SHIFT_START,
            s.END_TIME       AS SHIFT_END,
            s.GRACE_IN_MINUTES,
            s.GRACE_OUT_MINUTES,
            c.COMPANY_NAME

          FROM HCM.HR_ATTENDANCE     att
          JOIN HCM.HR_EMPLOYEE       e   ON att.EMPLOYEE_ID = e.PERSON_ID
          LEFT JOIN HCM.HR_EMP_ASSIGNMENT a ON e.PERSON_ID  = a.PERSON_ID AND a.STATUS = 1
          LEFT JOIN HCM.HR_COMPANY   c   ON a.COMPANY_ID   = c.COMPANY_ID
          LEFT JOIN HCM.HR_SHIFT     s   ON att.SHIFT_ID   = s.SHIFT_ID
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
      JOIN HCM.HR_EMPLOYEE  E   ON L.AM_EMPNO   = E.EMP_NO
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
        e.EMP_NO,
        e.TITLE,
        e.FIRST_NAME,
        e.LAST_NAME,
        s.NAME       AS SHIFT_NAME,
        s.START_TIME AS SHIFT_START,
        s.END_TIME   AS SHIFT_END,
        c.COMPANY_NAME
      FROM HCM.HR_ATTENDANCE     att
      JOIN HCM.HR_EMPLOYEE       e   ON att.EMPLOYEE_ID = e.PERSON_ID
      LEFT JOIN HCM.HR_EMP_ASSIGNMENT a ON e.PERSON_ID  = a.PERSON_ID AND a.STATUS = 1
      LEFT JOIN HCM.HR_COMPANY   c   ON a.COMPANY_ID   = c.COMPANY_ID
      LEFT JOIN HCM.HR_SHIFT     s   ON att.SHIFT_ID   = s.SHIFT_ID
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
        COUNT(*)                                                      AS TOTAL,
        SUM(CASE WHEN att.STATUS = 'PRESENT'     THEN 1 ELSE 0 END)  AS PRESENT,
        SUM(CASE WHEN att.STATUS = 'LATE'        THEN 1 ELSE 0 END)  AS LATE,
        SUM(CASE WHEN att.STATUS = 'EARLY_LEAVE' THEN 1 ELSE 0 END)  AS EARLY_LEAVE,
        SUM(CASE WHEN att.STATUS = 'ABSENT'      THEN 1 ELSE 0 END)  AS ABSENT
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