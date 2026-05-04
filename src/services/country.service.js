
import { getConnection } from "../config/db.js";

/* CREATE */
export const createCountry = async (data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO COUNTRY_LIST ( COUNTRY_NAME)
       VALUES ( :COUNTRY_NAME)`,
      data,
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};


/* GET ALL */
export const getAllCountries = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM COUNTRY_LIST ORDER BY COUNTRY_ID`, [], {outFormat: 4002}
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};


/* UPDATE */
export const updateCountry = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE COUNTRY_LIST
       SET COUNTRY_NAME = :COUNTRY_NAME
       WHERE COUNTRY_ID = :id`,
      { ...data, id },
      { autoCommit: true }
    );

    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};