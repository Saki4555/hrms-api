import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

/* CREATE */
export const createStoreService = async (data) => {
  const conn = await getConnection();

  const result = await conn.execute(
    `INSERT INTO STORES 
     (STORE_ID, STORE_NAME, LOCATION, STATUS, ACCOUNTED, SALES_STATUS, UNIT_ID)
     VALUES (STORE_SEQ.NEXTVAL, :STORE_NAME, :LOCATION, :STATUS, :ACCOUNTED, :SALES_STATUS, :UNIT_ID)
     RETURNING STORE_ID INTO :id`,
    {
      ...data,
      id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    },
    { autoCommit: true }
  );

  await conn.close();
  return result.outBinds.id[0];
};

/* GET ALL */
export const getAllStoresService = async () => {
  const conn = await getConnection();

  const result = await conn.execute(`SELECT * FROM STORES`, [], {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
  });

  await conn.close();
  return result.rows;
};

/* GET ONE */
export const getStoreByIdService = async (id) => {
  const conn = await getConnection();

  const result = await conn.execute(
    `SELECT * FROM STORES WHERE STORE_ID = :id`,
    [id],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  await conn.close();
  return result.rows[0];
};

/* UPDATE */
export const updateStoreService = async (id, data) => {
  const conn = await getConnection();

  await conn.execute(
    `UPDATE STORES SET 
      STORE_NAME = :STORE_NAME,
      LOCATION = :LOCATION,
      STATUS = :STATUS,
      ACCOUNTED = :ACCOUNTED,
      SALES_STATUS = :SALES_STATUS,
      UNIT_ID = :UNIT_ID
     WHERE STORE_ID = :id`,
    { id, ...data },
    { autoCommit: true }
  );

  await conn.close();
};

/* DELETE */
export const deleteStoreService = async (id) => {
  const conn = await getConnection();

  await conn.execute(
    `DELETE FROM STORES WHERE STORE_ID = :id`,
    [id],
    { autoCommit: true }
  );

  await conn.close();
};
