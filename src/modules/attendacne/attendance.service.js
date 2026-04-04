import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attendance status codes stored in HR_ATTENDANCE.STATUS
 */
const STATUS = {
  PRESENT:     "PRESENT",
  LATE:        "LATE",
  EARLY_LEAVE: "EARLY_LEAVE",
  ABSENT:      "ABSENT",
};

/**
 * ATT_LOG.AM_TIME_IN_OUT is stored as ISO 8601 with timezone offset
 * e.g. "2026-04-02T17:36:45+06:00"
 * This format mask is used everywhere we parse that column.
 */
const ISO_TZ_FMT = `'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM'`;

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts "HH:MM" string to total minutes since midnight.
 * Used for shift time comparisons.
 * @param {string} timeStr - e.g. "09:00"
 * @returns {number} total minutes
 */
const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Extracts HH:MM from a Date or timestamp string.
 * @param {Date|string} dt
 * @returns {string} "HH:MM"
 */
const extractTime = (dt) => {
  if (!dt) return null;
  const d = new Date(dt);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

/**
 * Calculates attendance status by comparing actual punch times
 * against the assigned shift's start/end + grace periods.
 *
 * @param {Date|string} inTime    - Actual punch-in time
 * @param {Date|string} outTime   - Actual punch-out time
 * @param {object}      shift     - Shift row from HR_SHIFT
 * @returns {string}              - One of STATUS constants
 */
const calculateStatus = (inTime, outTime, shift) => {
  if (!inTime) return STATUS.ABSENT;
  if (!shift)  return STATUS.PRESENT; // No shift found — default to PRESENT

  const actualInMinutes  = toMinutes(extractTime(inTime));
  const actualOutMinutes = outTime ? toMinutes(extractTime(outTime)) : null;

  const shiftStartMinutes = toMinutes(shift.START_TIME);
  const shiftEndMinutes   = toMinutes(shift.END_TIME);
  const graceIn           = shift.GRACE_IN_MINUTES  ?? 0;
  const graceOut          = shift.GRACE_OUT_MINUTES ?? 0;

  const isLate       = actualInMinutes  > shiftStartMinutes + graceIn;
  const isEarlyLeave = actualOutMinutes !== null &&
                       actualOutMinutes < shiftEndMinutes - graceOut;

  if (isLate)       return STATUS.LATE;
  if (isEarlyLeave) return STATUS.EARLY_LEAVE;
  return STATUS.PRESENT;
};

// ─────────────────────────────────────────────────────────────────────────────
//  PROCESS ATTENDANCE (Core MERGE Logic)
//  Called by the nightly scheduler — merges ATT_LOG → HR_ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processes raw attendance logs for a given date range and merges
 * summarized records (first IN, last OUT) into HR_ATTENDANCE.
 *
 * Shift lookup: joins HR_EMP_ASSIGNMENT to get SHIFT_ID.
 * TODO: Replace hardcoded SHIFT_ID fallback (1) once shift-employee
 *       assignment table is implemented.
 *
 * Status logic:
 *   - LATE        : punch-in > shift start + grace_in
 *   - EARLY_LEAVE : punch-out < shift end - grace_out
 *   - ABSENT      : no ATT_LOG record for a working day
 *   - PRESENT     : on time, full day
 *
 * @param {string} fromDate - "YYYY-MM-DD"
 * @param {string} toDate   - "YYYY-MM-DD"
 */
export const processAttendance = async (fromDate, toDate) => {
  const conn = await getConnection();
  try {
    console.log(`[Attendance] Processing ATT_LOG from ${fromDate} to ${toDate}...`);

    // ── STEP 1: MERGE raw logs into HR_ATTENDANCE ─────────────────────────
    // Groups by EMPLOYEE + DATE → takes MIN (first IN) and MAX (last OUT).
    // AM_TIME_IN_OUT is ISO 8601 with TZ offset: "2026-04-02T17:36:45+06:00"
    // so we use TO_TIMESTAMP_TZ with the matching format mask.
    //
    // TODO: Replace `NVL(A.POSITION_ID, 1)` with actual SHIFT_ID from
    //       a dedicated shift-assignment table once available.
    await conn.execute(`
      MERGE INTO HCM.HR_ATTENDANCE target
      USING (
        SELECT
          E.PERSON_ID,
          TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT})) AS ATT_DATE,
          MIN(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))   AS FIRST_IN,
          MAX(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))   AS LAST_OUT,
          -- TODO: Replace with actual shift assignment join when available
          NVL(MIN(A.POSITION_ID), 1)                               AS SHIFT_ID,
          L.AM_MAC_ID                                              AS DEVICE_ID
          -- TODO: Add L.LOCATION_ID once HR_ATTENDANCE.LOCATION_ID column is added
        FROM HCM.ATT_LOG L
        JOIN HCM.HR_EMPLOYEE E ON L.AM_EMPNO = E.PERSON_ID
        LEFT JOIN HCM.HR_EMP_ASSIGNMENT A ON E.PERSON_ID = A.PERSON_ID
                                          AND A.STATUS    = 1
        WHERE TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))
              BETWEEN TO_DATE(:FROM_DATE, 'YYYY-MM-DD')
                  AND TO_DATE(:TO_DATE,   'YYYY-MM-DD')
        GROUP BY
          E.PERSON_ID,
          TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT})),
          L.AM_MAC_ID
          -- TODO: Add L.LOCATION_ID to GROUP BY once column is available
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
          -- TODO: target.LOCATION_ID = source.LOCATION_ID once column is added
      WHEN NOT MATCHED THEN
        INSERT (
          EMPLOYEE_ID, ATTENDANCE_DATE, IN_TIME, OUT_TIME,
          SHIFT_ID, DEVICE_ID, STATUS, PAYROLL_FLAG,
          CREATED_BY, CREATED_DATE
          -- TODO: Add LOCATION_ID once column is added
        )
        VALUES (
          source.PERSON_ID, source.ATT_DATE, source.FIRST_IN, source.LAST_OUT,
          source.SHIFT_ID, source.DEVICE_ID, 'PENDING', 'Y',
          'SCHEDULER', SYSTIMESTAMP
          -- TODO: Add source.LOCATION_ID once column is added
        )
    `, {
      FROM_DATE: fromDate,
      TO_DATE:   toDate,
    });

    // ── STEP 2: Update STATUS by comparing punch times with shift times ───
    // Fetches all PENDING records in the date range, calculates status
    // in Node.js (shift data already in memory), then bulk updates.
    const pendingResult = await conn.execute(`
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
    `, { FROM_DATE: fromDate, TO_DATE: toDate },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

    // Calculate and update status for each record
    for (const row of pendingResult.rows) {
      const status = calculateStatus(row.IN_TIME, row.OUT_TIME, row);
      await conn.execute(`
        UPDATE HCM.HR_ATTENDANCE
           SET STATUS       = :STATUS,
               UPDATED_DATE = SYSTIMESTAMP,
               UPDATED_BY   = 'SCHEDULER'
         WHERE ATTENDANCE_ID = :ATTENDANCE_ID
      `, {
        STATUS:        status,
        ATTENDANCE_ID: row.ATTENDANCE_ID,
      });
    }

    // ── STEP 3: Mark processed logs ───────────────────────────────────────
    await conn.execute(`
      UPDATE HCM.ATT_LOG
         SET PROCESS_STATUS = 'Y'
       WHERE PROCESS_STATUS = 'N'
         AND TRUNC(TO_TIMESTAMP_TZ(AM_TIME_IN_OUT, ${ISO_TZ_FMT}))
             BETWEEN TO_DATE(:FROM_DATE, 'YYYY-MM-DD')
                 AND TO_DATE(:TO_DATE,   'YYYY-MM-DD')
    `, { FROM_DATE: fromDate, TO_DATE: toDate });

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
//  Supports: date filter, employee filter, date range, company,
//            org, status, punch type + pagination + search
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches paginated, filtered attendance records from HR_ATTENDANCE.
 * Supports two primary modes:
 *   1. Single date  → all employees for that date
 *   2. Date range + employee → all records for that employee in range
 *
 * Additional filters: company, org, status, search.
 * TODO: Add location filter once HR_ATTENDANCE.LOCATION_ID column is added.
 *
 * @param {object} params - Filter + pagination params
 */
export const getAttendanceList = async ({
  page         = 1,
  limit        = 20,
  date         = "",     // Single date — "YYYY-MM-DD" (Mode 1)
  fromDate     = "",     // Date range start (Mode 2)
  toDate       = "",     // Date range end   (Mode 2)
  employeeId   = "",     // PERSON_ID — required for Mode 2
  companyId    = "",
  orgId        = "",
  // TODO: locationId — re-enable once HR_ATTENDANCE.LOCATION_ID column is added
  status       = "",     // PRESENT | LATE | EARLY_LEAVE | ABSENT
  search       = "",     // EMP_NO, FIRST_NAME, LAST_NAME
} = {}) => {
  const conn = await getConnection();

  // ── Sanitize pagination ──────────────────────────────────────────────────
  const pageNum   = Math.max(1, parseInt(page,  10) || 1);
  const limitNum  = Math.max(1, parseInt(limit, 10) || 20);
  const rownumMin = (pageNum - 1) * limitNum + 1;
  const rownumMax = pageNum * limitNum;

  // ── Build dynamic WHERE + bind params ────────────────────────────────────
  const conditions = [];
  const bindParams = {};

  if (date && date.trim()) {
    conditions.push(`TRUNC(att.ATTENDANCE_DATE) = TO_DATE(:DATE, 'YYYY-MM-DD')`);
    bindParams.DATE = date.trim();
  }

  if (fromDate && toDate && !date) {
    conditions.push(`att.ATTENDANCE_DATE BETWEEN TO_DATE(:FROM_DATE, 'YYYY-MM-DD') AND TO_DATE(:TO_DATE, 'YYYY-MM-DD')`);
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

  // TODO: Location filter — re-enable once HR_ATTENDANCE.LOCATION_ID column is added
  // if (locationId && locationId !== "") {
  //   conditions.push(`loc.ID = :LOCATION_ID`);
  //   bindParams.LOCATION_ID = parseInt(locationId, 10);
  // }

  if (status && status.trim()) {
    conditions.push(`att.STATUS = :STATUS`);
    bindParams.STATUS = status.trim().toUpperCase();
  }

  if (search && search.trim()) {
    conditions.push(`(
      UPPER(e.EMP_NO)        LIKE UPPER(:SEARCH)
      OR UPPER(e.FIRST_NAME) LIKE UPPER(:SEARCH)
      OR UPPER(e.LAST_NAME)  LIKE UPPER(:SEARCH)
    )`);
    bindParams.SEARCH = `%${search.trim()}%`;
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join("\n      AND ")}`
    : "";

  try {
    // ── Total count ──────────────────────────────────────────────────────
    const countResult = await conn.execute(`
      SELECT COUNT(*) AS TOTAL
        FROM HCM.HR_ATTENDANCE     att
        JOIN HCM.HR_EMPLOYEE       e   ON att.EMPLOYEE_ID = e.PERSON_ID
        LEFT JOIN HCM.HR_EMP_ASSIGNMENT a ON e.PERSON_ID  = a.PERSON_ID AND a.STATUS = 1
        LEFT JOIN HCM.HR_COMPANY   c   ON a.COMPANY_ID   = c.COMPANY_ID
        LEFT JOIN HCM.HR_SHIFT     s   ON att.SHIFT_ID   = s.SHIFT_ID
        -- TODO: Join HR_LOCATION once HR_ATTENDANCE.LOCATION_ID column is added
        -- LEFT JOIN HCM.HR_LOCATION loc ON att.LOCATION_ID = loc.ID
        ${whereClause}
    `, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    const total = countResult.rows[0].TOTAL;

    // ── Paginated data ───────────────────────────────────────────────────
    const result = await conn.execute(`
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
            -- Employee info
            e.EMP_NO,
            e.TITLE,
            e.FIRST_NAME,
            e.LAST_NAME,
            e.GENDER,
            e.JOIN_DATE,
            -- Shift info
            s.CODE           AS SHIFT_CODE,
            s.NAME           AS SHIFT_NAME,
            s.START_TIME     AS SHIFT_START,
            s.END_TIME       AS SHIFT_END,
            s.GRACE_IN_MINUTES,
            s.GRACE_OUT_MINUTES,
            -- Company info
            c.COMPANY_NAME
            -- TODO: Add loc.LOCATION_NAME once HR_ATTENDANCE.LOCATION_ID column is added
            -- loc.LOCATION_NAME

          FROM HCM.HR_ATTENDANCE     att
          JOIN HCM.HR_EMPLOYEE       e   ON att.EMPLOYEE_ID = e.PERSON_ID
          LEFT JOIN HCM.HR_EMP_ASSIGNMENT a ON e.PERSON_ID  = a.PERSON_ID AND a.STATUS = 1
          LEFT JOIN HCM.HR_COMPANY   c   ON a.COMPANY_ID   = c.COMPANY_ID
          LEFT JOIN HCM.HR_SHIFT     s   ON att.SHIFT_ID   = s.SHIFT_ID
          -- TODO: Join HR_LOCATION once HR_ATTENDANCE.LOCATION_ID column is added
          -- LEFT JOIN HCM.HR_LOCATION loc ON att.LOCATION_ID = loc.ID
          ${whereClause}
          ORDER BY att.ATTENDANCE_DATE DESC, e.FIRST_NAME ASC

        ) sq WHERE ROWNUM <= ${rownumMax}
      ) WHERE RN >= ${rownumMin}
    `, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });

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
//  GET ATTENDANCE DETAIL (Raw ATT_LOG for a specific employee + date)
//  Used for the "Detail View" popup — shows every scan for the day
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all raw ATT_LOG records for a specific employee on a specific date.
 * This is the "detail drill-down" — shows every scan (smoke breaks, duplicates, etc.)
 * Note: Location join here uses ATT_LOG.LOCATION_ID directly (not HR_ATTENDANCE).
 *
 * @param {number} employeeId - PERSON_ID
 * @param {string} date       - "YYYY-MM-DD"
 */
export const getAttendanceDetail = async (employeeId, date) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`
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
        -- Type label: 0 = IN, 1 = OUT
        CASE L.AM_TYPE_IN_OUT
          WHEN 0 THEN 'IN'
          WHEN 1 THEN 'OUT'
          ELSE 'UNKNOWN'
        END AS PUNCH_LABEL
      FROM HCM.ATT_LOG      L
      JOIN HCM.HR_EMPLOYEE  E   ON L.AM_EMPNO   = E.PERSON_ID
      LEFT JOIN HCM.HR_LOCATION loc ON L.LOCATION_ID = loc.ID
      WHERE E.PERSON_ID = :EMPLOYEE_ID
        AND TRUNC(TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}))
            = TO_DATE(:DATE, 'YYYY-MM-DD')
      ORDER BY TO_TIMESTAMP_TZ(L.AM_TIME_IN_OUT, ${ISO_TZ_FMT}) ASC
    `, {
      EMPLOYEE_ID: parseInt(employeeId),
      DATE:        date,
    }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET EXPORT DATA (No pagination — full result set for export)
//  Used by the export endpoints for CSV / Excel / PDF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Same filters as getAttendanceList but returns ALL rows without pagination.
 * Called by export endpoints only.
 * TODO: Add location filter + LOCATION_NAME once HR_ATTENDANCE.LOCATION_ID is added.
 *
 * @param {object} filters - Same filter params as getAttendanceList
 */
export const getAttendanceForExport = async (filters = {}) => {
  const {
    date       = "",
    fromDate   = "",
    toDate     = "",
    employeeId = "",
    companyId  = "",
    orgId      = "",
    // TODO: locationId — re-enable once HR_ATTENDANCE.LOCATION_ID column is added
    status     = "",
    search     = "",
  } = filters;

  const conn = await getConnection();

  const conditions = [];
  const bindParams = {};

  if (date && date.trim()) {
    conditions.push(`TRUNC(att.ATTENDANCE_DATE) = TO_DATE(:DATE, 'YYYY-MM-DD')`);
    bindParams.DATE = date.trim();
  }
  if (fromDate && toDate && !date) {
    conditions.push(`att.ATTENDANCE_DATE BETWEEN TO_DATE(:FROM_DATE, 'YYYY-MM-DD') AND TO_DATE(:TO_DATE, 'YYYY-MM-DD')`);
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
  // TODO: Location filter — re-enable once HR_ATTENDANCE.LOCATION_ID column is added
  // if (locationId && locationId !== "") {
  //   conditions.push(`loc.ID = :LOCATION_ID`);
  //   bindParams.LOCATION_ID = parseInt(locationId, 10);
  // }
  if (status && status.trim()) {
    conditions.push(`att.STATUS = :STATUS`);
    bindParams.STATUS = status.trim().toUpperCase();
  }
  if (search && search.trim()) {
    conditions.push(`(
      UPPER(e.EMP_NO)        LIKE UPPER(:SEARCH)
      OR UPPER(e.FIRST_NAME) LIKE UPPER(:SEARCH)
      OR UPPER(e.LAST_NAME)  LIKE UPPER(:SEARCH)
    )`);
    bindParams.SEARCH = `%${search.trim()}%`;
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join("\n      AND ")}`
    : "";

  try {
    const result = await conn.execute(`
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
        s.NAME           AS SHIFT_NAME,
        s.START_TIME     AS SHIFT_START,
        s.END_TIME       AS SHIFT_END,
        c.COMPANY_NAME
        -- TODO: Add loc.LOCATION_NAME once HR_ATTENDANCE.LOCATION_ID column is added
        -- loc.LOCATION_NAME
      FROM HCM.HR_ATTENDANCE     att
      JOIN HCM.HR_EMPLOYEE       e   ON att.EMPLOYEE_ID = e.PERSON_ID
      LEFT JOIN HCM.HR_EMP_ASSIGNMENT a ON e.PERSON_ID  = a.PERSON_ID AND a.STATUS = 1
      LEFT JOIN HCM.HR_COMPANY   c   ON a.COMPANY_ID   = c.COMPANY_ID
      LEFT JOIN HCM.HR_SHIFT     s   ON att.SHIFT_ID   = s.SHIFT_ID
      -- TODO: Join HR_LOCATION once HR_ATTENDANCE.LOCATION_ID column is added
      -- LEFT JOIN HCM.HR_LOCATION loc ON att.LOCATION_ID = loc.ID
      ${whereClause}
      ORDER BY att.ATTENDANCE_DATE DESC, e.FIRST_NAME ASC
    `, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ATTENDANCE SUMMARY STATS
//  Used for the dashboard summary cards above the table
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns summary counts for a given date or date range.
 * Used to populate summary cards: Total, Present, Late, Absent, Early Leave.
 *
 * @param {string} date     - Single date "YYYY-MM-DD"
 * @param {string} fromDate - Range start
 * @param {string} toDate   - Range end
 */
export const getAttendanceSummary = async ({ date, fromDate, toDate }) => {
  const conn = await getConnection();
  try {
    const conditions = [];
    const bindParams = {};

    if (date && date.trim()) {
      conditions.push(`TRUNC(att.ATTENDANCE_DATE) = TO_DATE(:DATE, 'YYYY-MM-DD')`);
      bindParams.DATE = date.trim();
    } else if (fromDate && toDate) {
      conditions.push(`att.ATTENDANCE_DATE BETWEEN TO_DATE(:FROM_DATE, 'YYYY-MM-DD') AND TO_DATE(:TO_DATE, 'YYYY-MM-DD')`);
      bindParams.FROM_DATE = fromDate;
      bindParams.TO_DATE   = toDate;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await conn.execute(`
      SELECT
        COUNT(*)                                                      AS TOTAL,
        SUM(CASE WHEN att.STATUS = 'PRESENT'     THEN 1 ELSE 0 END)  AS PRESENT,
        SUM(CASE WHEN att.STATUS = 'LATE'        THEN 1 ELSE 0 END)  AS LATE,
        SUM(CASE WHEN att.STATUS = 'EARLY_LEAVE' THEN 1 ELSE 0 END)  AS EARLY_LEAVE,
        SUM(CASE WHEN att.STATUS = 'ABSENT'      THEN 1 ELSE 0 END)  AS ABSENT
      FROM HCM.HR_ATTENDANCE att
      ${whereClause}
    `, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows[0];
  } finally {
    await conn.close();
  }
};