import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";

/* CREATE NOTIFICATION — internal helper used by other services */
export const createNotification = async (conn, data) => {
  await conn.execute(
    `INSERT INTO HCM.HR_EMPLOYEE_NOTIFICATION
       (EMPLYEE_ID, SUPERVISOR_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
     VALUES
       (:EMPLOYEE_ID, :SUPERVISOR_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
    {
      EMPLOYEE_ID:           data.EMPLOYEE_ID           ?? null,
      SUPERVISOR_ID:         data.SUPERVISOR_ID         ?? null,
      NOTIFICATION_DETAILS:  data.NOTIFICATION_DETAILS,
      CREATE_BY:             data.CREATE_BY             ?? null,
    }
  );
};

/* GET NOTIFICATIONS FOR SUPERVISOR */
export const getNotificationsForSupervisor = async (supervisorId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         n.ID,
         n.EMPLYEE_ID         AS EMPLOYEE_ID,
         n.SUPERVISOR_ID,
         n.NOTIFICATION_DETAILS,
         n.STATUS,
         n.CREATED_DATE,
         n.UPDATED_DATE,
         e.FIRST_NAME,
         e.LAST_NAME,
         e.EMP_NO,
         e.TITLE,
         lr.LEAVE_ID,
         lr.START_DATE,
         lr.END_DATE,
         lr.DAYS,
         lr.REASON,
         lr.STATUS           AS LEAVE_STATUS,
         lt.NAME             AS LEAVE_TYPE_NAME
       FROM HCM.HR_EMPLOYEE_NOTIFICATION n
       LEFT JOIN HCM.HR_EMPLOYEE         e  ON n.EMPLYEE_ID     = e.PERSON_ID
       LEFT JOIN HCM.HR_LEAVE_REQUEST    lr ON e.PERSON_ID      = lr.EMPLOYEE_ID
                                            AND lr.STATUS        = 'PENDING'
       LEFT JOIN HCM.HR_LEAVE_TYPE       lt ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
       WHERE n.SUPERVISOR_ID = :SUPERVISOR_ID
       ORDER BY n.CREATED_DATE DESC`,
      { SUPERVISOR_ID: parseInt(supervisorId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } catch (err) {
    console.error("getNotificationsForSupervisor error:", err);
    throw err;
  } finally {
    await conn.close();
  }
};

/* GET NOTIFICATIONS FOR EMPLOYEE */
export const getNotificationsForEmployee = async (employeeId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         n.ID,
         n.EMPLYEE_ID         AS EMPLOYEE_ID,
         n.SUPERVISOR_ID,
         n.NOTIFICATION_DETAILS,
         n.STATUS,
         n.CREATED_DATE,
         n.UPDATED_DATE,
         s.FIRST_NAME        AS SUP_FIRST_NAME,
         s.LAST_NAME         AS SUP_LAST_NAME
       FROM HCM.HR_EMPLOYEE_NOTIFICATION n
       LEFT JOIN HCM.HR_EMPLOYEE s ON n.SUPERVISOR_ID = s.PERSON_ID
       WHERE n.EMPLYEE_ID = :EMPLOYEE_ID
       ORDER BY n.CREATED_DATE DESC`,
      { EMPLOYEE_ID: parseInt(employeeId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } catch (err) {
    console.error("getNotificationsForEmployee error:", err);
    throw err;
  } finally {
    await conn.close();
  }
};

/* GET UNREAD COUNT */
export const getUnreadCount = async (supervisorId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT COUNT(*) AS UNREAD_COUNT
         FROM HCM.HR_EMPLOYEE_NOTIFICATION
        WHERE SUPERVISOR_ID = :SUPERVISOR_ID AND STATUS = 0`,
      { SUPERVISOR_ID: parseInt(supervisorId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0].UNREAD_COUNT;
  } finally {
    await conn.close();
  }
};

/* MARK AS READ */
export const markAsRead = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HCM.HR_EMPLOYEE_NOTIFICATION
          SET STATUS = 1, UPDATED_DATE = SYSDATE
        WHERE ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

/* MARK ALL AS READ for supervisor */
export const markAllAsRead = async (supervisorId) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE HCM.HR_EMPLOYEE_NOTIFICATION
          SET STATUS = 1, UPDATED_DATE = SYSDATE
        WHERE SUPERVISOR_ID = :SUPERVISOR_ID AND STATUS = 0`,
      { SUPERVISOR_ID: parseInt(supervisorId) },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/* APPROVE LEAVE — updates leave + marks notification read + notifies employee */
export const approveLeave = async (leaveId, approverId, notificationId) => {
  const conn = await getConnection();
  try {
    const leaveResult = await conn.execute(
      `SELECT lr.EMPLOYEE_ID, e.FIRST_NAME, e.LAST_NAME,
              lt.NAME AS LEAVE_TYPE_NAME,
              lr.START_DATE, lr.END_DATE, lr.DAYS
         FROM HCM.HR_LEAVE_REQUEST lr
         LEFT JOIN HCM.HR_EMPLOYEE   e  ON lr.EMPLOYEE_ID   = e.PERSON_ID
         LEFT JOIN HCM.HR_LEAVE_TYPE lt ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
        WHERE lr.LEAVE_ID = :LEAVE_ID`,
      { LEAVE_ID: parseInt(leaveId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const leave = leaveResult.rows[0];
    if (!leave) throw new Error("Leave request not found");

    await conn.execute(
      `UPDATE HCM.HR_LEAVE_REQUEST
          SET STATUS       = 'APPROVED',
              APPROVER_ID  = :APPROVER_ID,
              APPROVED_ON  = SYSTIMESTAMP,
              UPDATED_DATE = SYSTIMESTAMP
        WHERE LEAVE_ID = :LEAVE_ID`,
      { LEAVE_ID: parseInt(leaveId), APPROVER_ID: parseInt(approverId) }
    );

    if (notificationId) {
      await conn.execute(
        `UPDATE HCM.HR_EMPLOYEE_NOTIFICATION
            SET STATUS = 1, UPDATED_DATE = SYSDATE
          WHERE ID = :ID`,
        { ID: parseInt(notificationId) }
      );
    }

    await conn.execute(
      `INSERT INTO HCM.HR_EMPLOYEE_NOTIFICATION
         (EMPLYEE_ID, SUPERVISOR_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
       VALUES
         (:EMPLOYEE_ID, :SUPERVISOR_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
      {
        EMPLOYEE_ID:          leave.EMPLOYEE_ID,
        SUPERVISOR_ID:        parseInt(approverId),
        NOTIFICATION_DETAILS: `Your ${leave.LEAVE_TYPE_NAME} leave request from ${new Date(leave.START_DATE).toDateString()} to ${new Date(leave.END_DATE).toDateString()} (${leave.DAYS} days) has been approved.`,
        CREATE_BY:            parseInt(approverId),
      }
    );

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

/* REJECT LEAVE */
export const rejectLeave = async (leaveId, approverId, notificationId, reason) => {
  const conn = await getConnection();
  try {
    const leaveResult = await conn.execute(
      `SELECT lr.EMPLOYEE_ID, e.FIRST_NAME, e.LAST_NAME,
              lt.NAME AS LEAVE_TYPE_NAME,
              lr.START_DATE, lr.END_DATE, lr.DAYS
         FROM HCM.HR_LEAVE_REQUEST lr
         LEFT JOIN HCM.HR_EMPLOYEE   e  ON lr.EMPLOYEE_ID   = e.PERSON_ID
         LEFT JOIN HCM.HR_LEAVE_TYPE lt ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
        WHERE lr.LEAVE_ID = :LEAVE_ID`,
      { LEAVE_ID: parseInt(leaveId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const leave = leaveResult.rows[0];
    if (!leave) throw new Error("Leave request not found");

    await conn.execute(
      `UPDATE HCM.HR_LEAVE_REQUEST
          SET STATUS       = 'REJECTED',
              APPROVER_ID  = :APPROVER_ID,
              APPROVED_ON  = SYSTIMESTAMP,
              UPDATED_DATE = SYSTIMESTAMP
        WHERE LEAVE_ID = :LEAVE_ID`,
      { LEAVE_ID: parseInt(leaveId), APPROVER_ID: parseInt(approverId) }
    );

    if (notificationId) {
      await conn.execute(
        `UPDATE HCM.HR_EMPLOYEE_NOTIFICATION
            SET STATUS = 1, UPDATED_DATE = SYSDATE
          WHERE ID = :ID`,
        { ID: parseInt(notificationId) }
      );
    }

    const rejectMsg = reason
      ? `Your ${leave.LEAVE_TYPE_NAME} leave request has been rejected. Reason: ${reason}`
      : `Your ${leave.LEAVE_TYPE_NAME} leave request from ${new Date(leave.START_DATE).toDateString()} to ${new Date(leave.END_DATE).toDateString()} has been rejected.`;

    await conn.execute(
      `INSERT INTO HCM.HR_EMPLOYEE_NOTIFICATION
         (EMPLYEE_ID, SUPERVISOR_ID, NOTIFICATION_DETAILS, STATUS, CREATE_BY, CREATED_DATE)
       VALUES
         (:EMPLOYEE_ID, :SUPERVISOR_ID, :NOTIFICATION_DETAILS, 0, :CREATE_BY, SYSDATE)`,
      {
        EMPLOYEE_ID:          leave.EMPLOYEE_ID,
        SUPERVISOR_ID:        parseInt(approverId),
        NOTIFICATION_DETAILS: rejectMsg,
        CREATE_BY:            parseInt(approverId),
      }
    );

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};