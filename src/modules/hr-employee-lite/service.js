// src\modules\hr-employee-lite\service.js
import { getConnection } from "../../config/db.js";

export const searchEmployeesLite = async (searchTerm = "") => {
  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `SELECT * FROM (
         SELECT
           PERSON_ID AS "id",
           TRIM(NVL(FIRST_NAME, '') || ' ' || NVL(LAST_NAME, '')) AS "name",
           EMP_NO AS "empNo"
         FROM HCM.HR_EMPLOYEE
         WHERE (
              UPPER(EMP_NO)                                                 LIKE UPPER(:SEARCH)
           OR UPPER(NVL(FIRST_NAME, ''))                                    LIKE UPPER(:SEARCH)
           OR UPPER(NVL(LAST_NAME, ''))                                     LIKE UPPER(:SEARCH)
           OR UPPER(TRIM(NVL(FIRST_NAME,'') || ' ' || NVL(LAST_NAME,'')))  LIKE UPPER(:SEARCH)
         )
         -- //TODO: uncomment once all employee records have STATUS populated
         -- AND STATUS = 1
         ORDER BY EMP_NO ASC
       ) WHERE ROWNUM <= 10`,
      { SEARCH: `%${searchTerm.trim()}%` },
      { outFormat: 4002 }
    );

    return result.rows;
  } finally {
    await conn.close();
  }
};