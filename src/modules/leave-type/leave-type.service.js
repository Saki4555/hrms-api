import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";

/* CREATE */
export const createLeaveType = async (data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO HCM.HR_LEAVE_TYPE (CODE, NAME, ACCRUAL_POLICY, MAX_BALANCE, CREATED_BY, CREATED_DATE)
       VALUES (:CODE, :NAME, :ACCRUAL_POLICY, :MAX_BALANCE, :CREATED_BY, SYSTIMESTAMP)`,
      {
        CODE:           data.CODE,
        NAME:           data.NAME,
        ACCRUAL_POLICY: data.ACCRUAL_POLICY ?? null,
        MAX_BALANCE:    data.MAX_BALANCE    ?? null,
        CREATED_BY:     data.CREATED_BY     ?? null,
      },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/* GET ALL */
export const getAllLeaveTypes = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM HCM.HR_LEAVE_TYPE ORDER BY LEAVE_TYPE_ID DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

/* GET BY ID */
export const getLeaveTypeById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM HCM.HR_LEAVE_TYPE WHERE LEAVE_TYPE_ID = :id`,
      { id: parseInt(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

/* UPDATE */
export const updateLeaveType = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HCM.HR_LEAVE_TYPE
          SET CODE           = :CODE,
              NAME           = :NAME,
              ACCRUAL_POLICY = :ACCRUAL_POLICY,
              MAX_BALANCE    = :MAX_BALANCE
        WHERE LEAVE_TYPE_ID  = :id`,
      {
        id:             parseInt(id),
        CODE:           data.CODE,
        NAME:           data.NAME,
        ACCRUAL_POLICY: data.ACCRUAL_POLICY ?? null,
        MAX_BALANCE:    data.MAX_BALANCE    ?? null,
      },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

/* DELETE */
export const deleteLeaveType = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM HCM.HR_LEAVE_TYPE WHERE LEAVE_TYPE_ID = :id`,
      { id: parseInt(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};