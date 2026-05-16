// src\utils\audit-logger.js

/**
 * audit-logger.js — shared utility, call inside any open transaction.
 *
 * ⚠️  Does NOT commit. The caller owns the transaction.
 *
 * @param {import('oracledb').Connection} conn
 * @param {object}        opts
 * @param {string}        opts.tableName   - 'HR_EMP_ASSIGNMENT' | 'HR_EMPLOYEE' | …
 * @param {string}        opts.operation   - 'TRANSFER' | 'INCREMENT' | 'PROMOTION' | 'END_EMPLOYMENT' | …
 * @param {string|number} opts.changedBy   - userId / username of actor
 * @param {string}        opts.keyValues   - e.g. 'PERSON_ID=42'
 * @param {object}        [opts.oldValues] - snapshot before change
 * @param {object}        [opts.newValues] - snapshot after change
 */
export const logAudit = async (conn, {
  tableName,
  operation,
  changedBy,
  keyValues,
  oldValues = {},
  newValues = {},
}) => {
  await conn.execute(
    `INSERT INTO HR_AUDIT_LOG
       (TABLE_NAME, OPERATION, CHANGED_BY, CHANGED_ON, KEY_VALUES, OLD_VALUES, NEW_VALUES)
     VALUES
       (:TABLE_NAME, :OPERATION, :CHANGED_BY, SYSTIMESTAMP, :KEY_VALUES, :OLD_VALUES, :NEW_VALUES)`,
    {
      TABLE_NAME: tableName,
      OPERATION:  operation,
      CHANGED_BY: String(changedBy ?? "SYSTEM"),
      KEY_VALUES: keyValues,
      OLD_VALUES: JSON.stringify(oldValues),
      NEW_VALUES: JSON.stringify(newValues),
    }
  );
};