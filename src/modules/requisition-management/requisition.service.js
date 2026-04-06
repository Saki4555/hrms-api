import { getConnection } from '../../config/db.js';

// ─── REQMASTER ─────────────────────────────────────────────────────────────

export const createRequisition = async (data) => {
  const { tdate, entry_by, store_id, remarks, challan_no, store_id_to, dreiver_no, vehicle_no } = data;
  const conn = await getConnection();
  try {
    // Get next TID from sequence (adjust sequence name to your schema)
    const seqResult = await conn.execute(`SELECT REQMASTER_SEQ.NEXTVAL AS TID FROM DUAL`);
    const tid = seqResult.rows[0].TID;

    await conn.execute(
      `INSERT INTO REQMASTER (TID, TDATE, ENTRY_BY, STORE_ID, REMARKS, STATUS, CHALLAN_NO, STORE_ID_TO, DREIVER_NO, VEHICLE_NO, ENTRY_DATE)
       VALUES (:tid, :tdate, :entry_by, :store_id, :remarks, 0, :challan_no, :store_id_to, :dreiver_no, :vehicle_no, SYSDATE)`,
      { tid, tdate: new Date(tdate), entry_by, store_id, remarks, challan_no, store_id_to, dreiver_no, vehicle_no }
    );

    await conn.commit();
    return { tid };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const getAllRequisitions = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT RM.TID, RM.TDATE, RM.ENTRY_BY, RM.STORE_ID, RM.REMARKS,
              RM.STATUS, RM.CHALLAN_NO, RM.STORE_ID_TO, RM.DREIVER_NO,
              RM.VEHICLE_NO, RM.ENTRY_DATE
       FROM REQMASTER RM
       ORDER BY RM.TID DESC`
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getRequisitionById = async (tid) => {
  const conn = await getConnection();
  try {
    const masterResult = await conn.execute(
      `SELECT * FROM REQMASTER WHERE TID = :tid`,
      { tid }
    );
    if (!masterResult.rows.length) return null;

    const detailResult = await conn.execute(
      `SELECT * FROM REQDETAIL WHERE REQID = :tid ORDER BY TID`,
      { tid }
    );

    return {
      master: masterResult.rows[0],
      details: detailResult.rows,
    };
  } finally {
    await conn.close();
  }
};

export const updateRequisitionStatus = async (tid, status) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE REQMASTER SET STATUS = :status WHERE TID = :tid`,
      { status, tid }
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ─── REQDETAIL ─────────────────────────────────────────────────────────────

export const addRequisitionDetail = async (reqid, items) => {
  const conn = await getConnection();
  try {
    for (const item of items) {
      const seqResult = await conn.execute(`SELECT REQDETAIL_SEQ.NEXTVAL AS TID FROM DUAL`);
      const tid = seqResult.rows[0].TID;

      await conn.execute(
        `INSERT INTO REQDETAIL (TID, REQID, ITEMID, APP_QTY, THAN, TOT_QTY, REMARKS, STATUS, STORE_ID, RETURN, UOM, FRM_STORE, ACCOUNTED)
         VALUES (:tid, :reqid, :itemid, :app_qty, :than, :tot_qty, :remarks, 0, :store_id, 0, :uom, :frm_store, 0)`,
        {
          tid,
          reqid,
          itemid: item.itemid,
          app_qty: item.app_qty,
          than: item.than ?? 0,
          tot_qty: item.tot_qty ?? item.app_qty,
          remarks: item.remarks ?? null,
          store_id: item.store_id,
          uom: item.uom ?? null,
          frm_store: item.frm_store,
        }
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const getDetailsByReqId = async (reqid) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM REQDETAIL WHERE REQID = :reqid ORDER BY TID`,
      { reqid }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── DISPATCH (Trigger fires here) ─────────────────────────────────────────
// STATUS: 1→2 triggers REQUISITION_UPDATE_STAT automatically in Oracle

export const dispatchDetail = async (tid) => {
  const conn = await getConnection();
  try {
    // First check current status
    const check = await conn.execute(
      `SELECT STATUS FROM REQDETAIL WHERE TID = :tid`,
      { tid }
    );
    if (!check.rows.length) throw new Error('Detail row not found');

    const currentStatus = check.rows[0].STATUS;
    if (currentStatus !== 1) {
      throw new Error(`Cannot dispatch. Current status is ${currentStatus}. Must be 1 (Approved).`);
    }

    // This UPDATE fires the Oracle trigger REQUISITION_UPDATE_STAT
    await conn.execute(
      `UPDATE REQDETAIL SET STATUS = 2 WHERE TID = :tid`,
      { tid }
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

export const approveDetail = async (tid) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE REQDETAIL SET STATUS = 1 WHERE TID = :tid`,
      { tid }
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};