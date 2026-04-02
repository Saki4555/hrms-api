import { getConnection } from '../../config/db.js';

// ─── INSERT ───────────────────────────────────────────────────────────────────
export const createItem = async (data) => {
  const conn = await getConnection();
  try {
    const sql = `
      INSERT INTO ITEM (
       NAME, DESCRIPTION, MODEL, BRAND_ID, SIZE_ID,
        ORIGIN_ID, CATEGORY_ID, PRICE, UNIT_ID, TYPE_ID,
        COLOR_ID, MIN_LEVEL, STATUS, ENTRY_BY, SUBCAT_ID, UNIT
      ) VALUES (
         :name, :description, :model, :brandId, :sizeId,
        :originId, :categoryId, :price, :unitId, :typeId,
        :colorId, :minLevel, :status, :entryBy, :subcatId, :unit
      )
    `;
    const binds = {
     
      name:        data.name,
      description: data.description,
      model:       data.model,
      brandId:     data.brandId,
      sizeId:      data.sizeId,
      originId:    data.originId,
      categoryId:  data.categoryId,
      price:       data.price,
      unitId:      data.unitId,
      typeId:      data.typeId,
      colorId:     data.colorId,
      minLevel:    data.minLevel ?? 0,
      status:      data.status   ?? 1,
      entryBy:     data.entryBy,
      subcatId:    data.subcatId,
      unit:        data.unit,
    };
   const result = await conn.execute(sql, binds, { autoCommit: true });
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export const updateItem = async (itemId, data) => {
  const conn = await getConnection();
  try {
    const sql = `
      UPDATE ITEM SET
        NAME        = :name,
        DESCRIPTION = :description,
        MODEL       = :model,
        BRAND_ID    = :brandId,
        SIZE_ID     = :sizeId,
        ORIGIN_ID   = :originId,
        CATEGORY_ID = :categoryId,
        PRICE       = :price,
        UNIT_ID     = :unitId,
        TYPE_ID     = :typeId,
        COLOR_ID    = :colorId,
        MIN_LEVEL   = :minLevel,
        STATUS      = :status,
        SUBCAT_ID   = :subcatId,
        UNIT        = :unit
      WHERE ITEM_ID = :itemId
    `;
    const result = await conn.execute(sql, { itemId, ...data }, { autoCommit: true });
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

// ─── GET ALL ──────────────────────────────────────────────────────────────────
export const getAllItems = async ({ page = 1, limit = 20 } = {}) => {
  const conn = await getConnection();
  try {
    const offset = (page - 1) * limit;
    const sql = `
      SELECT * FROM (
        SELECT i.*, ROWNUM rn
        FROM ITEM i
        ORDER BY ITEM_ID
      ) WHERE rn > :offset AND rn <= :end
    `;
    const result = await conn.execute(sql, { offset, end: offset + limit });
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─── GET SINGLE ───────────────────────────────────────────────────────────────
export const getItemById = async (itemId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM ITEM WHERE ITEM_ID = :itemId`,
      { itemId }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deleteItem = async (itemId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM ITEM WHERE ITEM_ID = :itemId`,
      { itemId }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};