import { getConnection } from "../config/db.js";

/* CREATE */
export const createEmployee = async (data) => {
  const conn = await getConnection();

  const sql = `
    INSERT INTO HCM.HR_EMPLOYEE (
      EMP_NO,
      TITLE,
      FIRST_NAME,
      LAST_NAME,
      FATHERS_NAME,
      FATHERS_NAME_B,
      MOTHERS_NAME,
      MOTHERS_NAME_B,
      GENDER,
      DATE_OF_BIRTH,
      NID,
      BIRTH_REG_NO,
      TOWN_OF_BIRTH,
      REGION_OF_BIRTH,
      COUNTRY_OF_BIRTH,
      MARRITIAL_STATUS,
      NATIONALITY,
      JOIN_DATE,
      PERSON_TYPE_ID,
      REG_DISABILITY,
      EFFECTIVE_START_DATE,
      "EFFECTIVEEND_DATE",
      STATUS,
      CREATION_DATE
    )
    VALUES (
      :EMP_NO,
      :TITLE,
      :FIRST_NAME,
      :LAST_NAME,
      :FATHERS_NAME,
      :FATHERS_NAME_B,
      :MOTHERS_NAME,
      :MOTHERS_NAME_B,
      :GENDER,
      TO_DATE(:DATE_OF_BIRTH, 'YYYY-MM-DD'),
      :NID,
      :BIRTH_REG_NO,
      :TOWN_OF_BIRTH,
      :REGION_OF_BIRTH,
      :COUNTRY_OF_BIRTH,
      :MARRITIAL_STATUS,
      :NATIONALITY,
      TO_DATE(:JOIN_DATE, 'YYYY-MM-DD'),
      :PERSON_TYPE_ID,
      :REG_DISABILITY,
      TO_DATE(:EFFECTIVE_START_DATE, 'YYYY-MM-DD'),
      TO_DATE(:EFFECTIVEEND_DATE, 'YYYY-MM-DD'),
      1,
      SYSDATE
    )
  `;

  await conn.execute(sql, data, { autoCommit: true });
  console.log("data",data)
  await conn.close();
};


/* UPDATE */
export const updateEmployee = async (personId, data) => {
  const conn = await getConnection();

  const sql = `
    UPDATE HCM.HR_EMPLOYEE
       SET EMP_NO = :EMP_NO,
           TITLE = :TITLE,
           FIRST_NAME = :FIRST_NAME,
           LAST_NAME = :LAST_NAME,
           FATHERS_NAME = :FATHERS_NAME,
           FATHERS_NAME_B = :FATHERS_NAME_B,
           MOTHERS_NAME = :MOTHERS_NAME,
           MOTHERS_NAME_B = :MOTHERS_NAME_B,
           GENDER = :GENDER,
           DATE_OF_BIRTH = TO_DATE(:DATE_OF_BIRTH, 'YYYY-MM-DD'),
           NID = :NID,
           BIRTH_REG_NO = :BIRTH_REG_NO,
           TOWN_OF_BIRTH = :TOWN_OF_BIRTH,
           REGION_OF_BIRTH = :REGION_OF_BIRTH,
           COUNTRY_OF_BIRTH = :COUNTRY_OF_BIRTH,
           MARRITIAL_STATUS = :MARRITIAL_STATUS,
           NATIONALITY = :NATIONALITY,
           JOIN_DATE = TO_DATE(:JOIN_DATE, 'YYYY-MM-DD'),
           PERSON_TYPE_ID = :PERSON_TYPE_ID,
           REG_DISABILITY = :REG_DISABILITY,
           EFFECTIVE_START_DATE = TO_DATE(:EFFECTIVE_START_DATE, 'YYYY-MM-DD'),
           "EFFECTIVEEND_DATE" = TO_DATE(:EFFECTIVEEND_DATE, 'YYYY-MM-DD'),
           STATUS = :STATUS,
           LAST_UPDATE_DATE = SYSDATE,
           LAST_UPDATE_BY = :LAST_UPDATE_BY
     WHERE PERSON_ID = :PERSON_ID
  `;

  await conn.execute(
    sql,
    { ...data, PERSON_ID: personId },
    { autoCommit: true }
  );

  console.log("data",data)

  await conn.close();
};


/* SOFT DELETE */
export const softDeleteEmployee = async (personId) => {
  const conn = await getConnection();

  await conn.execute(
    `UPDATE HCM.HR_EMPLOYEE
        SET STATUS = 0,
            LAST_UPDATE_DATE = SYSDATE
      WHERE PERSON_ID = :PERSON_ID`,
    { PERSON_ID: personId },
    { autoCommit: true }
  );

  await conn.close();
};

/* GET ALL ACTIVE */
export const getEmployeeList = async () => {
  const conn = await getConnection();

  const result = await conn.execute(
    `SELECT * FROM HCM.HR_EMPLOYEE
      WHERE STATUS = 1
      ORDER BY PERSON_ID`,
    [],
    { outFormat: 4002 }
  );

  await conn.close();
  return result.rows;
};


// services/hrEmployee.service.js

export const getEmployeeById = async (personId) => {
  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `SELECT *
         FROM HCM.HR_EMPLOYEE
        WHERE PERSON_ID = :PERSON_ID
          AND STATUS = 1`,
      { PERSON_ID: personId },
      { outFormat: 4002 } // OBJECT
    );

    return result.rows[0] || null;
  } finally {
    await conn.close();
  }
};
