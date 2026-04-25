import oracledb from "oracledb";
import { getConnection } from '../../config/db.js';

export const getAllInvTypes = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID, DESCRIPTIO FROM INV_TYPE ORDER BY ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getInvTypeById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID, DESCRIPTIO FROM HCM.INV_TYPE WHERE ID = :id`,
      [ id ],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

export const createInvType = async ({ description }) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO HCM.INV_TYPE (DESCRIPTIO) VALUES (:descriptio)`,
      { descriptio },
      { autoCommit: true }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

export const updateInvType = async (id, { description }) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HCM.INV_TYPE SET DESCRIPTIO = :descriptio WHERE ID = :id`,
      { id, descriptio },
      { autoCommit: true }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

export const deleteInvType = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM HCM.INV_TYPE WHERE ID = :id`,
      { id },
      { autoCommit: true }
    );
    return { rowsAffected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};