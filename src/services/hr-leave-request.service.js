// ─────────────────────────────────────────────────────────────────────────────
//  LEAVE REQUEST SERVICE — TODO
// ─────────────────────────────────────────────────────────────────────────────

// ── MISSING CORE FEATURES ─────────────────────────────────────────────────────

// ── LEAVE BALANCE ─────────────────────────────────────────────────────────────

// TODO: getLeaveBalance
//       — returns remaining leave days per employee per leave type
//       — formula: allocated days - approved days used in current year
//       — critical for ESS: employee sees balance before applying
//       — needed for payroll: leave encashment calculation

// TODO: checkLeaveBalanceBeforeApply
//       — validation inside createLeaveService before inserting
//       — if requested days > remaining balance, reject with meaningful error
//       — currently createLeaveService inserts without any balance check

// ── FILTERING & PAGINATION ────────────────────────────────────────────────────

// TODO: getAllLeavesService needs pagination + filters
//       — currently returns ALL rows with no limit (will be slow with 1000 employees)
//       — add: page, limit, fromDate, toDate, employeeId, status, leaveTypeId filters
//       — same pattern as getAttendanceList

// TODO: getPendingLeaves
//       — quick filter for dashboard pending approvals count
//       — used in Dashboard KPI: "X leave requests pending approval"

// ── REPORTS ───────────────────────────────────────────────────────────────────

// TODO: getLeaveReport
//       — monthly/yearly leave summary per employee
//       — columns: employee, leave type, total days taken, balance remaining
//       — needed for Reports module (REP_GENERATE)

// TODO: getLeaveAbsenteeismTrend
//       — how many leaves per month across the organization
//       — used in HR Analytics Dashboard (REP_ANALYTICS)

import { getConnection } from "../config/db.js";
import oracledb from "oracledb";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const notifySupervior = async (conn, employeeId, leaveData) => {
  const supResult = await conn.execute(
    `SELECT SUPERVISOR_ID FROM HR_EMPLOYEE_SUPERVISOR
      WHERE PERSON_ID = :PERSON_ID AND STATUS = 1`,
    { PERSON_ID: parseInt(employeeId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const supervisorId = supResult.rows[0]?.SUPERVISOR_ID ?? null;
  if (!supervisorId) return;

  const empResult = await conn.execute(
    `SELECT FIRST_NAME, LAST_NAME FROM HR_EMPLOYEE WHERE PERSON_ID = :ID`,
    { ID: parseInt(employeeId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  const emp = empResult.rows[0];
  const empName = emp
    ? `${emp.FIRST_NAME} ${emp.LAST_NAME}`
    : `Employee #${employeeId}`;

  await conn.execute(
    `INSERT INTO HR_EMPLOYEE_NOTIFICATION
       (EMPLYEE_ID, SUPERVISOR_ID, LEAVE_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
     VALUES
       (:EMPLOYEE_ID, :SUPERVISOR_ID, :LEAVE_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
    {
      EMPLOYEE_ID: parseInt(employeeId),
      SUPERVISOR_ID: supervisorId,
      LEAVE_ID: parseInt(leaveData.leave_id), // ← new
      NOTIFICATION_DETAILS: `${empName} has requested leave from ${leaveData.start_date} to ${leaveData.end_date} (${leaveData.days ?? "?"} days). Reason: ${leaveData.reason ?? "Not specified"}.`,
      CREATE_BY: parseInt(employeeId),
    },
  );
};

// ── CREATE ────────────────────────────────────────────────────────────────────
export const createLeaveService = async (data) => {
  const conn = await getConnection();
  try {
    const isAdminHR = data.status === "APPROVED"; // Admin/HR always creates as APPROVED

    const result = await conn.execute(
      `INSERT INTO HR_LEAVE_REQUEST
        (EMPLOYEE_ID, LEAVE_TYPE_ID, START_DATE, END_DATE, DAYS, REASON,
         STATUS, APPROVER_ID, APPROVED_ON, CREATED_BY)
       VALUES
        (:employee_id, :leave_type_id, :start_date, :end_date, :days, :reason,
         :status, :approver_id, :approved_on, :created_by)
       RETURNING LEAVE_ID INTO :leave_id`,
      {
        employee_id: data.employee_id,
        leave_type_id: data.leave_type_id,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        days: data.days,
        reason: data.reason,
        status: data.status ?? "PENDING",
        approver_id: data.approver_id ?? null,
        approved_on: isAdminHR ? new Date() : null,
        created_by: data.created_by,
        leave_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
    );

    const newLeaveId = result.outBinds.leave_id[0];

    // Only notify supervisor if PENDING — Admin/HR created leaves skip this
    if (!isAdminHR) {
      await notifySupervior(conn, data.employee_id, {
        ...data,
        leave_id: newLeaveId,
      });
    }

    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    console.error("createLeaveService error:", err);
    throw err;
  } finally {
    await conn.close();
  }
};

// ── GET ALL ───────────────────────────────────────────────────────────────────
// export const getAllLeavesService = async () => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//           lr.LEAVE_ID,
//           lr.EMPLOYEE_ID,
//           e.EMP_NO,
//           e.FIRST_NAME,
//           e.LAST_NAME,
//           e.FIRST_NAME || ' ' || e.LAST_NAME   AS EMPLOYEE_NAME,
//           lr.LEAVE_TYPE_ID,
//           lt.CODE                               AS LEAVE_TYPE_CODE,
//           lt.NAME                               AS LEAVE_TYPE_NAME,
//           lr.START_DATE,
//           lr.END_DATE,
//           lr.DAYS,
//           lr.STATUS,
//           lr.REASON,
//           lr.APPLIED_ON
//        FROM HR_LEAVE_REQUEST  lr
//        JOIN HR_LEAVE_TYPE     lt  ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
//        LEFT JOIN HR_EMPLOYEE  e   ON lr.EMPLOYEE_ID   = e.PERSON_ID
//        ORDER BY lr.LEAVE_ID DESC`
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };

// Whitelist: frontend column key → Oracle expression (prevents SQL injection)
const ALLOWED_SORT_COLUMNS = {
  LEAVE_ID: "lr.LEAVE_ID",
  START_DATE: "lr.START_DATE",
  APPLIED_ON: "lr.APPLIED_ON",
  FIRST_NAME: "e.FIRST_NAME",
};

export const getAllLeavesService = async ({
  page = 1,
  limit = 20,
  fromDate = "",
  toDate = "",
  employeeId = "",
  status = "",
  leaveTypeId = "",
  sortBy = "LEAVE_ID",
  sortOrder = "DESC",
} = {}) => {
  const conn = await getConnection();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);
  const rownumMin = (pageNum - 1) * limitNum + 1;
  const rownumMax = pageNum * limitNum;

  const orderCol = ALLOWED_SORT_COLUMNS[sortBy] ?? "lr.LEAVE_ID";
  const orderDir = sortOrder === "ASC" ? "ASC" : "DESC";

  const conditions = [];
  const bindParams = {};

  if (fromDate && toDate) {
    conditions.push(
      `lr.START_DATE BETWEEN TO_DATE(:FROM_DATE, 'YYYY-MM-DD') AND TO_DATE(:TO_DATE, 'YYYY-MM-DD')`,
    );
    bindParams.FROM_DATE = fromDate;
    bindParams.TO_DATE = toDate;
  }
  if (employeeId && employeeId !== "") {
    conditions.push(`lr.EMPLOYEE_ID = :EMPLOYEE_ID`);
    bindParams.EMPLOYEE_ID = parseInt(employeeId, 10);
  }
  if (status && status.trim()) {
    conditions.push(`lr.STATUS = :STATUS`);
    bindParams.STATUS = status.trim().toUpperCase();
  }
  if (leaveTypeId && leaveTypeId !== "") {
    conditions.push(`lr.LEAVE_TYPE_ID = :LEAVE_TYPE_ID`);
    bindParams.LEAVE_TYPE_ID = parseInt(leaveTypeId, 10);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join("\n      AND ")}` : "";

  try {
    const countResult = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
         FROM HR_LEAVE_REQUEST  lr
         JOIN HR_LEAVE_TYPE     lt  ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
         LEFT JOIN HR_EMPLOYEE  e   ON lr.EMPLOYEE_ID   = e.PERSON_ID
         ${whereClause}`,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const total = countResult.rows[0].TOTAL;

    const result = await conn.execute(
      `SELECT * FROM (
        SELECT ROWNUM AS RN, sq.* FROM (
          SELECT
            lr.LEAVE_ID,
            lr.EMPLOYEE_ID,
            e.EMP_NO,
            e.FIRST_NAME,
            e.LAST_NAME,
            TRIM(NVL(e.FIRST_NAME, '') || ' ' || NVL(e.LAST_NAME, ''))    AS EMPLOYEE_NAME,
            lr.LEAVE_TYPE_ID,
            lt.CODE                                                         AS LEAVE_TYPE_CODE,
            lt.NAME                                                         AS LEAVE_TYPE_NAME,
            lr.START_DATE,
            lr.END_DATE,
            lr.DAYS,
            lr.STATUS,
            lr.REASON,
            lr.APPLIED_ON,
            lr.APPROVER_ID,
            COALESCE(
              NULLIF(TRIM(NVL(approver.FIRST_NAME, '') || ' ' || NVL(approver.LAST_NAME, '')), ''),
              au.USERNAME
            )                                                               AS APPROVER_NAME,
           CASE WHEN approver.PERSON_ID IS NOT NULL THEN approver.EMP_NO ELSE NULL END AS APPROVER_EMP_NO,
            lr.APPROVED_ON,
            lr.UPDATED_BY,
            lr.UPDATED_DATE
          FROM HR_LEAVE_REQUEST  lr
          JOIN HR_LEAVE_TYPE     lt       ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
          LEFT JOIN HR_EMPLOYEE  e        ON lr.EMPLOYEE_ID   = e.PERSON_ID
          LEFT JOIN HR_EMPLOYEE  approver ON lr.APPROVER_ID   = approver.PERSON_ID
          LEFT JOIN USERS au ON lr.APPROVER_ID = au.ID
          ${whereClause}
          ORDER BY ${orderCol} ${orderDir}
        ) sq WHERE ROWNUM <= ${rownumMax}
      ) WHERE RN >= ${rownumMin}`,
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

export const getLeaveByIdService = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
          lr.LEAVE_ID,
          lr.EMPLOYEE_ID,
          e.EMP_NO,
          e.FIRST_NAME,
          e.LAST_NAME,
          TRIM(NVL(e.FIRST_NAME, '') || ' ' || NVL(e.LAST_NAME, ''))    AS EMPLOYEE_NAME,
          lr.LEAVE_TYPE_ID,
          lt.CODE                                                         AS LEAVE_TYPE_CODE,
          lt.NAME                                                         AS LEAVE_TYPE_NAME,
          lr.START_DATE,
          lr.END_DATE,
          lr.DAYS,
          lr.STATUS,
          lr.REASON,
          lr.APPLIED_ON,
          lr.APPROVER_ID,
          COALESCE(
            NULLIF(TRIM(NVL(approver.FIRST_NAME, '') || ' ' || NVL(approver.LAST_NAME, '')), ''),
            au.USERNAME
          )                                                               AS APPROVER_NAME,
          CASE WHEN approver.PERSON_ID IS NOT NULL THEN approver.EMP_NO ELSE NULL END AS APPROVER_EMP_NO,
          lr.APPROVED_ON,
          lr.UPDATED_BY,
          lr.UPDATED_DATE
       FROM HR_LEAVE_REQUEST  lr
       JOIN HR_LEAVE_TYPE     lt       ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
       LEFT JOIN HR_EMPLOYEE  e        ON lr.EMPLOYEE_ID   = e.PERSON_ID
       LEFT JOIN HR_EMPLOYEE  approver ON lr.APPROVER_ID   = approver.PERSON_ID
       LEFT JOIN USERS au ON lr.APPROVER_ID = au.ID
       WHERE lr.LEAVE_ID = :id`,
      { id },
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

// ── GET SINGLE ────────────────────────────────────────────────────────────────
// export const getLeaveByIdService = async (id) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `SELECT
//           lr.LEAVE_ID,
//           lr.EMPLOYEE_ID,
//           e.EMP_NO,
//           e.FIRST_NAME,
//           e.LAST_NAME,
//           e.FIRST_NAME || ' ' || e.LAST_NAME   AS EMPLOYEE_NAME,
//           lr.LEAVE_TYPE_ID,
//           lt.CODE                               AS LEAVE_TYPE_CODE,
//           lt.NAME                               AS LEAVE_TYPE_NAME,
//           lr.START_DATE,
//           lr.END_DATE,
//           lr.DAYS,
//           lr.STATUS,
//           lr.REASON,
//           lr.APPLIED_ON
//        FROM HR_LEAVE_REQUEST  lr
//        JOIN HR_LEAVE_TYPE     lt  ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
//        LEFT JOIN HR_EMPLOYEE  e   ON lr.EMPLOYEE_ID   = e.PERSON_ID
//        WHERE lr.LEAVE_ID = :id`,
//       { id }
//     );
//     return result.rows[0] ?? null;
//   } finally {
//     await conn.close();
//   }
// };

// ── UPDATE ────────────────────────────────────────────────────────────────────
// export const updateLeaveService = async (id, data) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `UPDATE HR_LEAVE_REQUEST
//        SET START_DATE   = :start_date,
//            END_DATE     = :end_date,
//            DAYS         = :days,
//            REASON       = :reason,
//            STATUS       = :status,
//            UPDATED_BY   = :updated_by,
//            UPDATED_DATE = SYSTIMESTAMP
//        WHERE LEAVE_ID = :id`,
//       {
//         ...data,
//         id,
//         start_date: new Date(data.start_date),
//         end_date:   new Date(data.end_date),
//       },
//       { autoCommit: true }
//     );
//     return result;
//   } finally {
//     await conn.close();
//   }
// };

// export const updateLeaveService = async (id, data) => {
//   const conn = await getConnection();
//   try {
//     const isApproved = data.status === "APPROVED";

//     const result = await conn.execute(
//       `UPDATE HR_LEAVE_REQUEST
//        SET EMPLOYEE_ID   = :employee_id,
//            LEAVE_TYPE_ID = :leave_type_id,
//            START_DATE    = :start_date,
//            END_DATE      = :end_date,
//            DAYS          = :days,
//            REASON        = :reason,
//            STATUS        = :status,
//            APPROVER_ID   = :approver_id,
//            APPROVED_ON   = :approved_on,
//            UPDATED_BY    = :updated_by,
//            UPDATED_DATE  = SYSTIMESTAMP
//        WHERE LEAVE_ID = :id`,
//       {
//         id:            Number(id),
//         employee_id:   data.employee_id,
//         leave_type_id: data.leave_type_id,
//         start_date:    new Date(data.start_date),
//         end_date:      new Date(data.end_date),
//         days:          data.days ?? null,
//         reason:        data.reason ?? null,
//         status:        data.status,
//         approver_id:   isApproved ? (data.approver_id ?? null) : null,
//         approved_on:   isApproved ? new Date() : null,
//         updated_by:    data.updated_by ?? "SYSTEM",
//       },
//       { autoCommit: true }
//     );
//     return result;
//   } finally {
//     await conn.close();
//   }
// };

export const updateLeaveService = async (id, data) => {
  const conn = await getConnection();
  try {
    const isApproved = data.status === "APPROVED";

    const result = await conn.execute(
      `UPDATE HR_LEAVE_REQUEST
       SET EMPLOYEE_ID   = :employee_id,
           LEAVE_TYPE_ID = :leave_type_id,
           START_DATE    = :start_date,
           END_DATE      = :end_date,
           DAYS          = :days,
           REASON        = :reason,
           STATUS        = :status,
           APPROVER_ID   = :approver_id,
           APPROVED_ON   = :approved_on,
           UPDATED_BY    = :updated_by,
           UPDATED_DATE  = SYSTIMESTAMP
       WHERE LEAVE_ID = :id`,
      {
        id: Number(id),
        employee_id: data.employee_id,
        leave_type_id: data.leave_type_id,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        days: data.days ?? null,
        reason: data.reason ?? null,
        status: data.status,
        approver_id: isApproved ? (data.approver_id ?? null) : null,
        approved_on: isApproved ? new Date() : null,
        updated_by: data.updated_by ?? null, // ← USERNAME আসবে এখানে
      },
      { autoCommit: true },
    );
    return result;
  } finally {
    await conn.close();
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
export const deleteLeaveService = async (id, employeeId) => {
  const conn = await getConnection();
  try {
    // 1. Get leave details before deleting
    const leaveResult = await conn.execute(
      `SELECT lr.EMPLOYEE_ID, lr.STATUS, lr.START_DATE, lr.END_DATE, lr.DAYS,
              lt.NAME AS LEAVE_TYPE_NAME,
              e.FIRST_NAME, e.LAST_NAME
         FROM HR_LEAVE_REQUEST lr
         LEFT JOIN HR_LEAVE_TYPE lt ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
         LEFT JOIN HR_EMPLOYEE   e  ON lr.EMPLOYEE_ID   = e.PERSON_ID
        WHERE lr.LEAVE_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const leave = leaveResult.rows[0];
    if (!leave) throw new Error("Leave request not found");

    // 2. Only allow deletion if still PENDING
    if (leave.STATUS !== "PENDING") {
      throw new Error(
        `Cannot delete a leave that is already '${leave.STATUS}'.`,
      );
    }

    // 3. Delete the leave
    await conn.execute(
      `DELETE FROM HR_LEAVE_REQUEST WHERE LEAVE_ID = :id`,
      { id },
    );

    // 4. Mark existing supervisor notification as read (clean up the bell)
    await conn.execute(
      `UPDATE HR_EMPLOYEE_NOTIFICATION
      SET STATUS = 1, UPDATED_DATE = SYSDATE
    WHERE LEAVE_ID = :LEAVE_ID
      AND STATUS = 0`,
      { LEAVE_ID: parseInt(id) }, // ← precise, targets only this leave's notification
    );

    // 5. Notify supervisor that the leave was cancelled
    const supResult = await conn.execute(
      `SELECT SUPERVISOR_ID FROM HR_EMPLOYEE_SUPERVISOR
        WHERE PERSON_ID = :PERSON_ID AND STATUS = 1`,
      { PERSON_ID: parseInt(leave.EMPLOYEE_ID) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const supervisorId = supResult.rows[0]?.SUPERVISOR_ID ?? null;

    if (supervisorId) {
      const empName = `${leave.FIRST_NAME} ${leave.LAST_NAME}`;
      await conn.execute(
        `INSERT INTO HR_EMPLOYEE_NOTIFICATION
           (EMPLYEE_ID, SUPERVISOR_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
         VALUES
           (:EMPLOYEE_ID, :SUPERVISOR_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
        {
          EMPLOYEE_ID: parseInt(leave.EMPLOYEE_ID),
          SUPERVISOR_ID: supervisorId,
          NOTIFICATION_DETAILS: `${empName} has cancelled their ${leave.LEAVE_TYPE_NAME} leave request from ${new Date(leave.START_DATE).toDateString()} to ${new Date(leave.END_DATE).toDateString()}.`,
          CREATE_BY: parseInt(leave.EMPLOYEE_ID),
        },
      );
    }

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    console.error("deleteLeaveService error:", err);
    throw err;
  } finally {
    await conn.close();
  }
};

// ── 1. getLeavesByEmployeeId ──────────────────────────────────────────────────
//
//  Employee views their own leave history (ESS portal / mobile app).
//  Optional `status` filter accepts: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
//  If status is omitted / null, all records are returned.
//
export const getLeavesByEmployeeId = async (employeeId, status = null) => {
  const conn = await getConnection();
  try {
    const hasStatusFilter = Boolean(status);

    const result = await conn.execute(
      `SELECT
          lr.LEAVE_ID,
          lr.EMPLOYEE_ID,
          e.EMP_NO,
          TRIM(NVL(e.FIRST_NAME, '') || ' ' || NVL(e.LAST_NAME, ''))    AS EMPLOYEE_NAME,
          lr.LEAVE_TYPE_ID,
          lt.CODE                                                         AS LEAVE_TYPE_CODE,
          lt.NAME                                                         AS LEAVE_TYPE_NAME,
          lr.START_DATE,
          lr.END_DATE,
          lr.DAYS,
          lr.STATUS,
          lr.REASON,
          lr.APPLIED_ON,
          lr.APPROVER_ID,
          COALESCE(
            NULLIF(TRIM(NVL(approver.FIRST_NAME, '') || ' ' || NVL(approver.LAST_NAME, '')), ''),
            au.USERNAME
          )                                                               AS APPROVER_NAME,
          CASE WHEN approver.PERSON_ID IS NOT NULL THEN approver.EMP_NO ELSE NULL END AS APPROVER_EMP_NO,
          lr.APPROVED_ON
       FROM HR_LEAVE_REQUEST  lr
       JOIN HR_LEAVE_TYPE     lt       ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
       LEFT JOIN HR_EMPLOYEE  e        ON lr.EMPLOYEE_ID   = e.PERSON_ID
       LEFT JOIN HR_EMPLOYEE  approver ON lr.APPROVER_ID   = approver.PERSON_ID
       LEFT JOIN USERS au ON lr.APPROVER_ID = au.ID
       WHERE lr.EMPLOYEE_ID = :employee_id
         ${hasStatusFilter ? "AND lr.STATUS = :status" : ""}
       ORDER BY lr.LEAVE_ID DESC`,
      hasStatusFilter
        ? { employee_id: parseInt(employeeId), status: status.toUpperCase() }
        : { employee_id: parseInt(employeeId) },
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ── 2. getLeavesByTeam ────────────────────────────────────────────────────────
//
//  Supervisor sees all leave requests from their direct team only.
//  Joins HR_EMPLOYEE_SUPERVISOR to enforce the team boundary.
//  Optional `status` filter same as above.
//  Used in MSS portal and the Notifications screen.
//
export const getLeavesByTeam = async (supervisorId, status = null) => {
  const conn = await getConnection();
  try {
    const hasStatusFilter = Boolean(status);

    const result = await conn.execute(
      `SELECT
          lr.LEAVE_ID,
          lr.EMPLOYEE_ID,
          e.EMP_NO,
          TRIM(NVL(e.FIRST_NAME, '') || ' ' || NVL(e.LAST_NAME, ''))    AS EMPLOYEE_NAME,
          lr.LEAVE_TYPE_ID,
          lt.CODE                                                         AS LEAVE_TYPE_CODE,
          lt.NAME                                                         AS LEAVE_TYPE_NAME,
          lr.START_DATE,
          lr.END_DATE,
          lr.DAYS,
          lr.STATUS,
          lr.REASON,
          lr.APPLIED_ON,
          lr.APPROVER_ID,
          COALESCE(
            NULLIF(TRIM(NVL(approver.FIRST_NAME, '') || ' ' || NVL(approver.LAST_NAME, '')), ''),
            au.USERNAME
          )                                                               AS APPROVER_NAME,
          CASE WHEN approver.PERSON_ID IS NOT NULL THEN approver.EMP_NO ELSE NULL END AS APPROVER_EMP_NO,
          lr.APPROVED_ON
       FROM HR_LEAVE_REQUEST      lr
       JOIN HR_LEAVE_TYPE         lt       ON lr.LEAVE_TYPE_ID  = lt.LEAVE_TYPE_ID
       JOIN HR_EMPLOYEE_SUPERVISOR es       ON lr.EMPLOYEE_ID   = es.PERSON_ID
                                              AND es.SUPERVISOR_ID  = :supervisor_id
                                              AND es.STATUS         = 1
       LEFT JOIN HR_EMPLOYEE      e        ON lr.EMPLOYEE_ID    = e.PERSON_ID
       LEFT JOIN HR_EMPLOYEE      approver ON lr.APPROVER_ID    = approver.PERSON_ID
       LEFT JOIN USERS au ON lr.APPROVER_ID = au.ID
       ${hasStatusFilter ? "WHERE lr.STATUS = :status" : ""}
       ORDER BY lr.APPLIED_ON DESC`,
      hasStatusFilter
        ? {
            supervisor_id: parseInt(supervisorId),
            status: status.toUpperCase(),
          }
        : { supervisor_id: parseInt(supervisorId) },
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};
