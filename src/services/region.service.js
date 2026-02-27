import { getConnection } from "../config/db.js";

/* CREATE REGION */
export const createRegion = async (data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO REGION_LIST
        (COUNTRY_ID, REGION_NAME)
       VALUES ( :COUNTRY_ID, :REGION_NAME)`,
      data,
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/* GET ALL REGIONS WITH COUNTRY NAME */

export const getAllRegions = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT DISTINCT
          r.REGION_ID,
          r.REGION_NAME,
          r.COUNTRY_ID,
          c.COUNTRY_NAME
       FROM HCM.REGION_LIST r
       JOIN HCM.COUNTRY_LIST c ON r.COUNTRY_ID = c.COUNTRY_ID
       ORDER BY r.REGION_ID`,
      [],
      { outFormat: 4002 }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

/* GET SINGLE REGION BY ID */
export const getRegionById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
          r.REGION_ID,
          r.REGION_NAME,
          r.COUNTRY_ID,
          c.COUNTRY_NAME
       FROM HCM.REGION_LIST r
       JOIN HCM.COUNTRY_LIST c ON r.COUNTRY_ID = c.COUNTRY_ID
       WHERE r.REGION_ID = :id`,
      { id },
      { outFormat: 4002 }
    );
    return result.rows[0];
  } finally {
    await conn.close();
  }
};

/* UPDATE REGION */
export const updateRegion = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HCM.REGION_LIST
       SET COUNTRY_ID = :COUNTRY_ID,
           REGION_NAME = :REGION_NAME
       WHERE REGION_ID = :id`,
      { ...data, id },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

/* DELETE REGION */
export const deleteRegion = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM HCM.REGION_LIST WHERE REGION_ID = :id`,
      { id },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};