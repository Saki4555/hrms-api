import { getConnection } from "../config/db.js";


/* .............todo................*/

/* INSERT */
export const create = async (data) => {
  let conn;
  try {
    conn = await getConnection();

    await conn.execute(
      `INSERT INTO HCM.HR_PERSON_TYPE (
          PERSON_TYPE_ID,
          PERSON_TYPE,
          DESCRIPTION,
          EFFECTIVE_START_DATE,
          EFFECTIVE_END_DATE,
          STATUS
      ) VALUES (
           :PERSON_TYPE_ID,
          :PERSON_TYPE,
          :DESCRIPTION,
          :EFFECTIVE_START_DATE,
          :EFFECTIVE_END_DATE,
          1
      )`,
      {
         PERSON_TYPE_ID:data.PERSON_TYPE_ID,
        PERSON_TYPE: data.PERSON_TYPE,
        DESCRIPTION: data.DESCRIPTION,
        EFFECTIVE_START_DATE: new Date(data.EFFECTIVE_START_DATE),
        EFFECTIVE_END_DATE: data.EFFECTIVE_END_DATE
          ? new Date(data.EFFECTIVE_END_DATE)
          : null
      },
      { autoCommit: true }
    );

    return { message: "Created successfully" };

  } catch (err) {
    console.error("Create Error:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};


/* GET ALL */
export const getAll = async () => {
  let conn;
  try {
    conn = await getConnection();

    const result = await conn.execute(
      `SELECT *
       FROM HCM.HR_PERSON_TYPE
       WHERE STATUS = 1`,
      {},
      { outFormat: 4002 }
    );

    return result.rows;

  } catch (err) {
    console.error("GetAll Error:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};


/* GET SINGLE */
export const getById = async (id) => {
  let conn;
  try {
    conn = await getConnection();

    const result = await conn.execute(
      `SELECT *
       FROM HCM.HR_PERSON_TYPE
       WHERE PERSON_TYPE_ID = :PERSON_TYPE_ID
         AND STATUS = 1`,
      { PERSON_TYPE_ID: Number(id) },
      { outFormat: 4002 }
    );

    return result.rows?.[0] || null;

  } catch (err) {
    console.error("GetById Error:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};


/* UPDATE */
export const update = async (id, data) => {
  let conn;
  try {
    conn = await getConnection();

    await conn.execute(
      `UPDATE HCM.HR_PERSON_TYPE
       SET PERSON_TYPE = :PERSON_TYPE,
           DESCRIPTION = :DESCRIPTION,
           EFFECTIVE_START_DATE = :EFFECTIVE_START_DATE,
           EFFECTIVE_END_DATE = :EFFECTIVE_END_DATE
       WHERE PERSON_TYPE_ID = :PERSON_TYPE_ID
         AND STATUS = 1`,
      {
        PERSON_TYPE_ID: Number(id),
        PERSON_TYPE: data.PERSON_TYPE,
        DESCRIPTION: data.DESCRIPTION,
        EFFECTIVE_START_DATE: new Date(data.EFFECTIVE_START_DATE),
        EFFECTIVE_END_DATE: data.EFFECTIVE_END_DATE
          ? new Date(data.EFFECTIVE_END_DATE)
          : null
      },
      { autoCommit: true }
    );

    return { message: "Updated successfully" };

  } catch (err) {
    console.error("Update Error:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};


/* SOFT DELETE */
export const softDelete = async (id) => {
  let conn;
  try {
    conn = await getConnection();

    await conn.execute(
      `UPDATE HCM.HR_PERSON_TYPE
       SET STATUS = 0
       WHERE PERSON_TYPE_ID = :PERSON_TYPE_ID`,
      { PERSON_TYPE_ID: Number(id) },
      { autoCommit: true }
    );

    return { message: "Soft deleted successfully" };

  } catch (err) {
    console.error("Delete Error:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};
