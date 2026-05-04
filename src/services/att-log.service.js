// src\services\att-log.service.js
import { getConnection } from "../config/db.js";

/* INSERT */
export const createAttLog = async (data) => {
  const conn = await getConnection();

  const sql = `INSERT INTO ATT_LOG
    (AM_EMPNO, AM_TIME_IN_OUT, AM_TYPE_IN_OUT, AM_MAC_ID,
     AM_LAT_IN_OUT, AM_LON_IN_OUT, T_ZONE, LOCATION_ID, TEAM_LEAD_ID)
    VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)`;

  try {
    await conn.execute(sql, [
      data.AM_EMPNO,
      data.AM_TIME_IN_OUT,
      data.AM_TYPE_IN_OUT,
      data.AM_MAC_ID,
      data.AM_LAT_IN_OUT,
      data.AM_LON_IN_OUT,
      data.T_ZONE,
      data.LOCATION_ID,
      data.TEAM_LEAD_ID
    ], { autoCommit: true });

  } catch (err) {
    if (err.errorNum === 1) {
      // ORA-00001 → duplicate
      console.log("Duplicate skipped:", data.AM_EMPNO);
      return;
    }
    throw err;
  } finally {
    await conn.close();
  }
};

/* GET ALL WITH PAGINATION */
export const getAllAttLogs = async (page = 1, limit = 10) => {

  const conn = await getConnection();

  try {

    const offset = (page - 1) * limit;

    const result = await conn.execute(
      `SELECT *
       FROM ATT_LOG
       ORDER BY AM_TIME_IN_OUT DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      { offset, limit },
      { outFormat: 4002 }
    );

    return result.rows;

  } finally {
    await conn.close();
  }

};


/* GET SINGLE */
export const getSingleAttLog = async (empno) => {

  const conn = await getConnection();

  try {

    const result = await conn.execute(
      `SELECT * FROM ATT_LOG WHERE AM_EMPNO = :empno`,
      { empno },
      { outFormat: 4002 }
    );

    return result.rows[0];

  } finally {
    await conn.close();
  }

};


/* UPDATE */
export const updateAttLog = async (empno, data) => {

  const conn = await getConnection();

  try {

    const sql = `UPDATE ATT_LOG
      SET AM_TIME_IN_OUT = :AM_TIME_IN_OUT,
          AM_TYPE_IN_OUT = :AM_TYPE_IN_OUT,
          AM_MAC_ID = :AM_MAC_ID
      WHERE AM_EMPNO = :empno`;

    await conn.execute(sql, { ...data, empno }, { autoCommit: true });

  } finally {
    await conn.close();
  }

};


/* DELETE */
export const deleteAttLog = async (empno) => {

  const conn = await getConnection();

  try {

    await conn.execute(
      `DELETE FROM ATT_LOG WHERE AM_EMPNO = :empno`,
      { empno },
      { autoCommit: true }
    );

  } finally {
    await conn.close();
  }

};