import { getConnection } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* .............todo................*/
/**
 * GET ALL (only active records)
 */
export const getAllHrOrgTypes = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT *
       FROM HCM.HR_ORG_TYPE
       WHERE STATUS = 1
       ORDER BY ID`
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

/**
 * INSERT
 */



export const createHrOrgType = async (data) => {
  const conn = await getConnection();
  try {
    const id = uuidv4(); // UUID generate

    await conn.execute(
      `INSERT INTO HCM.HR_ORG_TYPE
       (ID, ORG_TYPE, EFFECTIVE_START_DATE, EFFECTIVE_END_DATE, STATUS)
       VALUES (:id, :org_type, :start_date, :end_date, 1)`,
      {
        id: id,
        org_type: data.org_type,
        start_date: data.effective_start_date
          ? new Date(data.effective_start_date)
          : null,
        end_date: data.effective_end_date
          ? new Date(data.effective_end_date)
          : null
      }
    );

    return id; // inserted id return

  } finally {
    await conn.close();
  }
};

/**
 * UPDATE
 */
export const updateHrOrgType = async (id, data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE HCM.HR_ORG_TYPE
       SET ORG_TYPE = :org_type,
           EFFECTIVE_START_DATE = :start_date,
           EFFECTIVE_END_DATE = :end_date
       WHERE ID = :id`,
      {
        id,
        org_type: data.org_type,
        start_date: data.effective_start_date,
        end_date: data.effective_end_date
      }
    );
  } finally {
    await conn.close();
  }
};

/**
 * SOFT DELETE (STATUS = 0)
 */
export const deleteHrOrgType = async (id) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE HCM.HR_ORG_TYPE
       SET STATUS = 0,
           EFFECTIVE_END_DATE = SYSDATE
       WHERE ID = :id`,
      { id }
    );
  } finally {
    await conn.close();
  }
};