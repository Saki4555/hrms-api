

import { getConnection } from "../config/db.js";

/* CREATE */
export const createPosition = async (data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO HR_POSITION 
      (TITLE, GRADE, LEVELS, NOTES, CREATED_BY, CREATED_DATE)
      VALUES ( :TITLE, :GRADE, :LEVELS, :NOTES, :CREATED_BY, SYSTIMESTAMP)`,
      data,
      { autoCommit: true }
    );
    return result;
  } finally {
    await conn.close();
  }
};

/* UPDATE */
export const updatePosition = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HR_POSITION SET
        TITLE = :TITLE,
        GRADE = :GRADE,
        LEVELS = :LEVELS,
        NOTES = :NOTES,
        UPDATED_BY = :UPDATED_BY,
        UPDATED_DATE = SYSTIMESTAMP
       WHERE POSITION_ID = :POSITION_ID`,
      { ...data, POSITION_ID: id },
      { autoCommit: true }
    );
    return result;
  } finally {
    await conn.close();
  }
};

/* DELETE */
// export const deletePosition = async (id) => {
//   const conn = await getConnection();
//   try {
//     const result = await conn.execute(
//       `DELETE FROM HR_POSITION WHERE POSITION_ID = :id`,
//       { id },
//       { autoCommit: true }
//     );
//     return result;
//   } finally {
//     await conn.close();
//   }
// };

/* GET ONE */
export const getPositionById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM HR_POSITION 
      WHERE POSITION_ID = :id`,
      { id }, {outFormat: 4002}
    );
    return result.rows[0];
  } finally {
    await conn.close();
  }
};

/* GET ALL */
export const getAllPositions = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(`SELECT * FROM HR_POSITION`
      ,[], {outFormat: 4002}
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};