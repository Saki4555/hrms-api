import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";

/* ASSIGN SUPERVISOR TO EMPLOYEE */
export const assignSupervisor = async (data) => {
  console.log("assignSupervisor received:", data);
  const conn = await getConnection();
  try {
    const existing = await conn.execute(
      `SELECT ID FROM HCM.HR_EMPLOYEE_SUPERVISOR
        WHERE PERSON_ID = :PERSON_ID AND STATUS = 1`,
      { PERSON_ID: data.PERSON_ID },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    if (existing.rows.length > 0) {
      throw new Error(
        "Employee already has an active supervisor. Update or remove existing one first.",
      );
    }

    const result = await conn.execute(
      `INSERT INTO HCM.HR_EMPLOYEE_SUPERVISOR
         (PERSON_ID, SUPERVISOR_ID, STATUS, CREATED_BY, CREATED_DATE)
       VALUES
         (:PERSON_ID, :SUPERVISOR_ID, 1, :CREATED_BY, SYSDATE)
       RETURNING ID INTO :ID`,
      {
        PERSON_ID:     data.PERSON_ID,
        SUPERVISOR_ID: data.SUPERVISOR_ID,
        CREATED_BY:    data.CREATED_BY ?? null,
        ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true },
    );
    return { id: result.outBinds.ID[0] };
  } catch (error) {
    console.error(error);
    throw error; // ← this was missing
  } finally {
    await conn.close();
  }
};
/* GET ALL SUPERVISOR ASSIGNMENTS */
export const getAllSupervisorAssignments = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         es.ID,
         es.PERSON_ID,
         es.SUPERVISOR_ID,
         es.STATUS,
         es.CREATED_DATE,
         e.FIRST_NAME       AS EMP_FIRST_NAME,
         e.LAST_NAME        AS EMP_LAST_NAME,
         e.EMP_NO,
         e.TITLE            AS EMP_TITLE,
         s.FIRST_NAME       AS SUP_FIRST_NAME,
         s.LAST_NAME        AS SUP_LAST_NAME,
         s.EMP_NO           AS SUP_EMP_NO,
         s.TITLE            AS SUP_TITLE
       FROM HCM.HR_EMPLOYEE_SUPERVISOR es
       LEFT JOIN HCM.HR_EMPLOYEE e ON es.PERSON_ID     = e.PERSON_ID
       LEFT JOIN HCM.HR_EMPLOYEE s ON es.SUPERVISOR_ID = s.PERSON_ID
       ORDER BY es.ID DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

/* GET SUPERVISOR BY EMPLOYEE (PERSON_ID) */
export const getSupervisorByEmployee = async (personId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         es.ID,
         es.PERSON_ID,
         es.SUPERVISOR_ID,
         es.STATUS,
         s.FIRST_NAME  AS SUP_FIRST_NAME,
         s.LAST_NAME   AS SUP_LAST_NAME,
         s.EMP_NO      AS SUP_EMP_NO,
         s.TITLE       AS SUP_TITLE
       FROM HCM.HR_EMPLOYEE_SUPERVISOR es
       LEFT JOIN HCM.HR_EMPLOYEE s ON es.SUPERVISOR_ID = s.PERSON_ID
       WHERE es.PERSON_ID = :PERSON_ID AND es.STATUS = 1`,
      { PERSON_ID: parseInt(personId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

/* GET TEAM (employees under a supervisor) */
export const getTeamBySupervisor = async (supervisorId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         es.ID,
         es.PERSON_ID,
         es.STATUS,
         e.FIRST_NAME,
         e.LAST_NAME,
         e.EMP_NO,
         e.TITLE,
         e.GENDER,
         e.JOIN_DATE
       FROM HCM.HR_EMPLOYEE_SUPERVISOR es
       LEFT JOIN HCM.HR_EMPLOYEE e ON es.PERSON_ID = e.PERSON_ID
       WHERE es.SUPERVISOR_ID = :SUPERVISOR_ID AND es.STATUS = 1
       ORDER BY e.FIRST_NAME`,
      { SUPERVISOR_ID: parseInt(supervisorId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

/* UPDATE SUPERVISOR */
export const updateSupervisor = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HCM.HR_EMPLOYEE_SUPERVISOR
          SET SUPERVISOR_ID = :SUPERVISOR_ID,
              UPDATED_BY    = :UPDATED_BY,
              UPDATED_DATE  = SYSDATE
        WHERE ID = :ID`,
      {
        ID: parseInt(id),
        SUPERVISOR_ID: parseInt(data.SUPERVISOR_ID),
        UPDATED_BY: data.UPDATED_BY ?? null,
      },
      { autoCommit: true },
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

/* REMOVE SUPERVISOR (soft delete) */
export const removeSupervisor = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HCM.HR_EMPLOYEE_SUPERVISOR
          SET STATUS = 0, UPDATED_DATE = SYSDATE
        WHERE ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true },
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};
