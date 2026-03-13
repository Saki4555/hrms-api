import { getConnection } from "../config/db.js";

/* INSERT */
export const insertHoliday = async (data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO HCM.HR_HOLIDAY_CALENDER
      (LOCATION_ID, TDATE, HOLIDAY_TYPE_ID, STATUS, DESCRIPTION)
      VALUES
      ( :LOCATION_ID, TO_DATE(:TDATE,'YYYY-MM-DD'), :HOLIDAY_TYPE_ID, 1, :DESCRIPTION)`,
      data,
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/* UPDATE */
export const updateHoliday = async (id, data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE HCM.HR_HOLIDAY_CALENDER SET
        LOCATION_ID = :LOCATION_ID,
        TDATE = TO_DATE(:TDATE,'YYYY-MM-DD'),
        HOLIDAY_TYPE_ID = :HOLIDAY_TYPE_ID,
        UPDATED_BY = :UPDATED_BY,
        DESCRIPTION = :DESCRIPTION,
        LAST_UPDATE = SYSTIMESTAMP
       WHERE ID = :ID`,
      { ...data, ID: id },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/* SOFT DELETE */
export const softDeleteHoliday = async (id) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE HCM.HR_HOLIDAY_CALENDER
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
export const getHolidayById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
        h.ID,
        h.LOCATION_ID,
        l.LOCATION_NAME,
        h.TDATE,
        h.HOLIDAY_TYPE_ID,
        t.NAME AS HOLIDAY_TYPE,
        h.DESCRIPTION,
        h.STATUS
       FROM HCM.HR_HOLIDAY_CALENDER h
       JOIN HCM.HR_LOCATION l ON h.LOCATION_ID = l.ID
       JOIN HCM.HR_HOLIDAY_TYPE t ON h.HOLIDAY_TYPE_ID = t.ID
       WHERE h.ID = :ID`,
      { ID: id },
      { outFormat: 4002 }
    );
    return result.rows[0];
  } finally {
    await conn.close();
  }
};

/* GET ALL */
export const getAllHoliday = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
        h.ID,
        h.LOCATION_ID,
        l.LOCATION_NAME,
        h.TDATE,
        h.HOLIDAY_TYPE_ID,
        t.NAME AS HOLIDAY_TYPE,
        h.DESCRIPTION,
        h.STATUS
       FROM HCM.HR_HOLIDAY_CALENDER h
       JOIN HCM.HR_LOCATION l ON h.LOCATION_ID = l.ID
       JOIN HCM.HR_HOLIDAY_TYPE t ON h.HOLIDAY_TYPE_ID = t.ID
       WHERE h.STATUS = 1`,
      [],
      { outFormat: 4002 }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};