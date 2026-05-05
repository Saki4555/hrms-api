// ─────────────────────────────────────────────────────────────
// CORE HR — REMAINING TODO LIST
// ─────────────────────────────────────────────────────────────

// ── REINSTATE EMPLOYEE ────────────────────────────────────────
// TODO: reinstateEmployee(personId, { EFFECTIVE_DATE, CHANGED_BY, REMARKS })
//       - Reverse of endEmployment — set HR_EMPLOYEE.STATUS back to 1
//       - Re-open HR_EMP_ASSIGNMENT (STATUS = 1)
//       - Re-open HR_EMP_SHIFT (STATUS = 1)
//       - Increment ACTUAL_COUNT on HR_ORG_POSITION
//       - Log to HR_AUDIT_LOG (action: 'REINSTATE')

// ── GET EMPLOYEE AUDIT HISTORY ────────────────────────────────
// TODO: getEmployeeAuditHistory(personId, { page, limit })
//       - Query HR_AUDIT_LOG WHERE KEY_VALUES = 'PERSON_ID={personId}'
//       - Return paginated list ordered by CHANGED_ON DESC
//       - Useful for HR to see full movement history of an employee



// ─────────────────────────────────────────────────────────────
// SKIP — already decided
// ─────────────────────────────────────────────────────────────
// ✗ Employee Requisition + approval workflow
// ✗ Clearance Workflow
// ✗ Final Settlement         → Payroll module
// ✗ Document Management      → Doc module
// ─────────────────────────────────────────────────────────────