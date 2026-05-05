import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";
import { logAudit } from "../../utils/audit-logger.js";

/* ─────────────────────────────────────────────────────────────
   INTERNAL HELPER — fetch current active assignment for a person.
   Throws if no active assignment found.
───────────────────────────────────────────────────────────── */
const _getActiveAssignment = async (conn, personId) => {
  const result = await conn.execute(
    `SELECT ASSIGNMENT_ID, COMPANY_ID, OU_ID, ORG_ID,
            POSITION_ID, PAYROLL_ID, GRADE_ID, LOCATION_ID,
            EFFECTIVE_START_DATE, EFFECTIVE_END_DATE
       FROM HR_EMP_ASSIGNMENT
      WHERE PERSON_ID = :PERSON_ID AND STATUS = 1`,
    { PERSON_ID: personId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (!result.rows.length) {
    throw new Error(`No active assignment found for PERSON_ID=${personId}`);
  }

  return result.rows[0];
};

/* ─────────────────────────────────────────────────────────────
   INTERNAL HELPER — adjust ACTUAL_COUNT on HR_ORG_POSITION.
   direction: +1 (increment) | -1 (decrement)
   Throws on increment if position not found/inactive.
───────────────────────────────────────────────────────────── */
const _adjustPositionCount = async (conn, positionId, direction) => {
  if (!positionId) return;

  const sql =
    direction > 0
      ? `UPDATE HR_ORG_POSITION
            SET ACTUAL_COUNT = NVL(ACTUAL_COUNT, 0) + 1
          WHERE ID = :ID AND STATUS = 1`
      : `UPDATE HR_ORG_POSITION
            SET ACTUAL_COUNT = GREATEST(NVL(ACTUAL_COUNT, 0) - 1, 0)
          WHERE ID = :ID AND STATUS = 1`;

  const result = await conn.execute(sql, { ID: positionId });

  if (direction > 0 && result.rowsAffected === 0) {
    throw new Error(
      `ACTUAL_COUNT increment failed: HR_ORG_POSITION ID=${positionId} not found or inactive.`
    );
  }
};

/* ═════════════════════════════════════════════════════════════
   1. TRANSFER EMPLOYEE
   - Ends current assignment (STATUS = 0)
   - Creates new assignment with new org/position
   - Adjusts ACTUAL_COUNT on both old and new positions
   - Logs to HR_AUDIT_LOG
═════════════════════════════════════════════════════════════ */
export const transferEmployee = async (personId, data) => {
  const {
    COMPANY_ID,
    OU_ID,
    ORG_ID,
    POSITION_ID,
    GRADE_ID,
    PAYROLL_ID    = null,
    LOCATION_ID   = null,
    EFFECTIVE_DATE,
    END_DATE,
    CHANGED_BY,
    REMARKS       = null,
  } = data;

  const conn = await getConnection();

  try {
    // 1️⃣ Fetch old assignment (for audit + ACTUAL_COUNT decrement)
    const old = await _getActiveAssignment(conn, personId);

    // 2️⃣ End current assignment
    await conn.execute(
      `UPDATE HR_EMP_ASSIGNMENT
          SET STATUS = 0, EFFECTIVE_END_DATE = TO_DATE(:END_DATE, 'YYYY-MM-DD')
        WHERE PERSON_ID = :PERSON_ID AND STATUS = 1`,
      {
        PERSON_ID: personId,
        END_DATE:  EFFECTIVE_DATE, // transfer date = end of old assignment
      }
    );

    // 3️⃣ Insert new assignment (ASSIGNMENT_ID auto-assigned by trigger)
    await conn.execute(
      `INSERT INTO HR_EMP_ASSIGNMENT
         (PERSON_ID, COMPANY_ID, OU_ID, ORG_ID, POSITION_ID,
          PAYROLL_ID, GRADE_ID, LOCATION_ID,
          EFFECTIVE_START_DATE, EFFECTIVE_END_DATE, STATUS)
       VALUES
         (:PERSON_ID, :COMPANY_ID, :OU_ID, :ORG_ID, :POSITION_ID,
          :PAYROLL_ID, :GRADE_ID, :LOCATION_ID,
          TO_DATE(:EFFECTIVE_START_DATE, 'YYYY-MM-DD'),
          TO_DATE(:EFFECTIVE_END_DATE,   'YYYY-MM-DD'),
          1)`,
      {
        PERSON_ID:            personId,
        COMPANY_ID:           COMPANY_ID  ?? null,
        OU_ID:                OU_ID       ?? null,
        ORG_ID:               ORG_ID      ?? null,
        POSITION_ID:          POSITION_ID ?? null,
        PAYROLL_ID:           PAYROLL_ID,
        GRADE_ID:             GRADE_ID    ?? null,
        LOCATION_ID:          LOCATION_ID,
        EFFECTIVE_START_DATE: EFFECTIVE_DATE,
        EFFECTIVE_END_DATE:   END_DATE    ?? null,
      }
    );

    // 4️⃣ Adjust ACTUAL_COUNT — decrement old, increment new
    if (old.POSITION_ID !== POSITION_ID) {
      await _adjustPositionCount(conn, old.POSITION_ID, -1);
      await _adjustPositionCount(conn, POSITION_ID,     +1);
    }

    // 5️⃣ Audit log
    await logAudit(conn, {
      tableName:  "HR_EMP_ASSIGNMENT",
      operation:  "TRANSFER",
      changedBy:  CHANGED_BY,
      keyValues:  `PERSON_ID=${personId}`,
      oldValues:  { ...old, REMARKS },
      newValues:  {
        COMPANY_ID, OU_ID, ORG_ID, POSITION_ID,
        GRADE_ID, PAYROLL_ID, LOCATION_ID,
        EFFECTIVE_START_DATE: EFFECTIVE_DATE,
        REMARKS,
      },
    });

    await conn.commit();
    return { success: true, PERSON_ID: personId };

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

/* ═════════════════════════════════════════════════════════════
   2. PROCESS INCREMENT / PROMOTION
   - Updates GRADE_ID and/or POSITION_ID on current assignment
   - Adjusts ACTUAL_COUNT if position changed
   - Logs to HR_AUDIT_LOG with action: 'INCREMENT' or 'PROMOTION'
═════════════════════════════════════════════════════════════ */
export const processIncrement = async (personId, data) => {
  const {
    NEW_GRADE_ID    = null,
    NEW_POSITION_ID = null,
    EFFECTIVE_DATE,
    ACTION     = "INCREMENT", // 'INCREMENT' | 'PROMOTION'
    CHANGED_BY,
    REMARKS    = null,
  } = data;

  const conn = await getConnection();

  try {
    // 1️⃣ Fetch current assignment
    const old = await _getActiveAssignment(conn, personId);

    // 2️⃣ Build only the fields that actually changed
    const updates    = [];
    const bindParams = { PERSON_ID: personId };

    if (NEW_GRADE_ID !== null && NEW_GRADE_ID !== old.GRADE_ID) {
      updates.push("GRADE_ID = :GRADE_ID");
      bindParams.GRADE_ID = NEW_GRADE_ID;
    }

    if (NEW_POSITION_ID !== null && NEW_POSITION_ID !== old.POSITION_ID) {
      updates.push("POSITION_ID = :POSITION_ID");
      bindParams.POSITION_ID = NEW_POSITION_ID;
    }

    if (!updates.length) {
      throw new Error("No changes detected — GRADE_ID and POSITION_ID are the same as current.");
    }

    // 3️⃣ Apply update
    await conn.execute(
      `UPDATE HR_EMP_ASSIGNMENT
          SET ${updates.join(", ")}
        WHERE PERSON_ID = :PERSON_ID AND STATUS = 1`,
      bindParams
    );

    // 4️⃣ Adjust ACTUAL_COUNT only if position changed
    if (NEW_POSITION_ID !== null && NEW_POSITION_ID !== old.POSITION_ID) {
      await _adjustPositionCount(conn, old.POSITION_ID, -1);
      await _adjustPositionCount(conn, NEW_POSITION_ID, +1);
    }

    // 5️⃣ Audit log
    await logAudit(conn, {
      tableName: "HR_EMP_ASSIGNMENT",
      operation:  ACTION,
      changedBy:  CHANGED_BY,
      keyValues:  `PERSON_ID=${personId}`,
      oldValues:  {
        GRADE_ID:    old.GRADE_ID,
        POSITION_ID: old.POSITION_ID,
        REMARKS,
      },
      newValues: {
        GRADE_ID:    NEW_GRADE_ID    ?? old.GRADE_ID,
        POSITION_ID: NEW_POSITION_ID ?? old.POSITION_ID,
        EFFECTIVE_DATE,
        REMARKS,
      },
    });

    await conn.commit();
    return { success: true, PERSON_ID: personId };

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

/* ═════════════════════════════════════════════════════════════
   3. END EMPLOYMENT
   - Sets HR_EMPLOYEE.STATUS = 2  (2 = ended, distinct from 0 = deleted)
   - Ends HR_EMP_ASSIGNMENT (STATUS = 0)
   - Ends HR_EMP_SHIFT     (STATUS = 0)
   - Decrements ACTUAL_COUNT on HR_ORG_POSITION
   - Logs to HR_AUDIT_LOG with action = TYPE

   TYPE: 'RESIGNATION' | 'TERMINATION' | 'RETIREMENT'

   NOTE: Final settlement (payments, PF, gratuity) is handled
         in the Payroll module — not here.
═════════════════════════════════════════════════════════════ */
export const endEmployment = async (personId, data) => {
  const {
    TYPE,           // 'RESIGNATION' | 'TERMINATION' | 'RETIREMENT'
    EFFECTIVE_DATE,
    CHANGED_BY,
    REMARKS = null,
  } = data;

  const VALID_TYPES = ["RESIGNATION", "TERMINATION", "RETIREMENT"];
  if (!VALID_TYPES.includes(TYPE)) {
    throw new Error(`Invalid TYPE "${TYPE}". Must be one of: ${VALID_TYPES.join(", ")}.`);
  }

  const conn = await getConnection();

  try {
    // 1️⃣ Fetch current assignment for audit + ACTUAL_COUNT
    const assignment = await _getActiveAssignment(conn, personId);

    // 2️⃣ Mark employee as ended (STATUS = 2, keeps them in DB, out of active lists)
    await conn.execute(
      `UPDATE HR_EMPLOYEE
          SET STATUS = 2, LAST_UPDATE_DATE = SYSDATE
        WHERE PERSON_ID = :PERSON_ID`,
      { PERSON_ID: personId }
    );

    // 3️⃣ End active assignment
    await conn.execute(
      `UPDATE HR_EMP_ASSIGNMENT
          SET STATUS = 0,
              EFFECTIVE_END_DATE = TO_DATE(:EFFECTIVE_DATE, 'YYYY-MM-DD')
        WHERE PERSON_ID = :PERSON_ID AND STATUS = 1`,
      { PERSON_ID: personId, EFFECTIVE_DATE }
    );

    // 4️⃣ End active shift record
    await conn.execute(
      `UPDATE HR_EMP_SHIFT
          SET STATUS = 0, LAST_UPDATED = SYSDATE
        WHERE EMP_NO = :PERSON_ID AND STATUS = 1`,
      { PERSON_ID: personId }
    );

    // 5️⃣ Decrement position headcount
    await _adjustPositionCount(conn, assignment.POSITION_ID, -1);

    // 6️⃣ Audit log
    await logAudit(conn, {
      tableName: "HR_EMPLOYEE",
      operation:  TYPE,            // 'RESIGNATION' | 'TERMINATION' | 'RETIREMENT'
      changedBy:  CHANGED_BY,
      keyValues:  `PERSON_ID=${personId}`,
      oldValues:  { STATUS: 1, ...assignment },
      newValues:  { STATUS: 2, EFFECTIVE_DATE, REMARKS },
    });

    await conn.commit();
    return { success: true, PERSON_ID: personId };

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

/* ═════════════════════════════════════════════════════════════
   4. REINSTATE EMPLOYEE
   - Reverse of endEmployment
   - Sets HR_EMPLOYEE.STATUS back to 1 (active)
   - Re-opens the most recent HR_EMP_ASSIGNMENT (STATUS = 1)
   - Re-opens the most recent HR_EMP_SHIFT (STATUS = 1)
   - Increments ACTUAL_COUNT on HR_ORG_POSITION
   - Logs to HR_AUDIT_LOG (action: 'REINSTATE')
═════════════════════════════════════════════════════════════ */
export const reinstateEmployee = async (personId, data) => {
  const {
    EFFECTIVE_DATE,
    CHANGED_BY,
    REMARKS = null,
  } = data;

  const conn = await getConnection();

  try {
    // 1️⃣ Confirm employee is actually in ended state (STATUS = 2)
    const empResult = await conn.execute(
      `SELECT STATUS FROM HR_EMPLOYEE WHERE PERSON_ID = :PERSON_ID`,
      { PERSON_ID: personId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!empResult.rows.length) {
      throw new Error(`Employee not found: PERSON_ID=${personId}`);
    }

    if (empResult.rows[0].STATUS !== 2) {
      throw new Error(`Cannot reinstate — employee STATUS is not 2 (ended). Current STATUS=${empResult.rows[0].STATUS}`);
    }

    // 2️⃣ Fetch the most recent ended assignment to reinstate
    const assignResult = await conn.execute(
      `SELECT ASSIGNMENT_ID, POSITION_ID, GRADE_ID, COMPANY_ID, ORG_ID
         FROM HR_EMP_ASSIGNMENT
        WHERE PERSON_ID = :PERSON_ID AND STATUS = 0
        ORDER BY EFFECTIVE_END_DATE DESC NULLS LAST`,
      { PERSON_ID: personId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!assignResult.rows.length) {
      throw new Error(`No ended assignment found to reinstate for PERSON_ID=${personId}`);
    }

    const assignment = assignResult.rows[0];

    // 3️⃣ Reactivate employee
    await conn.execute(
      `UPDATE HR_EMPLOYEE
          SET STATUS = 1, LAST_UPDATE_DATE = SYSDATE
        WHERE PERSON_ID = :PERSON_ID`,
      { PERSON_ID: personId }
    );

    // 4️⃣ Reactivate most recent assignment
    await conn.execute(
      `UPDATE HR_EMP_ASSIGNMENT
          SET STATUS = 1,
              EFFECTIVE_START_DATE = TO_DATE(:EFFECTIVE_DATE, 'YYYY-MM-DD'),
              EFFECTIVE_END_DATE   = NULL
        WHERE ASSIGNMENT_ID = :ASSIGNMENT_ID`,
      { ASSIGNMENT_ID: assignment.ASSIGNMENT_ID, EFFECTIVE_DATE }
    );

    // 5️⃣ Reactivate most recent shift (if any)
    await conn.execute(
      `UPDATE HR_EMP_SHIFT
          SET STATUS = 1, LAST_UPDATED = SYSDATE
        WHERE EMP_NO = :PERSON_ID
          AND ID = (
            SELECT MAX(ID) FROM HR_EMP_SHIFT
             WHERE EMP_NO = :PERSON_ID AND STATUS = 0
          )`,
      { PERSON_ID: personId }
    );

    // 6️⃣ Increment position headcount
    await _adjustPositionCount(conn, assignment.POSITION_ID, +1);

    // 7️⃣ Audit log
    await logAudit(conn, {
      tableName: "HR_EMPLOYEE",
      operation:  "REINSTATE",
      changedBy:  CHANGED_BY,
      keyValues:  `PERSON_ID=${personId}`,
      oldValues:  { STATUS: 2 },
      newValues:  { STATUS: 1, EFFECTIVE_DATE, REMARKS },
    });

    await conn.commit();
    return { success: true, PERSON_ID: personId };

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

/* ═════════════════════════════════════════════════════════════
   5. GET EMPLOYEE AUDIT HISTORY
   - Returns paginated audit log for a specific employee
   - Ordered by CHANGED_ON DESC (most recent first)
═════════════════════════════════════════════════════════════ */
export const getEmployeeAuditHistory = async (personId, { page = 1, limit = 10 } = {}) => {
  const conn = await getConnection();

  const pageNum   = Math.max(1, parseInt(page,  10) || 1);
  const limitNum  = Math.max(1, parseInt(limit, 10) || 10);
  const rownumMin = (pageNum - 1) * limitNum + 1;
  const rownumMax = pageNum * limitNum;

  const keyValues = `PERSON_ID=${personId}`;

  try {
    // 1️⃣ Total count
    const countResult = await conn.execute(
      `SELECT COUNT(*) AS TOTAL FROM HR_AUDIT_LOG WHERE KEY_VALUES = :KEY_VALUES`,
      { KEY_VALUES: keyValues },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const total = countResult.rows[0].TOTAL;

    // 2️⃣ Paginated rows
    const result = await conn.execute(
      `SELECT * FROM (
         SELECT ROWNUM AS RN, sq.* FROM (
           SELECT AUDIT_ID, TABLE_NAME, OPERATION, CHANGED_BY,
                  CHANGED_ON, KEY_VALUES, OLD_VALUES, NEW_VALUES
             FROM HR_AUDIT_LOG
            WHERE KEY_VALUES = :KEY_VALUES
            ORDER BY CHANGED_ON DESC NULLS LAST
         ) sq WHERE ROWNUM <= ${rownumMax}
       ) WHERE RN >= ${rownumMin}`,
      { KEY_VALUES: keyValues },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return {
      data: result.rows.map((row) => ({
        auditId:   row.AUDIT_ID,
        table:     row.TABLE_NAME,
        operation: row.OPERATION,
        changedBy: row.CHANGED_BY,
        changedOn: row.CHANGED_ON,
        oldValues: row.OLD_VALUES ? JSON.parse(row.OLD_VALUES) : null,
        newValues: row.NEW_VALUES ? JSON.parse(row.NEW_VALUES) : null,
      })),
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