
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// ── GET ALL ──────────────────────────────────────────────────────────────────
export async function getAllRequisitions() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         m.TID,
         m.TDATE,
         m.STORE_ID,
         m.STORE_ID_TO,
         s1.STORE_NAME AS FROM_STORE_NAME,
         s2.STORE_NAME AS TO_STORE_NAME,
         m.ENTRY_BY,
         m.VEHICLE_NO,
         m.DREIVER_NO,
         m.CHALLAN_NO,
         m.REMARKS,
         m.STATUS                                          AS MASTER_STATUS,
         COUNT(d.TID)                                      AS TOTAL_ITEMS,
         SUM(CASE WHEN d.STATUS = 1 THEN 1 ELSE 0 END)    AS PENDING_COUNT,
         SUM(CASE WHEN d.STATUS = 2 THEN 1 ELSE 0 END)    AS APPROVED_COUNT
       FROM REQMASTER m
       LEFT JOIN STORES s1 ON s1.STORE_ID = m.STORE_ID
       LEFT JOIN STORES s2 ON s2.STORE_ID = m.STORE_ID_TO

       LEFT JOIN REQDETAIL d ON d.REQID = m.TID
       GROUP BY
         m.TID, m.TDATE, m.STORE_ID, m.STORE_ID_TO,
         s1.STORE_NAME, s2.STORE_NAME,
         m.ENTRY_BY, m.VEHICLE_NO, m.DREIVER_NO,
         m.CHALLAN_NO, m.REMARKS, m.STATUS
       ORDER BY m.TID DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

// ── GET ONE ──────────────────────────────────────────────────────────────────
export async function getRequisitionById(tid) {
  const conn = await getConnection();
  try {
    const master = await conn.execute(
      `SELECT 
     m.*,

     s1.STORE_NAME AS FROM_STORE_NAME,
     s2.STORE_NAME AS TO_STORE_NAME

   FROM REQMASTER m

   LEFT JOIN STORES s1 ON s1.STORE_ID = m.STORE_ID
   LEFT JOIN STORES s2 ON s2.STORE_ID = m.STORE_ID_TO

   WHERE m.TID = :tid`,
   { tid },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (master.rows.length === 0) return null;

    const details = await conn.execute(
      `SELECT * FROM REQDETAIL WHERE REQID = :tid ORDER BY TID`,
      { tid },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return { master: master.rows[0], details: details.rows };
  } finally {
    await conn.close();
  }
}

// ── CREATE ───────────────────────────────────────────────────────────────────
export async function createRequisition(master, details) {
  const conn = await getConnection();
  try {
    // Step 1 — insert REQMASTER, get generated TID back
    const masterResult = await conn.execute(
      `INSERT INTO REQMASTER
         (TDATE, ENTRY_DATE, STORE_ID, STORE_ID_TO, ENTRY_BY,
          VEHICLE_NO, DREIVER_NO, CHALLAN_NO, REMARKS, STATUS)
       VALUES
         ( TO_DATE(:tdate, 'YYYY-MM-DD'),
  TO_DATE(:entry_date, 'YYYY-MM-DD'), :store_id, :store_id_to, :entry_by,
          :vehicle_no, :dreiver_no, :challan_no, :remarks, 1)
       RETURNING TID INTO :tid`,
      {
        tdate:       master.TDATE,
        entry_date:  master.ENTRY_DATE,
        store_id:    master.STORE_ID,
        store_id_to: master.STORE_ID_TO,
        entry_by:    master.ENTRY_BY,
        vehicle_no:  master.VEHICLE_NO || null,
        dreiver_no:  master.DREIVER_NO || null,
        challan_no:  master.CHALLAN_NO || null,
        remarks:     master.REMARKS    || null,
        tid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      }
    );

    const newMasterTid = masterResult.outBinds.tid[0];

    // Step 2 — insert REQDETAIL rows
    // STATUS is always hardcoded 1 (Pending) — never comes from frontend
    for (const item of details) {
     // ── CREATE ─── REQDETAIL insert এ STORE_ID যোগ করো
await conn.execute(
  `INSERT INTO REQDETAIL
     (REQID, ITEMID, TOT_QTY, APP_QTY, UOM, REMARKS,
      THAN, FRM_STORE, STORE_ID, STATUS, ACCOUNTED, RETURN)
   VALUES
     (:reqid, :itemid, :tot_qty, :app_qty, :uom, :remarks,
      :than, :frm_store, :store_id, 1, 0, 0)`,  // ✅ STORE_ID যোগ
  {
    reqid:     newMasterTid,
    itemid:    item.ITEMID,
    tot_qty:   item.TOT_QTY,
    app_qty:   item.APP_QTY   || 0,
    uom:       item.UOM       || null,
    remarks:   item.REMARKS   || null,
    than:      item.THAN      || null,
    frm_store: item.FRM_STORE || null,
    store_id:  item.STORE_ID  || null,  // ✅ to-store (STORE_ID_TO)
  }
);
    }

    await conn.commit();
    return newMasterTid;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

// ── UPDATE ───────────────────────────────────────────────────────────────────
export async function updateRequisition(tid, master, details) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE REQMASTER SET
         TDATE       = TO_DATE(:tdate, 'YYYY-MM-DD'),
         STORE_ID    = :store_id,
         STORE_ID_TO = :store_id_to,
         VEHICLE_NO  = :vehicle_no,
         DREIVER_NO  = :dreiver_no,
         CHALLAN_NO  = :challan_no,
         REMARKS     = :remarks
       WHERE TID = :tid`,
      {
        tdate:       master.TDATE,
        store_id:    master.STORE_ID,
        store_id_to: master.STORE_ID_TO,
        vehicle_no:  master.VEHICLE_NO || null,
        dreiver_no:  master.DREIVER_NO || null,
        challan_no:  master.CHALLAN_NO || null,
        remarks:     master.REMARKS    || null,
        tid,
      }
    );

    // Update detail rows — STATUS is never updated here
    for (const item of details) {
      await conn.execute(
        `UPDATE REQDETAIL SET
           ITEMID  = :itemid,
           TOT_QTY = :tot_qty,
           APP_QTY = :app_qty,
           UOM     = :uom,
           REMARKS = :remarks
         WHERE TID = :tid AND REQID = :reqid`,
        {
          itemid:  item.ITEMID,
          tot_qty: item.TOT_QTY,
          app_qty: item.APP_QTY || 0,
          uom:     item.UOM     || null,
          remarks: item.REMARKS || null,
          tid:     item.TID,
          reqid:   tid,
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
}

// ── APPROVE ONE DETAIL ROW ───────────────────────────────────────────────────
export async function approveDetail(masterTid, detailTid) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE REQDETAIL
       SET STATUS = 2
       WHERE TID = :tid AND REQID = :reqid AND STATUS = 1`,
      { tid: detailTid, reqid: masterTid }
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

// ── APPROVE ALL PENDING DETAIL ROWS ─────────────────────────────────────────
export async function approveAllDetails(masterTid) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE REQDETAIL
       SET STATUS = 2
       WHERE REQID = :reqid AND STATUS = 1`,
      { reqid: masterTid }
    );
    await conn.commit();
  } catch (err) {a
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}