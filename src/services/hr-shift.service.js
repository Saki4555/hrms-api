
import { getConnection } from "../config/db.js";

/* INSERT SHIFT */
export const createShift = async (data) => {

  const conn = await getConnection();

 
const sql = `
  INSERT INTO HR_SHIFT
  ( CODE, NAME, START_TIME, END_TIME,
    GRACE_IN_MINUTES, GRACE_OUT_MINUTES, OVERNIGHT_FLAG,
    WEEKLY_HOLIDAY_1, WEEKLY_HOLIDAY_2,
    CREATED_BY)
  VALUES
  ( :CODE, :NAME, :START_TIME, :END_TIME,
    :GRACE_IN_MINUTES, :GRACE_OUT_MINUTES, :OVERNIGHT_FLAG,
    :WEEKLY_HOLIDAY_1, :WEEKLY_HOLIDAY_2,
    :CREATED_BY)
`;


  await conn.execute(sql, data, { autoCommit: true });

  await conn.close();

  return { message: "Shift Created Successfully" };
};


/* GET ALL */
export const getAllShift = async () => {

  const conn = await getConnection();

  const result = await conn.execute(`
    SELECT * FROM HCM.HR_SHIFT
    ORDER BY SHIFT_ID DESC
  `, [], {outFormat : 4002});

  await conn.close();

  return result.rows;
};


/* GET SINGLE */
export const getShiftById = async (id) => {

  const conn = await getConnection();

  const result = await conn.execute(
    `SELECT * FROM HCM.HR_SHIFT WHERE SHIFT_ID = :id`,
    [id]
  );

  await conn.close();

  return result.rows[0];
};


/* UPDATE */
export const updateShift = async (id, data) => {

  const conn = await getConnection();

  const sql = `
  UPDATE HCM.HR_SHIFT SET
    CODE = :CODE,
    NAME = :NAME,
    START_TIME = :START_TIME,
    END_TIME = :END_TIME,
    GRACE_IN_MINUTES = :GRACE_IN_MINUTES,
    GRACE_OUT_MINUTES = :GRACE_OUT_MINUTES,
    OVERNIGHT_FLAG = :OVERNIGHT_FLAG,
    WEEKLY_HOLIDAY_1 = :WEEKLY_HOLIDAY_1,
    WEEKLY_HOLIDAY_2 = :WEEKLY_HOLIDAY_2,
    UPDATED_BY = :UPDATED_BY,
    UPDATED_DATE = SYSTIMESTAMP
  WHERE SHIFT_ID = :id
`;

  await conn.execute(sql, { ...data, id }, { autoCommit: true });

  await conn.close();

  return { message: "Shift Updated" };
};


/* DELETE */
export const deleteShift = async (id) => {

  const conn = await getConnection();

  await conn.execute(
    `DELETE FROM HCM.HR_SHIFT WHERE SHIFT_ID = :id`,
    [id],
    { autoCommit: true }
  );

  await conn.close();

  return { message: "Shift Deleted" };
};