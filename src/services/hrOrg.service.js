import { getConnection } from "../config/db.js";

export const insertHrOrg = async (data) => {
  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `INSERT INTO HCM.HR_ORG (
  NAME, PARENT_ORG_ID, ORG_TYPE_ID,
  LOCATION, COST_CENTER_ID, CREATED_BY,
  CREATED_DATE, STATUS
)
VALUES (
  :NAME, :PARENT_ORG_ID, :ORG_TYPE_ID,
  :LOCATION, :COST_CENTER_ID, :CREATED_BY,
  SYSTIMESTAMP, :STATUS
)
`,
      data,
      { autoCommit: true }
    );

    return result;
  } finally {
    await conn.close();
  }
};

export const updateHrOrg = async (id, data) => {
  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `UPDATE HCM.HR_ORG SET
        NAME = :NAME,
        PARENT_ORG_ID = :PARENT_ORG_ID,
        ORG_TYPE_ID = :ORG_TYPE_ID,
        LOCATION = :LOCATION,
        COST_CENTER_ID = :COST_CENTER_ID,
        UPDATED_BY = :UPDATED_BY,
        UPDATED_DATE = SYSTIMESTAMP,
        STATUS = :STATUS
       WHERE ID = :ID`,
      { ...data, ID: id },
      { autoCommit: true }
    );

    return result;
  } finally {
    await conn.close();
  }
};

export const deleteHrOrg = async (id) => {
  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `DELETE FROM HCM.HR_ORG WHERE ID = :ID`,
      { ID: id },
      { autoCommit: true }
    );

    return result;
  } finally {
    await conn.close();
  }
};

export const getHrOrgList = async () => {
  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `SELECT * FROM HCM.HR_ORG`,
      [],
      { outFormat: 4002 } // Object format
    );

    return result.rows;
  } finally {
    await conn.close();
  }
};
