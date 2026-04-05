import oracledb from 'oracledb';
import { getConnection } from '../../config/db.js';

// ─── GET ALL ───────────────────────────────────────────────
export const getAllReqMaster = async () => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT TID, TDATE, ENTRY_DATE, STORE_ID_TO, ENTRY_BY,
              STORE_ID, STATUS, REMARKS, DREIVER_NO, VEHICLE_NO, CHALLAN_NO
       FROM REQMASTER
       ORDER BY TID DESC`
    );
   
    return result.rows;
  } finally {
    if (conn) await conn.close();
  }
};

// ─── GET SINGLE ────────────────────────────────────────────
export const getReqMasterById = async (tid) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT TID, TDATE, ENTRY_DATE, STORE_ID_TO, ENTRY_BY,
              STORE_ID, STATUS, REMARKS, DREIVER_NO, VEHICLE_NO, CHALLAN_NO
       FROM REQMASTER
       WHERE TID = :tid`,
      { tid },  { autoCommit: true }
    );
    return result.rows[0] || null;
  } finally {
    if (conn) await conn.close();
  }
};

// ─── INSERT ────────────────────────────────────────────────
export const createReqMaster = async (data) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `INSERT INTO REQMASTER
         (TDATE, ENTRY_DATE, STORE_ID_TO, ENTRY_BY,
          STORE_ID, STATUS, REMARKS, DREIVER_NO, VEHICLE_NO, CHALLAN_NO)
       VALUES
         (TO_DATE(:tdate, 'YYYY-MM-DD'), TO_DATE(:entry_date, 'YYYY-MM-DD'),
          :store_id_to, :entry_by, :store_id, :status,
          :remarks, :dreiver_no, :vehicle_no, :challan_no)
       RETURNING TID INTO :tid`,
      {
        tdate:        data.tdate,
        entry_date:   data.entry_date,
        store_id_to:  data.store_id_to,
        entry_by:     data.entry_by,
        store_id:     data.store_id,
        status:       data.status ?? 0,
        remarks:      data.remarks || null,
        dreiver_no:   data.dreiver_no || null,
        vehicle_no:   data.vehicle_no || null,
        challan_no:   data.challan_no || null,
      tid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
       { autoCommit: true }
    );
    return { tid: result.outBinds.tid[0] };
  } finally {
    if (conn) await conn.close();
  }
};

// ─── UPDATE ────────────────────────────────────────────────
export const updateReqMaster = async (tid, data) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `UPDATE REQMASTER SET
         TDATE        = TO_DATE(:tdate, 'YYYY-MM-DD'),
         ENTRY_DATE   = TO_DATE(:entry_date, 'YYYY-MM-DD'),
         STORE_ID_TO  = :store_id_to,
         ENTRY_BY     = :entry_by,
         STORE_ID     = :store_id,
         STATUS       = :status,
         REMARKS      = :remarks,
         DREIVER_NO   = :dreiver_no,
         VEHICLE_NO   = :vehicle_no,
         CHALLAN_NO   = :challan_no
       WHERE TID = :tid`,
      {
        tdate:        data.tdate,
        entry_date:   data.entry_date,
        store_id_to:  data.store_id_to,
        entry_by:     data.entry_by,
        store_id:     data.store_id,
        status:       data.status,
        remarks:      data.remarks || null,
        dreiver_no:   data.dreiver_no || null,
        vehicle_no:   data.vehicle_no || null,
        challan_no:   data.challan_no || null,
        tid,
      },
       { autoCommit: true }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    if (conn) await conn.close();
  }
};
