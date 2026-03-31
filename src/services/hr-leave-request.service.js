import { getConnection } from "../config/db.js";
import oracledb from "oracledb";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;



const notifySupervior = async (conn, employeeId, leaveData) => {
  const supResult = await conn.execute(
    `SELECT SUPERVISOR_ID FROM HCM.HR_EMPLOYEE_SUPERVISOR
      WHERE PERSON_ID = :PERSON_ID AND STATUS = 1`,
    { PERSON_ID: parseInt(employeeId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const supervisorId = supResult.rows[0]?.SUPERVISOR_ID ?? null;
  if (!supervisorId) return;

  const empResult = await conn.execute(
    `SELECT FIRST_NAME, LAST_NAME FROM HCM.HR_EMPLOYEE WHERE PERSON_ID = :ID`,
    { ID: parseInt(employeeId) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const emp = empResult.rows[0];
  const empName = emp ? `${emp.FIRST_NAME} ${emp.LAST_NAME}` : `Employee #${employeeId}`;

  await conn.execute(
    `INSERT INTO HCM.HR_EMPLOYEE_NOTIFICATION
       (EMPLYEE_ID, SUPERVISOR_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
     VALUES
       (:EMPLOYEE_ID, :SUPERVISOR_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
    //  ↑ fixed: was EMLYEE_ID
    {
      EMPLOYEE_ID:          parseInt(employeeId),
      SUPERVISOR_ID:        supervisorId,
      NOTIFICATION_DETAILS: `${empName} has requested leave from ${leaveData.start_date} to ${leaveData.end_date} (${leaveData.days ?? "?"} days). Reason: ${leaveData.reason ?? "Not specified"}.`,
      CREATE_BY:            parseInt(employeeId),
      //                    ↑ fixed: was passing string, column is NUMBER
    }
  );
};

// ── CREATE ────────────────────────────────────────────────────────────────────
export const createLeaveService = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO HCM.HR_LEAVE_REQUEST
        (EMPLOYEE_ID, LEAVE_TYPE_ID, START_DATE, END_DATE, DAYS, REASON, CREATED_BY)
       VALUES
        (:employee_id, :leave_type_id, :start_date, :end_date, :days, :reason, :created_by)`,
      {
        ...data,
        start_date: new Date(data.start_date),
        end_date:   new Date(data.end_date),
      }
      // ← no autoCommit here, we commit after notification
    );

    // Auto-notify supervisor
    await notifySupervior(conn, data.employee_id, data);

    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
     console.error("createLeaveService error:", err); // ← add this
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
//        FROM HCM.HR_LEAVE_REQUEST  lr
//        JOIN HCM.HR_LEAVE_TYPE     lt  ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
//        LEFT JOIN HCM.HR_EMPLOYEE  e   ON lr.EMPLOYEE_ID   = e.PERSON_ID
//        ORDER BY lr.LEAVE_ID DESC`
//     );
//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };
export const getAllLeavesService = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
          lr.LEAVE_ID,
          lr.EMPLOYEE_ID,
          e.EMP_NO,
          e.FIRST_NAME,
          e.LAST_NAME,
          e.FIRST_NAME || ' ' || e.LAST_NAME   AS EMPLOYEE_NAME,
          lr.LEAVE_TYPE_ID,
          lt.CODE                               AS LEAVE_TYPE_CODE,
          lt.NAME                               AS LEAVE_TYPE_NAME,
          lr.START_DATE,
          lr.END_DATE,
          lr.DAYS,
          lr.STATUS,
          lr.REASON,
          lr.APPLIED_ON,
          lr.APPROVER_ID,
          u.USERNAME                            AS APPROVER_USERNAME,
          lr.APPROVED_ON,
          lr.UPDATED_BY,
          lr.UPDATED_DATE
       FROM HCM.HR_LEAVE_REQUEST  lr
       JOIN HCM.HR_LEAVE_TYPE     lt  ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
       LEFT JOIN HCM.HR_EMPLOYEE  e   ON lr.EMPLOYEE_ID   = e.PERSON_ID
       LEFT JOIN HCM.USERS        u   ON lr.APPROVER_ID   = u.ID
       ORDER BY lr.LEAVE_ID DESC`
    );
    return result.rows;
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
          e.FIRST_NAME || ' ' || e.LAST_NAME   AS EMPLOYEE_NAME,
          lr.LEAVE_TYPE_ID,
          lt.CODE                               AS LEAVE_TYPE_CODE,
          lt.NAME                               AS LEAVE_TYPE_NAME,
          lr.START_DATE,
          lr.END_DATE,
          lr.DAYS,
          lr.STATUS,
          lr.REASON,
          lr.APPLIED_ON,
          lr.APPROVER_ID,
          u.USERNAME                            AS APPROVER_USERNAME,
          lr.APPROVED_ON,
          lr.UPDATED_BY,
          lr.UPDATED_DATE
       FROM HCM.HR_LEAVE_REQUEST  lr
       JOIN HCM.HR_LEAVE_TYPE     lt  ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
       LEFT JOIN HCM.HR_EMPLOYEE  e   ON lr.EMPLOYEE_ID   = e.PERSON_ID
       LEFT JOIN HCM.USERS        u   ON lr.APPROVER_ID   = u.ID
       WHERE lr.LEAVE_ID = :id`,
      { id }
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
//        FROM HCM.HR_LEAVE_REQUEST  lr
//        JOIN HCM.HR_LEAVE_TYPE     lt  ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
//        LEFT JOIN HCM.HR_EMPLOYEE  e   ON lr.EMPLOYEE_ID   = e.PERSON_ID
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
//       `UPDATE HCM.HR_LEAVE_REQUEST
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
//       `UPDATE HCM.HR_LEAVE_REQUEST
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
      `UPDATE HCM.HR_LEAVE_REQUEST
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
        id:            Number(id),
        employee_id:   data.employee_id,
        leave_type_id: data.leave_type_id,
        start_date:    new Date(data.start_date),
        end_date:      new Date(data.end_date),
        days:          data.days ?? null,
        reason:        data.reason ?? null,
        status:        data.status,
        approver_id:   isApproved ? (data.approver_id ?? null) : null,
        approved_on:   isApproved ? new Date() : null,
        updated_by:    data.updated_by ?? null,  // ← USERNAME আসবে এখানে
      },
      { autoCommit: true }
    );
    return result;
  } finally {
    await conn.close();
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
export const deleteLeaveService = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM HCM.HR_LEAVE_REQUEST WHERE LEAVE_ID = :id`,
      { id },
      { autoCommit: true }
    );
    return result;
  } finally {
    await conn.close();
  }
};







