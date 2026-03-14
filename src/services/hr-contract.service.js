

import { getConnection } from "../config/db.js";

/* CREATE CONTRACT */

export const createContract = async (data) => {

  const conn = await getConnection();

  try {

   

    /*  Insert Contract */

    const sql = `
      INSERT INTO HCM.HR_CONTRACT
      (
        
        EMPLOYEE_ID,
        CONTRACT_TYPE,
        START_DATE,
        END_DATE,
        SALARY_CURRENCY,
        SALARY_AMOUNT,
        PROBATION_PERIOD_MONTHS,
        NOTICE_PERIOD_DAYS,
        CREATED_BY
      )
      VALUES
      (
    
        :EMPLOYEE_ID,
        :CONTRACT_TYPE,
        TO_DATE(:START_DATE,'YYYY-MM-DD'),
        TO_DATE(:END_DATE,'YYYY-MM-DD'),
        :SALARY_CURRENCY,
        :SALARY_AMOUNT,
        :PROBATION_PERIOD_MONTHS,
        :NOTICE_PERIOD_DAYS,
        :CREATED_BY
      )
    `;

    await conn.execute(sql, data, { autoCommit: true });

    return { message: "Contract Created Successfully" };

  } catch (error) {

    throw error;

  } finally {

    await conn.close();

  }

};


/* GET ALL */
// export const getAllContracts = async () => {

//   const conn = await getConnection();

//   const result = await conn.execute(`
//     SELECT *
//     FROM HCM.HR_CONTRACT
//     ORDER BY CONTRACT_ID DESC
//   `, [], {outFormat: 4002});

//   await conn.close();

//   return result.rows;
// };

/* GET ALL */
export const getAllContracts = async () => {

  const conn = await getConnection();

  const result = await conn.execute(`
    SELECT 
      C.CONTRACT_ID,
      C.EMPLOYEE_ID,
      E.EMP_NO,
      E.TITLE,
      E.FIRST_NAME,
      E.LAST_NAME,
      C.CONTRACT_TYPE,
      C.START_DATE,
      C.END_DATE,
      C.SALARY_CURRENCY,
      C.SALARY_AMOUNT,
      C.PROBATION_PERIOD_MONTHS,
      C.NOTICE_PERIOD_DAYS,
      C.CREATED_BY,
      C.CREATED_DATE
    FROM HCM.HR_CONTRACT C
    LEFT JOIN HCM.HR_EMPLOYEE E
      ON C.EMPLOYEE_ID = E.PERSON_ID
    ORDER BY C.CONTRACT_ID DESC
  `, [], { outFormat: 4002 });

  await conn.close();

  return result.rows;
};

/* GET SINGLE */
// export const getContractById = async (id) => {

//   const conn = await getConnection();

//   const result = await conn.execute(
//     `SELECT * FROM HCM.HR_CONTRACT WHERE CONTRACT_ID = :id`,
//     [id], {outFormat: 4002}
//   );

//   await conn.close();

//   return result.rows[0];
// };

/* GET SINGLE */
export const getContractById = async (id) => {

  const conn = await getConnection();

  const result = await conn.execute(
    `
    SELECT 
      C.CONTRACT_ID,
      C.EMPLOYEE_ID,
      E.EMP_NO,
      E.TITLE,
      E.FIRST_NAME,
      E.LAST_NAME,
      C.CONTRACT_TYPE,
      C.START_DATE,
      C.END_DATE,
      C.SALARY_CURRENCY,
      C.SALARY_AMOUNT,
      C.PROBATION_PERIOD_MONTHS,
      C.NOTICE_PERIOD_DAYS
    FROM HCM.HR_CONTRACT C
    LEFT JOIN HCM.HR_EMPLOYEE E
      ON C.EMPLOYEE_ID = E.PERSON_ID
    WHERE C.CONTRACT_ID = :id
    `,
    [id],
    { outFormat: 4002 }
  );

  await conn.close();

  return result.rows[0];
};

/* UPDATE */
export const updateContract = async (id, data) => {

  const conn = await getConnection();

  const sql = `
    UPDATE HCM.HR_CONTRACT SET
      EMPLOYEE_ID = :EMPLOYEE_ID,
      CONTRACT_TYPE = :CONTRACT_TYPE,
      START_DATE = TO_DATE(:START_DATE,'YYYY-MM-DD'),
      END_DATE = TO_DATE(:END_DATE,'YYYY-MM-DD'),
      SALARY_CURRENCY = :SALARY_CURRENCY,
      SALARY_AMOUNT = :SALARY_AMOUNT,
      PROBATION_PERIOD_MONTHS = :PROBATION_PERIOD_MONTHS,
      NOTICE_PERIOD_DAYS = :NOTICE_PERIOD_DAYS,
      UPDATED_BY = :UPDATED_BY,
      UPDATED_DATE = SYSTIMESTAMP
    WHERE CONTRACT_ID = :id
  `;

  await conn.execute(sql, { ...data, id }, { autoCommit: true });

  await conn.close();

  return { message: "Contract Updated Successfully" };
};


/* DELETE */
export const deleteContract = async (id) => {

  const conn = await getConnection();

  await conn.execute(
    `DELETE FROM HCM.HR_CONTRACT WHERE CONTRACT_ID = :id`,
    [id],
    { autoCommit: true }
  );

  await conn.close();

  return { message: "Contract Deleted Successfully" };
};