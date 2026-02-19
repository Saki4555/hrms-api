import { getConnection } from "../config/db.js";



/**
 * GET SINGLE BY ID
 */
export const getHrOrgTypeById = async (id) => {
  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `SELECT 
         ID,
         ORG_TYPE,
         TO_CHAR(EFFECTIVE_START_DATE, 'YYYY-MM-DD') AS EFFECTIVE_START_DATE,
         TO_CHAR(EFFECTIVE_END_DATE, 'YYYY-MM-DD') AS EFFECTIVE_END_DATE,
         STATUS
       FROM HCM.HR_ORG_TYPE
       WHERE ID = :ID`,
      { ID: id },
      { outFormat: 4002 }
    );

    return result.rows[0]; // single record
  } finally {
    await conn.close();
  }
};


/**
 * GET ALL (only active records)
 */
export const getAllHrOrgTypes = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
  ID,
  ORG_TYPE,
  TO_CHAR(EFFECTIVE_START_DATE, 'YYYY-MM-DD') AS EFFECTIVE_START_DATE,
  TO_CHAR(EFFECTIVE_END_DATE, 'YYYY-MM-DD') AS EFFECTIVE_END_DATE,
  STATUS
FROM HCM.HR_ORG_TYPE
WHERE STATUS = 1
      `,
       [],
      { outFormat: 4002 }
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
    await conn.execute(
      `INSERT INTO HCM.HR_ORG_TYPE (
          
          ORG_TYPE,
          EFFECTIVE_START_DATE,
          EFFECTIVE_END_DATE,
          STATUS
       )
       VALUES (
          
          :ORG_TYPE,
          :EFFECTIVE_START_DATE,
          :EFFECTIVE_END_DATE,
          1
       )`,
      {
        ORG_TYPE: data.ORG_TYPE,
        EFFECTIVE_START_DATE: data.EFFECTIVE_START_DATE
          ? new Date(data.EFFECTIVE_START_DATE + "T00:00:00")
          : null,
        EFFECTIVE_END_DATE: data.EFFECTIVE_END_DATE
          ? new Date(data.EFFECTIVE_END_DATE + "T00:00:00")
          : null
      },
      { autoCommit: true }
    );

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
    const result = await conn.execute(
      `UPDATE HCM.HR_ORG_TYPE
       SET ORG_TYPE = :ORG_TYPE,
           EFFECTIVE_START_DATE = :EFFECTIVE_START_DATE,
           EFFECTIVE_END_DATE = :EFFECTIVE_END_DATE
       WHERE ID = :ID`,
      {
        ID: id,
        ORG_TYPE: data.ORG_TYPE,
       EFFECTIVE_START_DATE: data.EFFECTIVE_START_DATE
          ? new Date(data.EFFECTIVE_START_DATE + "T00:00:00")
          : null,
        EFFECTIVE_END_DATE: data.EFFECTIVE_END_DATE
          ? new Date(data.EFFECTIVE_END_DATE + "T00:00:00")
          : null
      },
      { autoCommit: true }
    );

    return result.rowsAffected;
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
  { id },
  { autoCommit: true }
);
  } finally {
    await conn.close();
  }
};