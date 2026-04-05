import { getConnection } from '../../config/db.js';

// ─── GET ALL BY TID ────────────────────────────────────────
export const getAllReqDetail = async (tid) => {
  let conn;
  try {
    conn = await getConnection();
    const sql = tid
      ? `SELECT TID, ITEMID, APP_QTY, THAN, TOT_QTY, FRM_STORE,
                REQID, STATUS, STORE_ID, RETURN, UOM, REMARKS, ACCOUNTED
         FROM REQDETAIL
         WHERE TID = :tid
         ORDER BY ITEMID`
      : `SELECT TID, ITEMID, APP_QTY, THAN, TOT_QTY, FRM_STORE,
                REQID, STATUS, STORE_ID, RETURN, UOM, REMARKS, ACCOUNTED
         FROM REQDETAIL
         ORDER BY TID DESC, ITEMID`;

    const binds = tid ? { tid } : {};
    const result = await conn.execute(sql, binds,  { autoCommit: true });
    return result.rows;
  } finally {
    if (conn) await conn.close();
  }
};

// ─── GET SINGLE ────────────────────────────────────────────
export const getReqDetailById = async (tid) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT TID, ITEMID, APP_QTY, THAN, TOT_QTY, FRM_STORE,
              REQID, STATUS, STORE_ID, RETURN, UOM, REMARKS, ACCOUNTED
       FROM REQDETAIL
       WHERE TID = :tid`,
      { tid } ,{ autoCommit: true }
    );
    return result.rows[0] || null;
  } finally {
    if (conn) await conn.close();
  }
};

// ─── INSERT SINGLE ─────────────────────────────────────────
export const createReqDetail = async (data) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `INSERT INTO REQDETAIL
         ( ITEMID, APP_QTY, THAN, TOT_QTY, FRM_STORE,
          REQID, STATUS, STORE_ID, RETURN, UOM, REMARKS, ACCOUNTED)
       VALUES
         ( :itemid, :app_qty, :than, :tot_qty, :frm_store,
          :reqid, :status, :store_id, :return_qty, :uom, :remarks, :accounted)`,
      {
       
        itemid:     data.itemid,
        app_qty:    data.app_qty ?? 0,
        than:       data.than ?? null,
        tot_qty:    data.tot_qty ?? 0,
        frm_store:  data.frm_store ?? null,
        reqid:      data.reqid ?? null,
        status:     data.status ?? 0,
        store_id:   data.store_id ?? null,
        return_qty: data.return ?? 0,
        uom:        data.uom || null,
        remarks:    data.remarks || null,
        accounted:  data.accounted ?? 0,
      },
       { autoCommit: true }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    if (conn) await conn.close();
  }
};

// ─── BULK INSERT ───────────────────────────────────────────
export const createReqDetailBulk = async (tid, items) => {
  let conn;
  try {
    conn = await getConnection();
    const binds = items.map((d) => ({
      // tid,
      itemid:     d.itemid,
      app_qty:    d.app_qty ?? 0,
      than:       d.than ?? null,
      tot_qty:    d.tot_qty ?? 0,
      frm_store:  d.frm_store ?? null,
      reqid:      d.reqid ?? null,
      status:     d.status ?? 0,
      store_id:   d.store_id ?? null,
      return_qty: d.return ?? 0,
      uom:        d.uom || null,
      remarks:    d.remarks || null,
      accounted:  d.accounted ?? 0,
    }));

    const result = await conn.executeMany(
      `INSERT INTO REQDETAIL
         ( ITEMID, APP_QTY, THAN, TOT_QTY, FRM_STORE,
          REQID, STATUS, STORE_ID, RETURN, UOM, REMARKS, ACCOUNTED)
       VALUES
         ( :itemid, :app_qty, :than, :tot_qty, :frm_store,
          :reqid, :status, :store_id, :return_qty, :uom, :remarks, :accounted)`,
      binds, { autoCommit: true }
    );
     
    return { rowsAffected: result.rowsAffected };
  } finally {
    if (conn) await conn.close();
  }
};

// ─── UPDATE ────────────────────────────────────────────────
export const updateReqDetail = async (tid, data) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `UPDATE REQDETAIL SET
         ITEMID    = :itemid,
         APP_QTY   = :app_qty,
         THAN      = :than,
         TOT_QTY   = :tot_qty,
         FRM_STORE = :frm_store,
         REQID     = :reqid,
         STATUS    = :status,
         STORE_ID  = :store_id,
         RETURN    = :return_qty,
         UOM       = :uom,
         REMARKS   = :remarks,
         ACCOUNTED = :accounted
       WHERE TID = :tid`,
      {
        tid,
        itemid:     data.itemid,
        app_qty:    data.app_qty ?? 0,
        than:       data.than ?? null,
        tot_qty:    data.tot_qty ?? 0,
        frm_store:  data.frm_store ?? null,
        reqid:      data.reqid ?? null,
        status:     data.status,
        store_id:   data.store_id ?? null,
        return_qty: data.return ?? 0,
        uom:        data.uom || null,
        remarks:    data.remarks || null,
        accounted:  data.accounted ?? 0,
      },
       { autoCommit: true }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    if (conn) await conn.close();
  }
};
