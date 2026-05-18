// src/modules/late-application/late-application.service.js
import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_SORT_COLUMNS = {
  LATE_ID:      "la.LATE_ID",
  LATE_DATE:    "la.LATE_DATE",
  CREATED_DATE: "la.CREATED_DATE",
  FIRST_NAME:   "e.FIRST_NAME",
};

// Shared SELECT columns — used in all three GET queries
const LATE_SELECT = `
  la.LATE_ID,
  la.PERSON_ID,
  e.EMP_NO,
  TRIM(NVL(e.FIRST_NAME,'') || ' ' || NVL(e.LAST_NAME,''))   AS EMPLOYEE_NAME,
  la.LATE_DATE,
  la.ACTUAL_IN_TIME,
  la.REASON,
  la.STATUS,
  la.APPROVER_ID,
  TRIM(NVL(ap.FIRST_NAME,'') || ' ' || NVL(ap.LAST_NAME,'')) AS APPROVER_NAME,
  ap.EMP_NO                                                   AS APPROVER_EMP_NO,
  la.APPROVED_ON,
  la.CREATED_DATE,
  la.UPDATED_DATE
`;

const LATE_JOINS = `
  LEFT JOIN HR_EMPLOYEE e  ON la.PERSON_ID   = e.PERSON_ID
  LEFT JOIN HR_EMPLOYEE ap ON la.APPROVER_ID = ap.PERSON_ID
`;

// Shared pagination wrapper
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

const notifySupervisor = async (conn, personId, lateData) => {
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
  const emp = empResult.rows[0];
  const empName = emp ? `${emp.FIRST_NAME} ${emp.LAST_NAME}` : `Employee #${personId}`;

  await conn.execute(
    `INSERT INTO HR_EMPLOYEE_NOTIFICATION
       (EMPLYEE_ID, SUPERVISOR_ID, LATE_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
     VALUES
       (:EMPLOYEE_ID, :SUPERVISOR_ID, :LATE_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
    {
      EMPLOYEE_ID:          parseInt(personId),
      SUPERVISOR_ID:        supervisorId,
      LATE_ID:              parseInt(lateData.late_id),
      NOTIFICATION_DETAILS: `${empName} has submitted a late application for ${new Date(lateData.late_date).toDateString()}. Reason: ${lateData.reason ?? "Not specified"}.`,
      CREATE_BY:            parseInt(personId),
    },
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE
// ─────────────────────────────────────────────────────────────────────────────

export const createLateApplication = async (data) => {
  const conn = await getConnection();
  try {
    const isAdminHR = data.status === "APPROVED";

    const result = await conn.execute(
      `INSERT INTO HR_LATE_APPLICATION
         (PERSON_ID, LATE_DATE, ACTUAL_IN_TIME, REASON,
          STATUS, APPROVER_ID, APPROVED_ON, CREATED_BY)
       VALUES
         (:person_id, :late_date, :actual_in_time, :reason,
          :status, :approver_id, :approved_on, :created_by)
       RETURNING LATE_ID INTO :late_id`,
      {
        person_id:      parseInt(data.person_id),
        late_date:      new Date(data.late_date),
        actual_in_time: data.actual_in_time ? new Date(data.actual_in_time) : null,
        reason:         data.reason ?? null,
        status:         data.status ?? "PENDING",
        approver_id:    data.approver_id ?? null,
        approved_on:    isAdminHR ? new Date() : null,
        created_by:     data.created_by ?? null,
        late_id:        { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
    );

    const newLateId = result.outBinds.late_id[0];

    if (!isAdminHR) {
      await notifySupervisor(conn, data.person_id, {
        ...data,
        late_id: newLateId,
      });
    }

    await conn.commit();
    return { late_id: newLateId };
  } catch (err) {
    await conn.rollback();
    console.error("createLateApplication error:", err);
    throw err;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ALL — Admin/HR, server-side pagination + filters + sorting
// ─────────────────────────────────────────────────────────────────────────────

export const getAllLateApplications = async ({
  page      = 1,
  limit     = 20,
  fromDate  = "",
  toDate    = "",
  personId  = "",
  status    = "",
  sortBy    = "LATE_ID",
  sortOrder = "DESC",
} = {}) => {
  const conn = await getConnection();
  const { pageNum, limitNum, rownumMin, rownumMax } = parsePagination(page, limit);

  const orderCol = ALLOWED_SORT_COLUMNS[sortBy] ?? "la.LATE_ID";
  const orderDir = sortOrder === "ASC" ? "ASC" : "DESC";

  const conditions = [];
  const bindParams = {};

  if (fromDate && toDate) {
    conditions.push(
      `la.LATE_DATE BETWEEN TO_DATE(:FROM_DATE,'YYYY-MM-DD') AND TO_DATE(:TO_DATE,'YYYY-MM-DD')`,
    );
    bindParams.FROM_DATE = fromDate;
    bindParams.TO_DATE   = toDate;
  }
  if (personId) {
    conditions.push(`la.PERSON_ID = :PERSON_ID`);
    bindParams.PERSON_ID = parseInt(personId, 10);
  }
  if (status && status.trim()) {
    conditions.push(`la.STATUS = :STATUS`);
    bindParams.STATUS = status.trim().toUpperCase();
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join("\n      AND ")}`
    : "";

  try {
    const countResult = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
         FROM HR_LATE_APPLICATION la
         LEFT JOIN HR_EMPLOYEE e ON la.PERSON_ID = e.PERSON_ID
         ${whereClause}`,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const total = countResult.rows[0].TOTAL;

    const result = await conn.execute(
      paginateQuery(
        `SELECT ${LATE_SELECT}
           FROM HR_LATE_APPLICATION la
           ${LATE_JOINS}
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
//  GET BY EMPLOYEE — ESS, paginated
// ─────────────────────────────────────────────────────────────────────────────

export const getLateApplicationsByEmployee = async ({
  personId,
  page      = 1,
  limit     = 20,
  status    = "",
  sortBy    = "LATE_ID",
  sortOrder = "DESC",
} = {}) => {
  const conn = await getConnection();
  const { pageNum, limitNum, rownumMin, rownumMax } = parsePagination(page, limit);

  const orderCol = ALLOWED_SORT_COLUMNS[sortBy] ?? "la.LATE_ID";
  const orderDir = sortOrder === "ASC" ? "ASC" : "DESC";

  const conditions = [`la.PERSON_ID = :PERSON_ID`];
  const bindParams = { PERSON_ID: parseInt(personId) };

  if (status && status.trim()) {
    conditions.push(`la.STATUS = :STATUS`);
    bindParams.STATUS = status.trim().toUpperCase();
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  try {
    const countResult = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
         FROM HR_LATE_APPLICATION la
         ${whereClause}`,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const total = countResult.rows[0].TOTAL;

    const result = await conn.execute(
      paginateQuery(
        `SELECT ${LATE_SELECT}
           FROM HR_LATE_APPLICATION la
           ${LATE_JOINS}
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
//  GET BY TEAM — MSS, paginated
// ─────────────────────────────────────────────────────────────────────────────

export const getLateApplicationsByTeam = async ({
  supervisorId,
  page      = 1,
  limit     = 20,
  status    = "",
  sortBy    = "LATE_ID",
  sortOrder = "DESC",
} = {}) => {
  const conn = await getConnection();
  const { pageNum, limitNum, rownumMin, rownumMax } = parsePagination(page, limit);

  const orderCol = ALLOWED_SORT_COLUMNS[sortBy] ?? "la.LATE_ID";
  const orderDir = sortOrder === "ASC" ? "ASC" : "DESC";

  const conditions = [];
  const bindParams = { SUPERVISOR_ID: parseInt(supervisorId) };

  if (status && status.trim()) {
    conditions.push(`la.STATUS = :STATUS`);
    bindParams.STATUS = status.trim().toUpperCase();
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  try {
    const countResult = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
         FROM HR_LATE_APPLICATION la
         JOIN HR_EMPLOYEE_SUPERVISOR es
           ON la.PERSON_ID    = es.PERSON_ID
          AND es.SUPERVISOR_ID = :SUPERVISOR_ID
          AND es.STATUS        = 1
         ${whereClause}`,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const total = countResult.rows[0].TOTAL;

    const result = await conn.execute(
      paginateQuery(
        `SELECT ${LATE_SELECT}
           FROM HR_LATE_APPLICATION la
           JOIN HR_EMPLOYEE_SUPERVISOR es
             ON la.PERSON_ID    = es.PERSON_ID
            AND es.SUPERVISOR_ID = :SUPERVISOR_ID
            AND es.STATUS        = 1
           ${LATE_JOINS}
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
//  APPROVE
// ─────────────────────────────────────────────────────────────────────────────

export const approveLateApplication = async (lateId, approverId, notificationId) => {
  const conn = await getConnection();
  try {
    const lateResult = await conn.execute(
      `SELECT la.PERSON_ID, la.STATUS, la.LATE_DATE,
              e.FIRST_NAME, e.LAST_NAME
         FROM HR_LATE_APPLICATION la
         LEFT JOIN HR_EMPLOYEE e ON la.PERSON_ID = e.PERSON_ID
        WHERE la.LATE_ID = :LATE_ID`,
      { LATE_ID: parseInt(lateId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const late = lateResult.rows[0];
    if (!late) throw new Error("Late application not found.");
    if (late.STATUS !== "PENDING") {
      throw new Error(`Late application #${lateId} is already '${late.STATUS}'.`);
    }

    await conn.execute(
      `UPDATE HR_LATE_APPLICATION
          SET STATUS       = 'APPROVED',
              APPROVER_ID  = :APPROVER_ID,
              APPROVED_ON  = SYSTIMESTAMP,
              UPDATED_DATE = SYSTIMESTAMP
        WHERE LATE_ID = :LATE_ID`,
      { LATE_ID: parseInt(lateId), APPROVER_ID: parseInt(approverId) },
    );

    if (notificationId) {
      await conn.execute(
        `UPDATE HR_EMPLOYEE_NOTIFICATION
            SET STATUS = 1, UPDATED_DATE = SYSDATE
          WHERE ID = :ID`,
        { ID: parseInt(notificationId) },
      );
    }

    await conn.execute(
      `INSERT INTO HR_EMPLOYEE_NOTIFICATION
         (EMPLYEE_ID, SUPERVISOR_ID, LATE_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
       VALUES
         (:EMPLOYEE_ID, :SUPERVISOR_ID, :LATE_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
      {
        EMPLOYEE_ID:          late.PERSON_ID,
        SUPERVISOR_ID:        null,
        LATE_ID:              parseInt(lateId),
        NOTIFICATION_DETAILS: `Your late application for ${new Date(late.LATE_DATE).toDateString()} has been approved.`,
        CREATE_BY:            parseInt(approverId),
      },
    );

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    console.error("approveLateApplication error:", err);
    throw err;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  REJECT
// ─────────────────────────────────────────────────────────────────────────────

export const rejectLateApplication = async (lateId, approverId, notificationId, reason) => {
  const conn = await getConnection();
  try {
    const lateResult = await conn.execute(
      `SELECT la.PERSON_ID, la.STATUS, la.LATE_DATE,
              e.FIRST_NAME, e.LAST_NAME
         FROM HR_LATE_APPLICATION la
         LEFT JOIN HR_EMPLOYEE e ON la.PERSON_ID = e.PERSON_ID
        WHERE la.LATE_ID = :LATE_ID`,
      { LATE_ID: parseInt(lateId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const late = lateResult.rows[0];
    if (!late) throw new Error("Late application not found.");
    if (late.STATUS !== "PENDING") {
      throw new Error(`Late application #${lateId} is already '${late.STATUS}'.`);
    }

    await conn.execute(
      `UPDATE HR_LATE_APPLICATION
          SET STATUS       = 'REJECTED',
              APPROVER_ID  = :APPROVER_ID,
              APPROVED_ON  = SYSTIMESTAMP,
              UPDATED_DATE = SYSTIMESTAMP
        WHERE LATE_ID = :LATE_ID`,
      { LATE_ID: parseInt(lateId), APPROVER_ID: parseInt(approverId) },
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
      ? `Your late application for ${new Date(late.LATE_DATE).toDateString()} has been rejected. Reason: ${reason}`
      : `Your late application for ${new Date(late.LATE_DATE).toDateString()} has been rejected.`;

    await conn.execute(
      `INSERT INTO HR_EMPLOYEE_NOTIFICATION
         (EMPLYEE_ID, SUPERVISOR_ID, LATE_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
       VALUES
         (:EMPLOYEE_ID, :SUPERVISOR_ID, :LATE_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
      {
        EMPLOYEE_ID:          late.PERSON_ID,
        SUPERVISOR_ID:        null,
        LATE_ID:              parseInt(lateId),
        NOTIFICATION_DETAILS: rejectMsg,
        CREATE_BY:            parseInt(approverId),
      },
    );

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    console.error("rejectLateApplication error:", err);
    throw err;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE — cancel if still PENDING
// ─────────────────────────────────────────────────────────────────────────────

export const deleteLateApplication = async (lateId) => {
  const conn = await getConnection();
  try {
    const lateResult = await conn.execute(
      `SELECT la.PERSON_ID, la.STATUS, la.LATE_DATE,
              e.FIRST_NAME, e.LAST_NAME
         FROM HR_LATE_APPLICATION la
         LEFT JOIN HR_EMPLOYEE e ON la.PERSON_ID = e.PERSON_ID
        WHERE la.LATE_ID = :LATE_ID`,
      { LATE_ID: parseInt(lateId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const late = lateResult.rows[0];
    if (!late) throw new Error("Late application not found.");
    if (late.STATUS !== "PENDING") {
      throw new Error(`Cannot cancel a late application that is already '${late.STATUS}'.`);
    }

    await conn.execute(
      `DELETE FROM HR_LATE_APPLICATION WHERE LATE_ID = :LATE_ID`,
      { LATE_ID: parseInt(lateId) },
    );

    // Mark supervisor notification as read
    await conn.execute(
      `UPDATE HR_EMPLOYEE_NOTIFICATION
          SET STATUS = 1, UPDATED_DATE = SYSDATE
        WHERE LATE_ID = :LATE_ID AND STATUS = 0`,
      { LATE_ID: parseInt(lateId) },
    );

    // Notify supervisor of cancellation
    const supResult = await conn.execute(
      `SELECT SUPERVISOR_ID FROM HR_EMPLOYEE_SUPERVISOR
        WHERE PERSON_ID = :PERSON_ID AND STATUS = 1`,
      { PERSON_ID: parseInt(late.PERSON_ID) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const supervisorId = supResult.rows[0]?.SUPERVISOR_ID ?? null;

    if (supervisorId) {
      const empName = `${late.FIRST_NAME} ${late.LAST_NAME}`;
      await conn.execute(
        `INSERT INTO HR_EMPLOYEE_NOTIFICATION
           (EMPLYEE_ID, SUPERVISOR_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
         VALUES
           (:EMPLOYEE_ID, :SUPERVISOR_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
        {
          EMPLOYEE_ID:          parseInt(late.PERSON_ID),
          SUPERVISOR_ID:        supervisorId,
          NOTIFICATION_DETAILS: `${empName} has cancelled their late application for ${new Date(late.LATE_DATE).toDateString()}.`,
          CREATE_BY:            parseInt(late.PERSON_ID),
        },
      );
    }

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    console.error("deleteLateApplication error:", err);
    throw err;
  } finally {
    await conn.close();
  }
};