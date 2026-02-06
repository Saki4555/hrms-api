import { getConnection } from "../config/db.js";

/**
 * INSERT
 */
export const createHrOrgPosition = async (data) => {
  const conn = await getConnection();
  try {
    const sql = `
      INSERT INTO HCM.HR_ORG_POSITION (
        ORG_ID,
        POSITION_ID,
        FTE,
        ACTUAL_COUNT,
        EFFECTIVE_START_DATE,
        EFFECTIVE_END_DATE,
        STATUS
      ) VALUES (
        :ORG_ID,
        :POSITION_ID,
        :FTE,
        :ACTUAL_COUNT,
        :EFFECTIVE_START_DATE,
        :EFFECTIVE_END_DATE,
        :STATUS
      )
    `;

    const result = await conn.execute(sql, data, { autoCommit: true });
    return result;
  } finally {
    await conn.close();
  }
};

/**
 * UPDATE
 */
export const updateHrOrgPosition = async (id, data) => {
  const conn = await getConnection();
  try {
    const sql = `
      UPDATE HCM.HR_ORG_POSITION SET
        ORG_ID = :ORG_ID,
        POSITION_ID = :POSITION_ID,
        FTE = :FTE,
        ACTUAL_COUNT = :ACTUAL_COUNT,
        EFFECTIVE_START_DATE = :EFFECTIVE_START_DATE,
        EFFECTIVE_END_DATE = :EFFECTIVE_END_DATE,
        STATUS = :STATUS
      WHERE ID = :ID
    `;

    const result = await conn.execute(
      sql,
      { ...data, ID: id },
      { autoCommit: true }
    );

    return result;
  } finally {
    await conn.close();
  }
};

/**
 * DELETE
 */
export const deleteHrOrgPosition = async (id) => {
  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `UPDATE HCM.HR_ORG_POSITION
       SET STATUS = 0
       WHERE ID = :ID`,
      { ID: id },
      { autoCommit: true }
    );

    return result;
  } finally {
    await conn.close();
  }
};


export const getAllHrOrgPositions = async () => {
  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `SELECT * FROM HCM.HR_ORG_POSITION
       WHERE STATUS = 1`,
      [],
      { outFormat: 4002 } // Object format
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

