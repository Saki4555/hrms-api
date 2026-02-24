import { getConnection } from "../config/db.js";

/* CREATE UPAZILLA */
export const createUpazilla = async (data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO HCM.UPAZILLA_LIST
       (UPAZILLA_NAME, DISTRICT_ID)
       VALUES (:UPAZILLA_NAME, :DISTRICT_ID)`,
      data,
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/* GET ALL UPAZILLAS WITH DISTRICT, REGION & COUNTRY */
export const getAllUpazillas = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
          u.UPAZILLA_ID,
          u.UPAZILLA_NAME,
          u.DISTRICT_ID,
          d.DISTRICT_NAME,
          r.REGION_ID,
          r.REGION_NAME,
          c.COUNTRY_ID,
          c.COUNTRY_NAME
       FROM HCM.UPAZILLA_LIST u
       JOIN HCM.DISTRICT_LIST d ON u.DISTRICT_ID = d.DISTRICT_ID
       JOIN HCM.REGION_LIST r ON d.REGION_ID = r.REGION_ID
       JOIN HCM.COUNTRY_LIST c ON d.COUNTRY_ID = c.COUNTRY_ID
       ORDER BY u.UPAZILLA_ID`,
      [],
      { outFormat: 4002 } // object format
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

/* GET SINGLE UPAZILLA BY ID */
export const getUpazillaById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
          u.UPAZILLA_ID,
          u.UPAZILLA_NAME,
          u.DISTRICT_ID,
          d.DISTRICT_NAME,
          r.REGION_ID,
          r.REGION_NAME,
          c.COUNTRY_ID,
          c.COUNTRY_NAME
       FROM HCM.UPAZILLA_LIST u
       JOIN HCM.DISTRICT_LIST d ON u.DISTRICT_ID = d.DISTRICT_ID
       JOIN HCM.REGION_LIST r ON d.REGION_ID = r.REGION_ID
       JOIN HCM.COUNTRY_LIST c ON d.COUNTRY_ID = c.COUNTRY_ID
       WHERE u.UPAZILLA_ID = :id`,
      { id },
      { outFormat: 4002 }
    );
    return result.rows[0];
  } finally {
    await conn.close();
  }
};

/* UPDATE UPAZILLA */
export const updateUpazilla = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HCM.UPAZILLA_LIST
       SET UPAZILLA_NAME = :UPAZILLA_NAME,
           DISTRICT_ID = :DISTRICT_ID
       WHERE UPAZILLA_ID = :id`,
      { ...data, id },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

/* DELETE UPAZILLA */
export const deleteUpazilla = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM HCM.UPAZILLA_LIST WHERE UPAZILLA_ID = :id`,
      { id },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};