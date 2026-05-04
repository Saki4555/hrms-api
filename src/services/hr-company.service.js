import { getConnection } from "../config/db.js";


/* CREATE */
export const createCompany = async (data) => {
  const conn = await getConnection();

  const sql = `
    INSERT INTO HR_COMPANY (
    
      COMPANY_NAME,
      COMPANY_DETAIL,
      BIN_NO,
      ADDRESS,
      EFFECTIVE_START_DATE,
      EFFECTIVE_END_DATE,
      STATUS
    ) VALUES (
     
      :COMPANY_NAME,
      :COMPANY_DETAIL,
      :BIN_NO,
      :ADDRESS,
      TO_DATE(:EFFECTIVE_START_DATE,'YYYY-MM-DD'),
      TO_DATE(:EFFECTIVE_END_DATE,'YYYY-MM-DD'),
      1
    )
  `;

  await conn.execute(sql, data, { autoCommit: true });
  await conn.close();
};


/* UPDATE */
export const updateCompany = async (id, data) => {
  const conn = await getConnection();

  const sql = `
    UPDATE HR_COMPANY SET
      COMPANY_NAME = :COMPANY_NAME,
      COMPANY_DETAIL = :COMPANY_DETAIL,
      BIN_NO = :BIN_NO,
      ADDRESS = :ADDRESS,
      EFFECTIVE_START_DATE = TO_DATE(:EFFECTIVE_START_DATE, 'YYYY-MM-DD'),
      EFFECTIVE_END_DATE = TO_DATE(:EFFECTIVE_END_DATE, 'YYYY-MM-DD')
    WHERE COMPANY_ID = :COMPANY_ID
      AND STATUS = 1
  `;

  const result = await conn.execute(
    sql,
    { ...data, COMPANY_ID: id },
    { autoCommit: true }
  );

  await conn.close();

  return result.rowsAffected;
};


/* SOFT DELETE */
export const deleteCompany = async (id) => {
  const conn = await getConnection();

  const sql = `
    UPDATE HR_COMPANY
    SET STATUS = 0
    WHERE COMPANY_ID = :id
  `;

  await conn.execute(sql, { id }, { autoCommit: true });
  await conn.close();
};


/* GET ALL */
export const getAllCompanies = async () => {
  const conn = await getConnection();

  const result = await conn.execute(`
    SELECT * FROM HR_COMPANY
    WHERE STATUS = 1
    ORDER BY COMPANY_ID
  `, [],{outFormat : 4002} );

  await conn.close();

  return result.rows;
};


/* GET SINGLE */
export const getCompanyById = async (id) => {
  const conn = await getConnection();

  const result = await conn.execute(
    `SELECT * FROM HR_COMPANY
     WHERE COMPANY_ID = :id`,
    { id }, {outFormat : 4002}
  );

  await conn.close();

  return result.rows[0];
};