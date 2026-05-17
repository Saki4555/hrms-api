// src/modules/leave-balance/leave-balance.service.js
// ─────────────────────────────────────────────────────────────────────────────
//  LEAVE BALANCE SERVICE
//
//  Design decisions:
//  - Allocation:  Fixed from HR_LEAVE_TYPE.MAX_BALANCE (same for all employees)
//  - Year reset:  Calendar year (Jan 1 → Dec 31)
//  - Carry fwd:   None — unused days expire at year end
//  - Counts:      PENDING + APPROVED both consume balance
//                 REJECTED / CANCELLED automatically restore (excluded from SUM)
//  - Balance:     Always computed on the fly — no separate balance table needed
// ─────────────────────────────────────────────────────────────────────────────

import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// ── 1. GET BALANCE FOR ALL LEAVE TYPES (for one employee) ────────────────────
//
//  Returns an array — one row per leave type — showing:
//    allocated, used (pending+approved), remaining, pending, approved
//
//  Used in:
//    - ESS Dashboard: employee sees all balances at a glance
//    - Add Leave Request sheet: show balance before employee submits
//
export const getLeaveBalance = async (employeeId, year = null) => {
  const conn = await getConnection();
  const targetYear = year ?? new Date().getFullYear();

  try {
    const result = await conn.execute(
      `SELECT
         lt.LEAVE_TYPE_ID,
         lt.CODE,
         lt.NAME                                          AS LEAVE_TYPE_NAME,
         NVL(lt.MAX_BALANCE, 0)                           AS ALLOCATED,
         NVL(SUM(
           CASE WHEN lr.STATUS IN ('PENDING', 'APPROVED')
                THEN lr.DAYS ELSE 0 END
         ), 0)                                            AS USED,
         NVL(lt.MAX_BALANCE, 0) - NVL(SUM(
           CASE WHEN lr.STATUS IN ('PENDING', 'APPROVED')
                THEN lr.DAYS ELSE 0 END
         ), 0)                                            AS REMAINING,
         NVL(SUM(
           CASE WHEN lr.STATUS = 'PENDING'
                THEN lr.DAYS ELSE 0 END
         ), 0)                                            AS PENDING_DAYS,
         NVL(SUM(
           CASE WHEN lr.STATUS = 'APPROVED'
                THEN lr.DAYS ELSE 0 END
         ), 0)                                            AS APPROVED_DAYS
       FROM HR_LEAVE_TYPE lt
       LEFT JOIN HR_LEAVE_REQUEST lr
         ON  lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
         AND lr.EMPLOYEE_ID   = :EMPLOYEE_ID
         AND lr.STATUS       IN ('PENDING', 'APPROVED')
         AND EXTRACT(YEAR FROM lr.START_DATE) = :YEAR
       GROUP BY
         lt.LEAVE_TYPE_ID,
         lt.CODE,
         lt.NAME,
         lt.MAX_BALANCE
       ORDER BY lt.LEAVE_TYPE_ID`,
      {
        EMPLOYEE_ID: parseInt(employeeId),
        YEAR: targetYear,
      },
    );

    return result.rows;
  } finally {
    await conn.close();
  }
};

// ── 2. GET BALANCE FOR A SINGLE LEAVE TYPE ───────────────────────────────────
//
//  Lightweight — used internally by checkLeaveBalanceBeforeApply
//  and optionally by the frontend when a leave type is selected.
//
export const getLeaveBalanceByType = async (
  employeeId,
  leaveTypeId,
  year = null,
) => {
  const conn = await getConnection();
  const targetYear = year ?? new Date().getFullYear();

  try {
    const result = await conn.execute(
      `SELECT
         lt.LEAVE_TYPE_ID,
         lt.CODE,
         lt.NAME                                          AS LEAVE_TYPE_NAME,
         NVL(lt.MAX_BALANCE, 0)                           AS ALLOCATED,
         NVL(SUM(
           CASE WHEN lr.STATUS IN ('PENDING', 'APPROVED')
                THEN lr.DAYS ELSE 0 END
         ), 0)                                            AS USED,
         NVL(lt.MAX_BALANCE, 0) - NVL(SUM(
           CASE WHEN lr.STATUS IN ('PENDING', 'APPROVED')
                THEN lr.DAYS ELSE 0 END
         ), 0)                                            AS REMAINING
       FROM HR_LEAVE_TYPE lt
       LEFT JOIN HR_LEAVE_REQUEST lr
         ON  lr.LEAVE_TYPE_ID = lt.LEAVE_TYPE_ID
         AND lr.EMPLOYEE_ID   = :EMPLOYEE_ID
         AND lr.STATUS       IN ('PENDING', 'APPROVED')
         AND EXTRACT(YEAR FROM lr.START_DATE) = :YEAR
       WHERE lt.LEAVE_TYPE_ID = :LEAVE_TYPE_ID
       GROUP BY
         lt.LEAVE_TYPE_ID,
         lt.CODE,
         lt.NAME,
         lt.MAX_BALANCE`,
      {
        EMPLOYEE_ID:   parseInt(employeeId),
        LEAVE_TYPE_ID: parseInt(leaveTypeId),
        YEAR:          targetYear,
      },
    );

    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

// ── 3. CHECK BALANCE BEFORE APPLY (hard block guard) ─────────────────────────
//
//  Call this inside leave-request.service.js BEFORE the INSERT.
//  Throws a descriptive error if balance is insufficient.
//  Returns silently if balance is OK.
//
//  Rules:
//    - If MAX_BALANCE is NULL on the leave type → unlimited, always pass
//    - If requested days > remaining → throw with remaining days in message
//
export const checkLeaveBalanceBeforeApply = async (
  employeeId,
  leaveTypeId,
  requestedDays,
  year = null,
) => {
  const balance = await getLeaveBalanceByType(employeeId, leaveTypeId, year);

  if (!balance) {
    throw new Error("Leave type not found.");
  }

  // ALLOCATED = 0 means MAX_BALANCE was NULL → treat as unlimited
  if (balance.ALLOCATED === 0) return;

  if (requestedDays > balance.REMAINING) {
    throw new Error(
      `Insufficient leave balance. You requested ${requestedDays} day(s) but only ${balance.REMAINING} day(s) remain for ${balance.LEAVE_TYPE_NAME} in ${year ?? new Date().getFullYear()}.`,
    );
  }
};