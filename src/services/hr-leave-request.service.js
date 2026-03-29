import { getConnection } from "../config/db.js";
import oracledb from "oracledb";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

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
      },
      { autoCommit: true }
    );
    return result;
  } finally {
    await conn.close();
  }
};

// ── GET ALL ───────────────────────────────────────────────────────────────────
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
          lr.APPLIED_ON
       FROM HCM.HR_LEAVE_REQUEST  lr
       JOIN HCM.HR_LEAVE_TYPE     lt  ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
       LEFT JOIN HCM.HR_EMPLOYEE  e   ON lr.EMPLOYEE_ID   = e.PERSON_ID
       ORDER BY lr.LEAVE_ID DESC`
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ── GET SINGLE ────────────────────────────────────────────────────────────────
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
          lr.APPLIED_ON
       FROM HCM.HR_LEAVE_REQUEST  lr
       JOIN HCM.HR_LEAVE_TYPE     lt  ON lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
       LEFT JOIN HCM.HR_EMPLOYEE  e   ON lr.EMPLOYEE_ID   = e.PERSON_ID
       WHERE lr.LEAVE_ID = :id`,
      { id }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
export const updateLeaveService = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HCM.HR_LEAVE_REQUEST
       SET START_DATE   = :start_date,
           END_DATE     = :end_date,
           DAYS         = :days,
           REASON       = :reason,
           STATUS       = :status,
           UPDATED_BY   = :updated_by,
           UPDATED_DATE = SYSTIMESTAMP
       WHERE LEAVE_ID = :id`,
      {
        ...data,
        id,
        start_date: new Date(data.start_date),
        end_date:   new Date(data.end_date),
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