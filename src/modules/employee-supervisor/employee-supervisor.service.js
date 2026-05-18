// src\modules\employee-supervisor\employee-supervisor.service.js
import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Circular reporting check using Oracle CONNECT BY.
 *
 * Walks the supervisor chain starting from `supervisorId` upward.
 * If `employeeId` appears anywhere in that chain, assigning them
 * as a supervisor would create a loop (e.g. A→B→C→A).
 *
 * Returns true if a circular chain WOULD be created.
 */
const wouldCreateCircularChain = async (conn, employeeId, supervisorId) => {
  const result = await conn.execute(
    `SELECT COUNT(*) AS CNT
       FROM (
         SELECT SUPERVISOR_ID
           FROM HR_EMPLOYEE_SUPERVISOR
          WHERE STATUS = 1
          START WITH PERSON_ID = :SUPERVISOR_ID
          CONNECT BY NOCYCLE PRIOR SUPERVISOR_ID = PERSON_ID
            AND STATUS = 1
       )
      WHERE SUPERVISOR_ID = :EMPLOYEE_ID`,
    {
      SUPERVISOR_ID: parseInt(supervisorId),
      EMPLOYEE_ID:   parseInt(employeeId),
    },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return (result.rows[0]?.CNT ?? 0) > 0;
};

// ─────────────────────────────────────────────────────────────────────────────
//  ASSIGN SUPERVISOR
// ─────────────────────────────────────────────────────────────────────────────

export const assignSupervisor = async (data) => {
  console.log("assignSupervisor received:", data);
  const conn = await getConnection();
  try {

    // ── Guard 1: Self-assignment ──────────────────────────────────────────────
    if (parseInt(data.PERSON_ID) === parseInt(data.SUPERVISOR_ID)) {
      throw new Error("An employee cannot be their own supervisor.");
    }

    // ── Guard 2: Already has an active supervisor ─────────────────────────────
    const existing = await conn.execute(
      `SELECT ID FROM HR_EMPLOYEE_SUPERVISOR
        WHERE PERSON_ID = :PERSON_ID AND STATUS = 1`,
      { PERSON_ID: parseInt(data.PERSON_ID) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length > 0) {
      throw new Error(
        "This employee already has an active supervisor. " +
        "Please remove the existing supervisor before assigning a new one."
      );
    }

    // ── Guard 3: Circular chain ───────────────────────────────────────────────
    const isCircular = await wouldCreateCircularChain(
      conn,
      data.PERSON_ID,
      data.SUPERVISOR_ID
    );
    if (isCircular) {
      throw new Error(
        "Circular reporting chain detected. This supervisor already reports " +
        "(directly or indirectly) to this employee."
      );
    }

    // ── Insert ────────────────────────────────────────────────────────────────
    const result = await conn.execute(
      `INSERT INTO HR_EMPLOYEE_SUPERVISOR
         (PERSON_ID, SUPERVISOR_ID, STATUS, CREATED_BY, CREATED_DATE)
       VALUES
         (:PERSON_ID, :SUPERVISOR_ID, 1, :CREATED_BY, SYSDATE)
       RETURNING ID INTO :ID`,
      {
        PERSON_ID:     parseInt(data.PERSON_ID),
        SUPERVISOR_ID: parseInt(data.SUPERVISOR_ID),
        CREATED_BY:    data.CREATED_BY ?? null,
        ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );

    return { id: result.outBinds.ID[0] };
  } catch (error) {
    console.error("assignSupervisor error:", error.message);
    throw error;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ALL SUPERVISOR ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────────



// Replace getAllSupervisorAssignments in employee-supervisor.service.js

const ALLOWED_SORT_COLUMNS = {
  ASSIGNED_ON:    "es.CREATED_DATE",
  EMP_FIRST_NAME: "e.FIRST_NAME",
  SUP_FIRST_NAME: "s.FIRST_NAME",
};

export const getAllSupervisorAssignments = async ({
  page         = 1,
  limit        = 20,
  employeeId   = "",
  supervisorId = "",
  sortBy       = "ASSIGNED_ON",
  sortOrder    = "DESC",
} = {}) => {
  const conn = await getConnection();

  const pageNum   = Math.max(1, parseInt(page,  10) || 1);
  const limitNum  = Math.max(1, parseInt(limit, 10) || 20);
  const rownumMin = (pageNum - 1) * limitNum + 1;
  const rownumMax = pageNum * limitNum;

  const orderCol = ALLOWED_SORT_COLUMNS[sortBy] ?? "es.CREATED_DATE";
  const orderDir = sortOrder === "ASC" ? "ASC" : "DESC";

  const conditions = ["es.STATUS = 1"];
  const bindParams = {};

  if (employeeId && employeeId !== "") {
    conditions.push(`es.PERSON_ID = :EMPLOYEE_ID`);
    bindParams.EMPLOYEE_ID = parseInt(employeeId, 10);
  }

  if (supervisorId && supervisorId !== "") {
    conditions.push(`es.SUPERVISOR_ID = :SUPERVISOR_ID`);
    bindParams.SUPERVISOR_ID = parseInt(supervisorId, 10);
  }

  const whereClause = `WHERE ${conditions.join("\n      AND ")}`;

  try {
    const countResult = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
         FROM HR_EMPLOYEE_SUPERVISOR es
         LEFT JOIN HR_EMPLOYEE e ON es.PERSON_ID     = e.PERSON_ID
         LEFT JOIN HR_EMPLOYEE s ON es.SUPERVISOR_ID = s.PERSON_ID
         ${whereClause}`,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const total = countResult.rows[0].TOTAL;

    const result = await conn.execute(
      `SELECT * FROM (
         SELECT ROWNUM AS RN, sq.* FROM (

           SELECT
             es.ID,
             es.PERSON_ID,
             es.SUPERVISOR_ID,
             es.CREATED_DATE        AS ASSIGNED_ON,
             e.FIRST_NAME           AS EMP_FIRST_NAME,
             e.LAST_NAME            AS EMP_LAST_NAME,
             e.EMP_NO,
             e.TITLE                AS EMP_TITLE,
             s.FIRST_NAME           AS SUP_FIRST_NAME,
             s.LAST_NAME            AS SUP_LAST_NAME,
             s.EMP_NO               AS SUP_EMP_NO,
             s.TITLE                AS SUP_TITLE

           FROM HR_EMPLOYEE_SUPERVISOR es
           LEFT JOIN HR_EMPLOYEE e ON es.PERSON_ID     = e.PERSON_ID
           LEFT JOIN HR_EMPLOYEE s ON es.SUPERVISOR_ID = s.PERSON_ID
           ${whereClause}
           ORDER BY ${orderCol} ${orderDir}

         ) sq WHERE ROWNUM <= ${rownumMax}
       ) WHERE RN >= ${rownumMin}`,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return {
      data: result.rows,
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  } finally {
    await conn.close();
  }
};
// ─────────────────────────────────────────────────────────────────────────────
//  GET SUPERVISOR BY EMPLOYEE (PERSON_ID)
// ─────────────────────────────────────────────────────────────────────────────

// Returns ALL active supervisors for an employee (multiple supervisors allowed).
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
       FROM HR_EMPLOYEE_SUPERVISOR es
       LEFT JOIN HR_EMPLOYEE s ON es.SUPERVISOR_ID = s.PERSON_ID
       WHERE es.PERSON_ID = :PERSON_ID AND es.STATUS = 1`,
      { PERSON_ID: parseInt(personId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    // Returns array — employee may have multiple active supervisors
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET TEAM BY SUPERVISOR
// ─────────────────────────────────────────────────────────────────────────────

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
       FROM HR_EMPLOYEE_SUPERVISOR es
       LEFT JOIN HR_EMPLOYEE e ON es.PERSON_ID = e.PERSON_ID
       WHERE es.SUPERVISOR_ID = :SUPERVISOR_ID AND es.STATUS = 1
       ORDER BY e.FIRST_NAME`,
      { SUPERVISOR_ID: parseInt(supervisorId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE SUPERVISOR
// ─────────────────────────────────────────────────────────────────────────────

export const updateSupervisor = async (id, data) => {
  const conn = await getConnection();
  try {

    // Fetch the current assignment so we know which employee (PERSON_ID) this
    // record belongs to — needed for the circular and duplicate checks below.
    const current = await conn.execute(
      `SELECT PERSON_ID, SUPERVISOR_ID FROM HR_EMPLOYEE_SUPERVISOR WHERE ID = :ID`,
      { ID: parseInt(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (current.rows.length === 0) {
      throw new Error(`Supervisor assignment #${id} not found.`);
    }
    const { PERSON_ID } = current.rows[0];

    // ── Guard 1: Self-assignment ──────────────────────────────────────────────
    if (parseInt(PERSON_ID) === parseInt(data.SUPERVISOR_ID)) {
      throw new Error("An employee cannot be their own supervisor.");
    }

    // ── Guard 2: Duplicate active assignment ──────────────────────────────────
    //
    //  Another active row for the same (PERSON_ID, SUPERVISOR_ID) pair must
    //  not already exist (excluding the current row being updated).
    const duplicate = await conn.execute(
      `SELECT ID FROM HR_EMPLOYEE_SUPERVISOR
        WHERE PERSON_ID     = :PERSON_ID
          AND SUPERVISOR_ID = :SUPERVISOR_ID
          AND STATUS        = 1
          AND ID           != :ID`,
      {
        PERSON_ID:     parseInt(PERSON_ID),
        SUPERVISOR_ID: parseInt(data.SUPERVISOR_ID),
        ID:            parseInt(id),
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (duplicate.rows.length > 0) {
      throw new Error("This supervisor is already actively assigned to this employee.");
    }

    // ── Guard 3: Circular chain ───────────────────────────────────────────────
    const isCircular = await wouldCreateCircularChain(
      conn,
      PERSON_ID,
      data.SUPERVISOR_ID
    );
    if (isCircular) {
      throw new Error(
        "Circular reporting chain detected. This supervisor already reports " +
        "(directly or indirectly) to this employee."
      );
    }

    // ── Update ────────────────────────────────────────────────────────────────
    const result = await conn.execute(
      `UPDATE HR_EMPLOYEE_SUPERVISOR
          SET SUPERVISOR_ID = :SUPERVISOR_ID,
              UPDATED_BY    = :UPDATED_BY,
              UPDATED_DATE  = SYSDATE
        WHERE ID = :ID`,
      {
        ID:            parseInt(id),
        SUPERVISOR_ID: parseInt(data.SUPERVISOR_ID),
        UPDATED_BY:    data.UPDATED_BY ?? null,
      },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } catch (error) {
    console.error("updateSupervisor error:", error.message);
    throw error;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  REMOVE SUPERVISOR  (soft delete — STATUS = 0)
// ─────────────────────────────────────────────────────────────────────────────

export const removeSupervisor = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HR_EMPLOYEE_SUPERVISOR
          SET STATUS = 0, UPDATED_DATE = SYSDATE
        WHERE ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  TODO: ORPHANED EMPLOYEES (implement when End Employment flow is built)
// ─────────────────────────────────────────────────────────────────────────────
//
//  When a supervisor is terminated / resigned / retired, call this to flag
//  all their direct reports so HR can reassign them.
//
//  Suggested approach:
//    - Add STATUS = 2 ('ORPHANED') to HR_EMPLOYEE_SUPERVISOR
//    - Call flagOrphanedEmployees(supervisorId) inside the End Employment service
//    - Surface orphaned count on HR dashboard under "Pending Approvals" KPI
//    - Add reassignOrphanedEmployee(assignmentId, newSupervisorId) that runs
//      the same circular + duplicate guards above before reassigning
//
// export const flagOrphanedEmployees = async (supervisorId) => { ... };
// export const reassignOrphanedEmployee = async (assignmentId, newSupervisorId) => { ... };

// ─────────────────────────────────────────────────────────────────────────────
//  TODO: TEMPORARY DELEGATION (implement when client requests it)
// ─────────────────────────────────────────────────────────────────────────────
//
//  Allows a supervisor to delegate approval rights to another supervisor
//  for a date range (e.g. while on leave) without changing HR_EMPLOYEE_SUPERVISOR.
//
//  Suggested approach:
//    - New table: HR_SUPERVISOR_DELEGATION
//        (ID, DELEGATOR_ID, DELEGATE_ID, FROM_DATE, TO_DATE, STATUS, CREATED_BY)
//    - The notification + leave approval services check for an active delegation
//      before routing approvals: if today is within FROM_DATE–TO_DATE and STATUS=1,
//      send to DELEGATE_ID instead of the actual supervisor
//    - Circular guard should also apply here (delegate cannot report to delegator)
//
// export const createDelegation = async (data) => { ... };
// export const getActiveDelegation = async (supervisorId) => { ... };
// export const revokeDelegation = async (id) => { ... };