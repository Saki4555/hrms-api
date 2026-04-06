import { getConnection } from '../../config/db.js';

// ─── INSERT ───────────────────────────────────────────────────────────────────
export const createItemStock = async (data) => {
  const conn = await getConnection();
  try {
    const sql = `
      INSERT INTO ITEM_STOCK (
        STORE_ID, ITEM_ID, STOCK_QTY, MINIMUM_LEVEL, STATUS,
        PRICE, LAST_PRICE, UNIT_ID, UOM, ENTRY_BY, UPDATE_BY, BOOKED
      ) VALUES (
        :storeId, :itemId, :stockQty, :minimumLevel, 1,
        :price, :lastPrice, :unitId, :uom, :entryBy, :updateBy, :booked
      )
    `;
    const binds = {
      storeId:        data.storeId,        // ← এটা যোগ হলো
      itemId:         data.itemId,
      stockQty:       data.stockQty        ?? 0,
      minimumLevel:   data.minimumLevel    ?? 0,
      price:          data.price           ?? null,
      lastPrice:      data.lastPrice       ?? null,
      unitId:         data.unitId          ?? null,
      uom:            data.uom             ?? null,
      entryBy:        data.entryBy         ?? null,
      updateBy:       data.updateBy        ?? null,
      booked:         data.booked          ?? 0,
    };
    const result = await conn.execute(sql, binds, { autoCommit: true });
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export const updateItemStock = async (storeId, itemId, data) => {
  const conn = await getConnection();
  try {
    const sql = `
      UPDATE ITEM_STOCK SET
        STOCK_QTY      = :stockQty,
        MINIMUM_LEVEL  = :minimumLevel,
        STATUS         = :status,
        PRICE          = :price,
        LAST_PRICE     = :lastPrice,
        UNIT_ID        = :unitId,
        UOM            = :uom,
        UPDATE_BY      = :updateBy,
        BOOKED         = :booked,
        LAST_UPDATE_DATE = :lastUpdateDate,
        UPDATE_DATE    = SYSDATE
      WHERE STORE_ID = :storeId AND ITEM_ID = :itemId
    `;
    const binds = {
      storeId,
      itemId,
      stockQty:       data.stockQty,
      minimumLevel:   data.minimumLevel,
      status:         data.status,
      price:          data.price,
      lastPrice:      data.lastPrice,
      unitId:         data.unitId,
      uom:            data.uom,
      updateBy:       data.updateBy,
      booked:         data.booked,
      lastUpdateDate: data.lastUpdateDate ? new Date(data.lastUpdateDate) : new Date(),
    };
    const result = await conn.execute(sql, binds, { autoCommit: true });
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

export const getAllItemStocks = async ({ page = 1, limit = 20 } = {}) => {
  const conn = await getConnection();
  try {
    const offset = (page - 1) * limit;

    const sql = `
      SELECT *
      FROM (
        SELECT
          -- ITEM_STOCK columns
          ist.STORE_ID,
          ist.ITEM_ID,
          ist.STOCK_QTY,
          ist.MINIMUM_LEVEL,
          ist.STATUS          AS STOCK_STATUS,
          ist.PRICE           AS STOCK_PRICE,
          ist.LAST_PRICE,
          ist.UNIT_ID         AS STOCK_UNIT_ID,
          ist.UOM,
          ist.ENTRY_BY,
          ist.UPDATE_BY,
          ist.BOOKED,
          ist.LAST_UPDATE_DATE,
          ist.UPDATE_DATE     AS STOCK_UPDATE_DATE,
          ist.ENTRY_DATE      AS STOCK_ENTRY_DATE,

          -- ✅ STORES JOIN (ADD THIS)
          st.STORE_NAME,

          -- ITEM columns
          itm.NAME            AS ITEM_NAME,
          itm.DESCRIPTION     AS ITEM_DESCRIPTION,
          itm.MODEL,
          itm.BRAND_ID,
          itm.SIZE_ID,
          itm.ORIGIN_ID,
          itm.CATEGORY_ID,
          itm.TYPE_ID,
          itm.COLOR_ID,
          itm.MIN_LEVEL,
          itm.SUBCAT_ID,
          itm.STATUS          AS ITEM_STATUS,
          itm.UNIT            AS ITEM_UNIT,
          itm.PRICE           AS ITEM_PRICE,

          ROWNUM AS RN
        FROM ITEM_STOCK ist

        -- ✅ ADD THIS JOIN
        LEFT JOIN STORES st 
          ON ist.STORE_ID = st.STORE_ID

        LEFT JOIN ITEM itm 
          ON ist.ITEM_ID = itm.ITEM_ID

        ORDER BY ist.STORE_ID, ist.ITEM_ID
      )
      WHERE RN > :offset AND RN <= :endRow
    `;

    const result = await conn.execute(sql, { offset, endRow: offset + limit });
console.log("Sample row:", JSON.stringify(result.rows[0]));
return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── GET SINGLE  (ITEM_STOCK ⟶ ITEM) ─────────────────────────────────────────
export const getItemStockById = async (storeId, itemId) => {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT
        -- ITEM_STOCK columns
        ist.STORE_ID,
        ist.ITEM_ID,
        ist.STOCK_QTY,
        ist.MINIMUM_LEVEL,
        ist.STATUS          AS STOCK_STATUS,
        ist.PRICE           AS STOCK_PRICE,
        ist.LAST_PRICE,
        ist.UNIT_ID         AS STOCK_UNIT_ID,
        ist.UOM,
        ist.ENTRY_BY,
        ist.UPDATE_BY,
        ist.BOOKED,
        ist.LAST_UPDATE_DATE,
        ist.UPDATE_DATE     AS STOCK_UPDATE_DATE,
        ist.ENTRY_DATE      AS STOCK_ENTRY_DATE,

         -- ✅ STORE JOIN (ADD THIS)
          st.STORE_NAME,
 
        -- ITEM columns
        itm.NAME            AS ITEM_NAME,
        itm.DESCRIPTION     AS ITEM_DESCRIPTION,
        itm.MODEL,
        itm.BRAND_ID,
        itm.SIZE_ID,
        itm.ORIGIN_ID,
        itm.CATEGORY_ID,
        itm.TYPE_ID,
        itm.COLOR_ID,
        itm.MIN_LEVEL,
        itm.SUBCAT_ID,
        itm.STATUS          AS ITEM_STATUS,
        itm.UNIT            AS ITEM_UNIT,
        itm.PRICE           AS ITEM_PRICE
 
      FROM ITEM_STOCK ist
      LEFT JOIN ITEM itm ON ist.ITEM_ID = itm.ITEM_ID
        -- ✅ ADD THIS JOIN
        LEFT JOIN STORES st 
          ON ist.STORE_ID = st.STORE_ID
      WHERE ist.STORE_ID = :storeId AND ist.ITEM_ID = :itemId
    `;
    const result = await conn.execute(sql, { storeId, itemId });
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deleteItemStock = async (storeId, itemId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM ITEM_STOCK WHERE STORE_ID = :storeId AND ITEM_ID = :itemId`,
      { storeId, itemId }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};