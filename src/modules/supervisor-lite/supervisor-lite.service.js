// src/modules/hr-supervisor-lite/service.js
import { getConnection } from "../../config/db.js";

// Roles that qualify as a supervisor-type user.
// Checked case-insensitively so 'supervisor' / 'Supervisor' both match.
const SUPERVISOR_ROLES = ["Supervisor", "Team Lead", "Manager"];

export const searchSupervisorsLite = async (searchTerm = "") => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM (
         SELECT DISTINCT
           u.ID                                                               AS "id",
  e.PERSON_ID                                                        AS "employeeId",
           TRIM(NVL(e.FIRST_NAME, '') || ' ' || NVL(e.LAST_NAME, ''))   AS "name",
           e.EMP_NO                                                       AS "empNo",
           r.ROLE_NAME                                                    AS "role"
         FROM HR_EMPLOYEE  e
         JOIN USERS        u   ON u.EMPLOYEE_ID  = e.PERSON_ID
                                  AND u.STATUS        = 'ACTIVE'
         JOIN USER_ROLES   ur  ON ur.USER_ID      = u.ID
         JOIN ROLES        r   ON r.ID            = ur.ROLE_ID
                                  AND UPPER(r.ROLE_NAME) IN (
                                        ${SUPERVISOR_ROLES.map((r) => `UPPER('${r}')`).join(", ")}
                                      )
         WHERE (
              UPPER(e.EMP_NO)                                                  LIKE UPPER(:SEARCH)
           OR UPPER(NVL(e.FIRST_NAME, ''))                                     LIKE UPPER(:SEARCH)
           OR UPPER(NVL(e.LAST_NAME,  ''))                                     LIKE UPPER(:SEARCH)
           OR UPPER(TRIM(NVL(e.FIRST_NAME,'') || ' ' || NVL(e.LAST_NAME,''))) LIKE UPPER(:SEARCH)
         )
         -- TODO: uncomment once all employee records have STATUS populated
         -- AND e.STATUS = 1
         ORDER BY e.EMP_NO ASC
       ) WHERE ROWNUM <= 10`,
      { SEARCH: `%${searchTerm.trim()}%` },
      { outFormat: 4002 },
    );

    return result.rows;
  } finally {
    await conn.close();
  }
};
