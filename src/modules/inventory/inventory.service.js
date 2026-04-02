import { getConnection } from '../../config/db.js';

// ─── INSERT ───────────────────────────────────────────────────────────────────
export const createInventory = async (data) => {
  const conn = await getConnection();
  try {
    const sql = `
      INSERT INTO INVENTORIES (
         INVQTY, GRNNO, PONO, ITEM, PRICE, STOREID,
        INVTDATE, INVSTATUS, INVOICE_STATUS, ITEMTYPE, ACCOUNTED,
        UNIT, UNIT_PRICE, UNIT_ID, SELLING_UNIT_PRICE, INVENTORY_TYPE
      ) VALUES (
         :invQty, :grnNo, :poNo, :item, :price, :storeId,
        :invtDate, :invStatus, :invoiceStatus, :itemType, :accounted,
        :unit, :unitPrice, :unitId, :sellingUnitPrice, :inventoryType
      )
    `;
    const binds = {
     
      invQty:           data.invQty,
      grnNo:            data.grnNo,
      poNo:             data.poNo,
      item:             data.item,
      price:            data.price,
      storeId:          data.storeId,
      invtDate:          data.invDate ? new Date(data.invtDate) : new Date(),
      invStatus:        data.invStatus        ?? 0,
      invoiceStatus:    data.invoiceStatus    ?? 0,
      itemType:         data.itemType         ?? 0,
      accounted:        data.accounted        ?? 0,
      unit:             data.unit,
      unitPrice:        data.unitPrice,
      unitId:           data.unitId,
      sellingUnitPrice: data.sellingUnitPrice,
      inventoryType:    data.inventoryType,
    };
   const result = await conn.execute(sql, binds, { autoCommit: true });
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export const updateInventory = async (tid, data) => {
  const conn = await getConnection();
  try {
    const sql = `
      UPDATE INVENTORIES SET
        INVQTY           = :invQty,
        GRNNO            = :grnNo,
        PONO             = :poNo,
        ITEM             = :item,
        PRICE            = :price,
        STOREID          = :storeId,
        INVTDATE          = :invtDate,
        INVSTATUS        = :invStatus,
        INVOICE_STATUS   = :invoiceStatus,
        ITEMTYPE         = :itemType,
        ACCOUNTED        = :accounted,
        UNIT             = :unit,
        UNIT_PRICE       = :unitPrice,
        UNIT_ID          = :unitId,
        SELLING_UNIT_PRICE = :sellingUnitPrice,
        INVENTORY_TYPE   = :inventoryType,
        UPDATE_DATE      = SYSDATE
      WHERE TID = :tid
    `;
    const binds = { tid, ...data, invtDate: data.invtDate ? new Date(data.invtDate) : undefined };
    const result = await conn.execute(sql, binds, { autoCommit: true });
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

export const getAllInventories = async ({ page = 1, limit = 20 } = {}) => {
  const conn = await getConnection();
  try {
    const offset = (page - 1) * limit;
    const sql = `
      SELECT *
      FROM (
        SELECT
          -- INVENTORIES columns
          inv.TID,
          inv.INVTDATE,
          inv.ENTRY_DATE,
          inv.UPDATE_DATE,
          inv.INVSTATUS,
          inv.INVOICE_STATUS,
          inv.ITEMTYPE,
          inv.ACCOUNTED,
          inv.INVQTY,
          inv.PONO,
          inv.ITEM            AS INV_ITEM_ID,
          inv.PRICE           AS INV_PRICE,
          inv.STOREID,
          inv.SELLING_UNIT_PRICE,
          inv.INVENTORY_TYPE,
          inv.UNIT_ID         AS INV_UNIT_ID,
          inv.UNIT            AS INV_UNIT,
          inv.UNIT_PRICE,
          inv.GRNNO,
 
          -- ITEM_STOCK columns
          ist.STOCK_QTY,
          ist.MINIMUM_LEVEL,
          ist.STATUS          AS STOCK_STATUS,
          ist.PRICE           AS STOCK_PRICE,
          ist.LAST_PRICE,
          ist.UOM,
          ist.BOOKED,
          ist.ENTRY_BY        AS STOCK_ENTRY_BY,
          ist.UPDATE_BY,
          ist.LAST_UPDATE_DATE,
 
          -- ITEM columns
          itm.ITEM_ID,
          itm.NAME            AS ITEM_NAME,
          itm.DESCRIPTION     AS ITEM_DESCRIPTION,
          itm.MODEL,
          itm.BRAND_ID,
          itm.SIZE_ID,
          itm.ORIGIN_ID,
          itm.CATEGORY_ID,
          itm.TYPE_ID,
          itm.COLOR_ID,
          itm.SUBCAT_ID,
          itm.STATUS          AS ITEM_STATUS,
          itm.UNIT            AS ITEM_UNIT,
 
          ROWNUM AS RN
        FROM INVENTORIES inv
        LEFT JOIN ITEM_STOCK ist
          ON  inv.ITEM    = ist.ITEM_ID
          AND inv.STOREID = ist.STORE_ID
        LEFT JOIN ITEM itm
          ON  ist.ITEM_ID = itm.ITEM_ID
        ORDER BY inv.TID DESC
      )
      WHERE RN > :offset AND RN <= :endRow
    `;
    const result = await conn.execute(sql, { offset, endRow: offset + limit });
    return result.rows;
  } finally {
    await conn.close();
  }
};
 
// ─── GET SINGLE  (INVENTORIES ⟶ ITEM_STOCK ⟶ ITEM) ──────────────────────────
export const getInventoryById = async (tid) => {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT
        -- INVENTORIES columns
        inv.TID,
        inv.INVTDATE,
        inv.ENTRY_DATE,
        inv.UPDATE_DATE,
        inv.INVSTATUS,
        inv.INVOICE_STATUS,
        inv.ITEMTYPE,
        inv.ACCOUNTED,
        inv.INVQTY,
        inv.PONO,
        inv.ITEM            AS INV_ITEM_ID,
        inv.PRICE           AS INV_PRICE,
        inv.STOREID,
        inv.SELLING_UNIT_PRICE,
        inv.INVENTORY_TYPE,
        inv.UNIT_ID         AS INV_UNIT_ID,
        inv.UNIT            AS INV_UNIT,
        inv.UNIT_PRICE,
        inv.GRNNO,
 
        -- ITEM_STOCK columns
        ist.STORE_ID,
        ist.STOCK_QTY,
        ist.MINIMUM_LEVEL,
        ist.STATUS          AS STOCK_STATUS,
        ist.PRICE           AS STOCK_PRICE,
        ist.LAST_PRICE,
        ist.UOM,
        ist.BOOKED,
        ist.ENTRY_BY        AS STOCK_ENTRY_BY,
        ist.UPDATE_BY,
        ist.LAST_UPDATE_DATE,
 
        -- ITEM columns
        itm.ITEM_ID,
        itm.NAME            AS ITEM_NAME,
        itm.DESCRIPTION     AS ITEM_DESCRIPTION,
        itm.MODEL,
        itm.BRAND_ID,
        itm.SIZE_ID,
        itm.ORIGIN_ID,
        itm.CATEGORY_ID,
        itm.TYPE_ID,
        itm.COLOR_ID,
        itm.SUBCAT_ID,
        itm.STATUS          AS ITEM_STATUS,
        itm.UNIT            AS ITEM_UNIT
 
      FROM INVENTORIES inv
      LEFT JOIN ITEM_STOCK ist
        ON  inv.ITEM    = ist.ITEM_ID
        AND inv.STOREID = ist.STORE_ID
      LEFT JOIN ITEM itm
        ON  ist.ITEM_ID = itm.ITEM_ID
      WHERE inv.TID = :tid
    `;
    const result = await conn.execute(sql, { tid });
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deleteInventory = async (tid) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM INVENTORIES WHERE TID = :tid`,
      { tid }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};