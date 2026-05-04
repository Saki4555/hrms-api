import { getConnection } from "../config/db.js";

/* GET ALL DISTRICTS WITH COUNTRY AND REGION NAMES */
export const getAllDistricts = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
          d.DISTRICT_ID,
          d.DISTRICT_NAME,
          d.COUNTRY_ID,
          c.COUNTRY_NAME,
          d.REGION_ID,
          r.REGION_NAME
       FROM DISTRICT_LIST d
       JOIN COUNTRY_LIST c ON d.COUNTRY_ID = c.COUNTRY_ID
       JOIN REGION_LIST r ON d.REGION_ID = r.REGION_ID
       ORDER BY d.DISTRICT_ID`,
      [],
      { outFormat: 4002 } // OUT_FORMAT_OBJECT
    );

    return result.rows;
  } finally {
    await conn.close();
  }
};

/* GET SINGLE DISTRICT BY ID WITH COUNTRY AND REGION */
export const getDistrictById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
          d.DISTRICT_ID,
          d.DISTRICT_NAME,
          d.COUNTRY_ID,
          c.COUNTRY_NAME,
          d.REGION_ID,
          r.REGION_NAME
       FROM DISTRICT_LIST d
       JOIN COUNTRY_LIST c ON d.COUNTRY_ID = c.COUNTRY_ID
       JOIN REGION_LIST r ON d.REGION_ID = r.REGION_ID
       WHERE d.DISTRICT_ID = :id`,
      { id },
      { outFormat: 4002 }
    );

    return result.rows[0];
  } finally {
    await conn.close();
  }
};

/* CREATE DISTRICT */
export const createDistrict = async (data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO DISTRICT_LIST
        ( COUNTRY_ID, REGION_ID, DISTRICT_NAME)
       VALUES ( :COUNTRY_ID, :REGION_ID, :DISTRICT_NAME)`,
      data,
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/* UPDATE DISTRICT */
export const updateDistrict = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE DISTRICT_LIST
       SET COUNTRY_ID = :COUNTRY_ID,
           REGION_ID = :REGION_ID,
           DISTRICT_NAME = :DISTRICT_NAME
       WHERE DISTRICT_ID = :id`,
      { ...data, id },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

/* DELETE DISTRICT */
export const deleteDistrict = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM DISTRICT_LIST WHERE DISTRICT_ID = :id`,
      { id },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};