// src/modules/attendance-correction/attendance-correction.service.js
import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";
import { format } from "date-fns";
// processAttendance manages its own connection — import directly
import { processAttendance } from "../attendacne/attendance.service.js";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_SORT_COLUMNS = {
  CORRECTION_ID:   "ac.CORRECTION_ID",
  CORRECTION_DATE: "ac.CORRECTION_DATE",
  CREATED_DATE:    "ac.CREATED_DATE",
  FIRST_NAME:      "e.FIRST_NAME",
};

const CORRECTION_SELECT = `
  ac.CORRECTION_ID,
  ac.PERSON_ID,
  e.EMP_NO,
  TRIM(NVL(e.FIRST_NAME,'') || ' ' || NVL(e.LAST_NAME,''))   AS EMPLOYEE_NAME,
  ac.CORRECTION_DATE,
  ac.REQUESTED_IN_TIME,
  ac.REQUESTED_OUT_TIME,
  ac.REASON,
  ac.STATUS,
  ac.APPROVER_ID,
  TRIM(NVL(ap.FIRST_NAME,'') || ' ' || NVL(ap.LAST_NAME,'')) AS APPROVER_NAME,
  ap.EMP_NO                                                   AS APPROVER_EMP_NO,
  ac.APPROVED_ON,
  ac.CREATED_DATE,
  ac.UPDATED_DATE
`;

const CORRECTION_JOINS = `
  LEFT JOIN HR_EMPLOYEE e  ON ac.PERSON_ID   = e.PERSON_ID
  LEFT JOIN HR_EMPLOYEE ap ON ac.APPROVER_ID = ap.PERSON_ID
`;

const paginateQuery = (innerSql, rownumMin, rownumMax) => `
  SELECT * FROM (
    SELECT ROWNUM AS RN, sq.* FROM (
      ${innerSql}
    ) sq WHERE ROWNUM <= ${rownumMax}
  ) WHERE RN >= ${rownumMin}
`;

const parsePagination = (page, limit) => {
  const pageNum   = Math.max(1, parseInt(page,  10) || 1);
  const limitNum  = Math.max(1, parseInt(limit, 10) || 20);
  const rownumMin = (pageNum - 1) * limitNum + 1;
  const rownumMax = pageNum * limitNum;
  return { pageNum, limitNum, rownumMin, rownumMax };
};

// ─────────────────────────────────────────────────────────────────────────────
//  INTERNAL HELPER — notify supervisor
// ─────────────────────────────────────────────────────────────────────────────

const notifySupervisor = async (conn, personId, correctionData) => {
  const supResult = await conn.execute(
    `SELECT SUPERVISOR_ID FROM HR_EMPLOYEE_SUPERVISOR
      WHERE PERSON_ID = :PERSON_ID AND STATUS = 1`,
    { PERSON_ID: parseInt(personId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const supervisorId = supResult.rows[0]?.SUPERVISOR_ID ?? null;
  if (!supervisorId) return;

  const empResult = await conn.execute(
    `SELECT FIRST_NAME, LAST_NAME FROM HR_EMPLOYEE WHERE PERSON_ID = :ID`,
    { ID: parseInt(personId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  const emp     = empResult.rows[0];
  const empName = emp ? `${emp.FIRST_NAME} ${emp.LAST_NAME}` : `Employee #${personId}`;

  await conn.execute(
    `INSERT INTO HR_EMPLOYEE_NOTIFICATION
       (EMPLYEE_ID, SUPERVISOR_ID, CORRECTION_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
     VALUES
       (:EMPLOYEE_ID, :SUPERVISOR_ID, :CORRECTION_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
    {
      EMPLOYEE_ID:          parseInt(personId),
      SUPERVISOR_ID:        supervisorId,
      CORRECTION_ID:        parseInt(correctionData.correction_id),
      NOTIFICATION_DETAILS: `${empName} has submitted an attendance correction request for ${new Date(correctionData.correction_date).toDateString()}. Reason: ${correctionData.reason ?? "Not specified"}.`,
      CREATE_BY:            parseInt(personId),
    },
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE
// ─────────────────────────────────────────────────────────────────────────────

export const createCorrectionRequest = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO HR_ATTENDANCE_CORRECTION
         (PERSON_ID, CORRECTION_DATE, REQUESTED_IN_TIME, REQUESTED_OUT_TIME,
          REASON, STATUS, CREATED_BY)
       VALUES
         (:person_id, :correction_date, :requested_in_time, :requested_out_time,
          :reason, 'PENDING', :created_by)
       RETURNING CORRECTION_ID INTO :correction_id`,
      {
        person_id:           parseInt(data.person_id),
        correction_date:     new Date(data.correction_date),
        requested_in_time:   data.requested_in_time  ? new Date(data.requested_in_time)  : null,
        requested_out_time:  data.requested_out_time ? new Date(data.requested_out_time) : null,
        reason:              data.reason ?? null,
        created_by:          data.created_by ?? null,
        correction_id:       { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
    );

    const newCorrectionId = result.outBinds.correction_id[0];

    await notifySupervisor(conn, data.person_id, {
      ...data,
      correction_id: newCorrectionId,
    });

    await conn.commit();
    return { correction_id: newCorrectionId };
  } catch (err) {
    await conn.rollback();
    console.error("createCorrectionRequest error:", err);
    throw err;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ALL — Admin/HR, server-side pagination + filters + sorting
// ─────────────────────────────────────────────────────────────────────────────

export const getAllCorrections = async ({
  page      = 1,
  limit     = 20,
  fromDate  = "",
  toDate    = "",
  personId  = "",
  status    = "",
  sortBy    = "CORRECTION_ID",
  sortOrder = "DESC",
} = {}) => {
  const conn = await getConnection();
  const { pageNum, limitNum, rownumMin, rownumMax } = parsePagination(page, limit);

  const orderCol = ALLOWED_SORT_COLUMNS[sortBy] ?? "ac.CORRECTION_ID";
  const orderDir = sortOrder === "ASC" ? "ASC" : "DESC";

  const conditions = [];
  const bindParams = {};

  if (fromDate && toDate) {
    conditions.push(
      `ac.CORRECTION_DATE BETWEEN TO_DATE(:FROM_DATE,'YYYY-MM-DD') AND TO_DATE(:TO_DATE,'YYYY-MM-DD')`,
    );
    bindParams.FROM_DATE = fromDate;
    bindParams.TO_DATE   = toDate;
  }
  if (personId) {
    conditions.push(`ac.PERSON_ID = :PERSON_ID`);
    bindParams.PERSON_ID = parseInt(personId, 10);
  }
  if (status && status.trim()) {
    conditions.push(`ac.STATUS = :STATUS`);
    bindParams.STATUS = status.trim().toUpperCase();
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join("\n      AND ")}`
    : "";

  try {
    const countResult = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
         FROM HR_ATTENDANCE_CORRECTION ac
         LEFT JOIN HR_EMPLOYEE e ON ac.PERSON_ID = e.PERSON_ID
         ${whereClause}`,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const total = countResult.rows[0].TOTAL;

    const result = await conn.execute(
      paginateQuery(
        `SELECT ${CORRECTION_SELECT}
           FROM HR_ATTENDANCE_CORRECTION ac
           ${CORRECTION_JOINS}
           ${whereClause}
           ORDER BY ${orderCol} ${orderDir}`,
        rownumMin,
        rownumMax,
      ),
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return {
      data: result.rows,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET BY EMPLOYEE — ESS, paginated
// ─────────────────────────────────────────────────────────────────────────────

export const getCorrectionsByEmployee = async ({
  personId,
  page      = 1,
  limit     = 20,
  status    = "",
  sortBy    = "CORRECTION_ID",
  sortOrder = "DESC",
} = {}) => {
  const conn = await getConnection();
  const { pageNum, limitNum, rownumMin, rownumMax } = parsePagination(page, limit);

  const orderCol = ALLOWED_SORT_COLUMNS[sortBy] ?? "ac.CORRECTION_ID";
  const orderDir = sortOrder === "ASC" ? "ASC" : "DESC";

  const conditions = [`ac.PERSON_ID = :PERSON_ID`];
  const bindParams = { PERSON_ID: parseInt(personId) };

  if (status && status.trim()) {
    conditions.push(`ac.STATUS = :STATUS`);
    bindParams.STATUS = status.trim().toUpperCase();
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  try {
    const countResult = await conn.execute(
      `SELECT COUNT(*) AS TOTAL FROM HR_ATTENDANCE_CORRECTION ac ${whereClause}`,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const total = countResult.rows[0].TOTAL;

    const result = await conn.execute(
      paginateQuery(
        `SELECT ${CORRECTION_SELECT}
           FROM HR_ATTENDANCE_CORRECTION ac
           ${CORRECTION_JOINS}
           ${whereClause}
           ORDER BY ${orderCol} ${orderDir}`,
        rownumMin,
        rownumMax,
      ),
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return {
      data: result.rows,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET BY TEAM — MSS, paginated
// ─────────────────────────────────────────────────────────────────────────────

export const getCorrectionsByTeam = async ({
  supervisorId,
  page      = 1,
  limit     = 20,
  status    = "",
  sortBy    = "CORRECTION_ID",
  sortOrder = "DESC",
} = {}) => {
  const conn = await getConnection();
  const { pageNum, limitNum, rownumMin, rownumMax } = parsePagination(page, limit);

  const orderCol = ALLOWED_SORT_COLUMNS[sortBy] ?? "ac.CORRECTION_ID";
  const orderDir = sortOrder === "ASC" ? "ASC" : "DESC";

  const conditions = [];
  const bindParams = { SUPERVISOR_ID: parseInt(supervisorId) };

  if (status && status.trim()) {
    conditions.push(`ac.STATUS = :STATUS`);
    bindParams.STATUS = status.trim().toUpperCase();
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
         FROM HR_ATTENDANCE_CORRECTION ac
         JOIN HR_EMPLOYEE_SUPERVISOR es
           ON ac.PERSON_ID     = es.PERSON_ID
          AND es.SUPERVISOR_ID  = :SUPERVISOR_ID
          AND es.STATUS         = 1
         ${whereClause}`,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const total = countResult.rows[0].TOTAL;

    const result = await conn.execute(
      paginateQuery(
        `SELECT ${CORRECTION_SELECT}
           FROM HR_ATTENDANCE_CORRECTION ac
           JOIN HR_EMPLOYEE_SUPERVISOR es
             ON ac.PERSON_ID    = es.PERSON_ID
            AND es.SUPERVISOR_ID = :SUPERVISOR_ID
            AND es.STATUS        = 1
           ${CORRECTION_JOINS}
           ${whereClause}
           ORDER BY ${orderCol} ${orderDir}`,
        rownumMin,
        rownumMax,
      ),
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return {
      data: result.rows,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  APPROVE
//
//  Flow:
//    1. Validate correction exists + is PENDING
//    2. Update HR_ATTENDANCE_CORRECTION → APPROVED
//    3. Mark supervisor notification as read
//    4. MERGE into HR_ATTENDANCE:
//         - EXISTS  → UPDATE IN_TIME, OUT_TIME, STATUS = 'PENDING'
//         - MISSING → INSERT new row with requested times, STATUS = 'PENDING'
//    5. Commit — close connection
//    6. Call processAttendance(date, date, personId) — reclassifies the row
//       (processAttendance manages its own connection)
//    7. Notify employee
// ─────────────────────────────────────────────────────────────────────────────

export const approveCorrection = async (correctionId, approverId, notificationId) => {
  // ── Phase 1: Load + validate + update correction + MERGE attendance ────────
  let correctionPersonId  = null;
  let correctionDate      = null;
  let requestedInTime     = null;
  let requestedOutTime    = null;

  const conn = await getConnection();
  try {
    const corrResult = await conn.execute(
      `SELECT ac.PERSON_ID, ac.STATUS, ac.CORRECTION_DATE,
              ac.REQUESTED_IN_TIME, ac.REQUESTED_OUT_TIME,
              e.FIRST_NAME, e.LAST_NAME
         FROM HR_ATTENDANCE_CORRECTION ac
         LEFT JOIN HR_EMPLOYEE e ON ac.PERSON_ID = e.PERSON_ID
        WHERE ac.CORRECTION_ID = :CORRECTION_ID`,
      { CORRECTION_ID: parseInt(correctionId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const corr = corrResult.rows[0];
    if (!corr) throw new Error("Correction request not found.");
    if (corr.STATUS !== "PENDING") {
      throw new Error(`Correction #${correctionId} is already '${corr.STATUS}'.`);
    }

    correctionPersonId = corr.PERSON_ID;
    correctionDate     = corr.CORRECTION_DATE;
    requestedInTime    = corr.REQUESTED_IN_TIME;
    requestedOutTime   = corr.REQUESTED_OUT_TIME;

    // Update correction status
    await conn.execute(
      `UPDATE HR_ATTENDANCE_CORRECTION
          SET STATUS       = 'APPROVED',
              APPROVER_ID  = :APPROVER_ID,
              APPROVED_ON  = SYSTIMESTAMP,
              UPDATED_DATE = SYSTIMESTAMP
        WHERE CORRECTION_ID = :CORRECTION_ID`,
      { CORRECTION_ID: parseInt(correctionId), APPROVER_ID: parseInt(approverId) },
    );

    // Mark supervisor notification as read
    if (notificationId) {
      await conn.execute(
        `UPDATE HR_EMPLOYEE_NOTIFICATION
            SET STATUS = 1, UPDATED_DATE = SYSDATE
          WHERE ID = :ID`,
        { ID: parseInt(notificationId) },
      );
    }

    // MERGE into HR_ATTENDANCE — reset to PENDING so processAttendance picks it up
    // SHIFT_ID is preserved from existing row on UPDATE, or fetched from HR_EMP_SHIFT on INSERT
    await conn.execute(
      `MERGE INTO HR_ATTENDANCE target
       USING (
         SELECT
           :PERSON_ID      AS PERSON_ID,
           :ATT_DATE       AS ATT_DATE,
           :IN_TIME        AS IN_TIME,
           :OUT_TIME       AS OUT_TIME,
           (SELECT ES.SHIFT_ID
              FROM HR_EMP_SHIFT ES
             WHERE ES.EMP_NO = :PERSON_ID
               AND ES.STATUS = 1
               AND :ATT_DATE
                   BETWEEN NVL(ES.EFFECTIVE_START_DATE, TO_DATE('1900-01-01','YYYY-MM-DD'))
                       AND NVL(ES.EFFECTIVE_END_DATE,   TO_DATE('9999-12-31','YYYY-MM-DD'))
             ORDER BY ES.EFFECTIVE_START_DATE DESC
             FETCH FIRST 1 ROW ONLY
           ) AS SHIFT_ID
         FROM DUAL
       ) source
       ON (
             target.EMPLOYEE_ID     = source.PERSON_ID
         AND target.ATTENDANCE_DATE = source.ATT_DATE
       )
       WHEN MATCHED THEN
         UPDATE SET
           target.IN_TIME      = source.IN_TIME,
           target.OUT_TIME     = source.OUT_TIME,
           target.STATUS       = 'PENDING',
           target.UPDATED_DATE = SYSTIMESTAMP,
           target.UPDATED_BY   = 'CORRECTION'
       WHEN NOT MATCHED THEN
         INSERT (
           EMPLOYEE_ID, ATTENDANCE_DATE, IN_TIME, OUT_TIME,
           SHIFT_ID, STATUS, PAYROLL_FLAG,
           WORK_MINUTES, OVERTIME_MINUTES,
           CREATED_BY, CREATED_DATE
         )
         VALUES (
           source.PERSON_ID, source.ATT_DATE, source.IN_TIME, source.OUT_TIME,
           source.SHIFT_ID, 'PENDING', 'Y',
           0, 0,
           'CORRECTION', SYSTIMESTAMP
         )`,
      {
        PERSON_ID: parseInt(correctionPersonId),
        ATT_DATE:  correctionDate,
        IN_TIME:   requestedInTime  ?? null,
        OUT_TIME:  requestedOutTime ?? null,
      },
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error("approveCorrection phase 1 error:", err);
    throw err;
  } finally {
    // Close before calling processAttendance — it manages its own connection
    await conn.close();
  }

  // ── Phase 2: Reclassify the row via processAttendance ─────────────────────
  const dateStr = format(new Date(correctionDate), "yyyy-MM-dd");
  await processAttendance(dateStr, dateStr, correctionPersonId);

  // ── Phase 3: Notify employee ───────────────────────────────────────────────
  const notifConn = await getConnection();
  try {
    await notifConn.execute(
      `INSERT INTO HR_EMPLOYEE_NOTIFICATION
         (EMPLYEE_ID, SUPERVISOR_ID, CORRECTION_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
       VALUES
         (:EMPLOYEE_ID, :SUPERVISOR_ID, :CORRECTION_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
      {
        EMPLOYEE_ID:          correctionPersonId,
        SUPERVISOR_ID:        null,
        CORRECTION_ID:        parseInt(correctionId),
        NOTIFICATION_DETAILS: `Your attendance correction request for ${new Date(correctionDate).toDateString()} has been approved and your attendance record has been updated.`,
        CREATE_BY:            parseInt(approverId),
      },
    );
    await notifConn.commit();
  } catch (err) {
    await notifConn.rollback();
    // Non-critical — correction is already approved, don't re-throw
    console.error("approveCorrection notification error:", err);
  } finally {
    await notifConn.close();
  }

  return { success: true };
};

// ─────────────────────────────────────────────────────────────────────────────
//  REJECT
// ─────────────────────────────────────────────────────────────────────────────

export const rejectCorrection = async (correctionId, approverId, notificationId, reason) => {
  const conn = await getConnection();
  try {
    const corrResult = await conn.execute(
      `SELECT ac.PERSON_ID, ac.STATUS, ac.CORRECTION_DATE,
              e.FIRST_NAME, e.LAST_NAME
         FROM HR_ATTENDANCE_CORRECTION ac
         LEFT JOIN HR_EMPLOYEE e ON ac.PERSON_ID = e.PERSON_ID
        WHERE ac.CORRECTION_ID = :CORRECTION_ID`,
      { CORRECTION_ID: parseInt(correctionId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const corr = corrResult.rows[0];
    if (!corr) throw new Error("Correction request not found.");
    if (corr.STATUS !== "PENDING") {
      throw new Error(`Correction #${correctionId} is already '${corr.STATUS}'.`);
    }

    await conn.execute(
      `UPDATE HR_ATTENDANCE_CORRECTION
          SET STATUS       = 'REJECTED',
              APPROVER_ID  = :APPROVER_ID,
              APPROVED_ON  = SYSTIMESTAMP,
              UPDATED_DATE = SYSTIMESTAMP
        WHERE CORRECTION_ID = :CORRECTION_ID`,
      { CORRECTION_ID: parseInt(correctionId), APPROVER_ID: parseInt(approverId) },
    );

    if (notificationId) {
      await conn.execute(
        `UPDATE HR_EMPLOYEE_NOTIFICATION
            SET STATUS = 1, UPDATED_DATE = SYSDATE
          WHERE ID = :ID`,
        { ID: parseInt(notificationId) },
      );
    }

    const rejectMsg = reason
      ? `Your attendance correction request for ${new Date(corr.CORRECTION_DATE).toDateString()} has been rejected. Reason: ${reason}`
      : `Your attendance correction request for ${new Date(corr.CORRECTION_DATE).toDateString()} has been rejected.`;

    await conn.execute(
      `INSERT INTO HR_EMPLOYEE_NOTIFICATION
         (EMPLYEE_ID, SUPERVISOR_ID, CORRECTION_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
       VALUES
         (:EMPLOYEE_ID, :SUPERVISOR_ID, :CORRECTION_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
      {
        EMPLOYEE_ID:          corr.PERSON_ID,
        SUPERVISOR_ID:        null,
        CORRECTION_ID:        parseInt(correctionId),
        NOTIFICATION_DETAILS: rejectMsg,
        CREATE_BY:            parseInt(approverId),
      },
    );

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    console.error("rejectCorrection error:", err);
    throw err;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE — cancel if still PENDING
// ─────────────────────────────────────────────────────────────────────────────

export const deleteCorrectionRequest = async (correctionId) => {
  const conn = await getConnection();
  try {
    const corrResult = await conn.execute(
      `SELECT ac.PERSON_ID, ac.STATUS, ac.CORRECTION_DATE,
              e.FIRST_NAME, e.LAST_NAME
         FROM HR_ATTENDANCE_CORRECTION ac
         LEFT JOIN HR_EMPLOYEE e ON ac.PERSON_ID = e.PERSON_ID
        WHERE ac.CORRECTION_ID = :CORRECTION_ID`,
      { CORRECTION_ID: parseInt(correctionId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const corr = corrResult.rows[0];
    if (!corr) throw new Error("Correction request not found.");
    if (corr.STATUS !== "PENDING") {
      throw new Error(`Cannot cancel a correction request that is already '${corr.STATUS}'.`);
    }

    await conn.execute(
      `DELETE FROM HR_ATTENDANCE_CORRECTION WHERE CORRECTION_ID = :CORRECTION_ID`,
      { CORRECTION_ID: parseInt(correctionId) },
    );

    // Mark supervisor notification as read
    await conn.execute(
      `UPDATE HR_EMPLOYEE_NOTIFICATION
          SET STATUS = 1, UPDATED_DATE = SYSDATE
        WHERE CORRECTION_ID = :CORRECTION_ID AND STATUS = 0`,
      { CORRECTION_ID: parseInt(correctionId) },
    );

    // Notify supervisor of cancellation
    const supResult = await conn.execute(
      `SELECT SUPERVISOR_ID FROM HR_EMPLOYEE_SUPERVISOR
        WHERE PERSON_ID = :PERSON_ID AND STATUS = 1`,
      { PERSON_ID: parseInt(corr.PERSON_ID) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const supervisorId = supResult.rows[0]?.SUPERVISOR_ID ?? null;

    if (supervisorId) {
      const empName = `${corr.FIRST_NAME} ${corr.LAST_NAME}`;
      await conn.execute(
        `INSERT INTO HR_EMPLOYEE_NOTIFICATION
           (EMPLYEE_ID, SUPERVISOR_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
         VALUES
           (:EMPLOYEE_ID, :SUPERVISOR_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
        {
          EMPLOYEE_ID:          parseInt(corr.PERSON_ID),
          SUPERVISOR_ID:        supervisorId,
          NOTIFICATION_DETAILS: `${empName} has cancelled their attendance correction request for ${new Date(corr.CORRECTION_DATE).toDateString()}.`,
          CREATE_BY:            parseInt(corr.PERSON_ID),
        },
      );
    }

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    console.error("deleteCorrectionRequest error:", err);
    throw err;
  } finally {
    await conn.close();
  }
};