import { getConnection } from "../config/db.js";

/* INSERT */
export const createHolidayType = async (data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO HCM.HR_HOLIDAY_TYPE (NAME, STATUS)
       VALUES (:NAME, 1)`,
      data,
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/* UPDATE */
export const updateHolidayType = async (id, data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE HCM.HR_HOLIDAY_TYPE
       SET NAME = :NAME
         
       WHERE ID = :ID`,
      { ...data, ID: id },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/* SOFT DELETE */
export const softDeleteHolidayType = async (id) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE HCM.HR_HOLIDAY_TYPE
       SET STATUS = 0
       WHERE ID = :ID`,
      { ID: id },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/* GET SINGLE */
export const getHolidayTypeById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID, NAME, STATUS
       FROM HCM.HR_HOLIDAY_TYPE
       WHERE ID = :ID`,
      { ID: id },
      { outFormat: 4002 }
    );
    return result.rows[0];
  } finally {
    await conn.close();
  }
};

/* GET ALL */
export const getAllHolidayType = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID, NAME, STATUS
       FROM HCM.HR_HOLIDAY_TYPE
       WHERE STATUS = 1`,
      [],
      { outFormat: 4002 }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};