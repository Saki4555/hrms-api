import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

/* CREATE */
export const createUOMService = async (data) => {
  const conn = await getConnection();

  const result = await conn.execute(
    `INSERT INTO INV_UOM (ID, NAME)
     VALUES (UOM_SEQ.NEXTVAL, :NAME)
     RETURNING ID INTO :id`,
    {
      NAME: data.NAME,
      id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    },
    { autoCommit: true }
  );

  await conn.close();
  return result.outBinds.id[0];
};

/* GET ALL */
export const getAllUOMService = async () => {
  const conn = await getConnection();

  const result = await conn.execute(`SELECT * FROM INV_UOM`, [], {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
  });

  await conn.close();
  return result.rows;
};

/* GET ONE */
export const getUOMByIdService = async (id) => {
  const conn = await getConnection();

  const result = await conn.execute(
    `SELECT * FROM INV_UOM WHERE ID = :id`,
    [id],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  await conn.close();
  return result.rows[0];
};

/* UPDATE */
export const updateUOMService = async (id, data) => {
  const conn = await getConnection();

  await conn.execute(
    `UPDATE INV_UOM SET NAME = :NAME WHERE ID = :id`,
    { id, NAME: data.NAME },
    { autoCommit: true }
  );

  await conn.close();
};

/* DELETE */
export const deleteUOMService = async (id) => {
  const conn = await getConnection();

  await conn.execute(
    `DELETE FROM INV_UOM WHERE ID = :id`,
    [id],
    { autoCommit: true }
  );

  await conn.close();
};
