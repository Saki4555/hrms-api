// src/modules/dashboard/dashboard.service.js
// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD SERVICE
//  Role-scoped summary data aggregated from multiple tables / services.
//  Roles: ADMIN | HR | SUPERVISOR | EMPLOYEE
// ─────────────────────────────────────────────────────────────────────────────

import { getConnection }         from "../../config/db.js";
import oracledb                  from "oracledb";
import { format, startOfMonth }  from "date-fns";

// ── Reuse existing services — do NOT duplicate their logic ───────────────────
import {
  getAttendanceSummary,
  getTeamAttendanceStats,
  getMyAttendanceSummary,
}                                from "../attendacne/attendance.service.js";   // intentional typo matches repo folder
import { getLeaveBalance }       from "../leave-balance/leave-balance.service.js";
import {
  getNotificationsForSupervisor,
  getNotificationsForEmployee,
}                                from "../employee-notification/employee-notification.service.js";


// ═════════════════════════════════════════════════════════════════════════════
//  PRIVATE HELPER FUNCTIONS
//  Each accepts an already-open `conn` so the caller can share ONE connection.
//  They do NOT open or close the connection themselves.
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
//  getOrgKpis — total active headcount + new joiners this calendar month
//  Used by: ADMIN, HR
// ─────────────────────────────────────────────────────────────────────────────
const getOrgKpis = async (conn) => {
  const result = await conn.execute(
    `SELECT
       COUNT(*)                                                           AS TOTAL_ACTIVE,
       SUM(CASE WHEN JOIN_DATE >= TRUNC(SYSDATE, 'MM') THEN 1 ELSE 0 END) AS NEW_JOINERS
     FROM HR_EMPLOYEE
     WHERE (STATUS IS NULL OR STATUS = 1)`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const row = result.rows[0];
  return {
    totalActiveEmployees: Number(row.TOTAL_ACTIVE  ?? 0),
    newJoinersThisMonth:  Number(row.NEW_JOINERS   ?? 0),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
//  getTeamKpis — count of direct reports for the given supervisor
//  Used by: SUPERVISOR
// ─────────────────────────────────────────────────────────────────────────────
const getTeamKpis = async (conn, supervisorId) => {
  const result = await conn.execute(
    `SELECT COUNT(*) AS TEAM_SIZE
       FROM HR_EMPLOYEE_SUPERVISOR
      WHERE SUPERVISOR_ID = :SUP_ID
        AND STATUS        = 1`,
    { SUP_ID: parseInt(supervisorId, 10) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  return {
    teamSize: Number(result.rows[0].TEAM_SIZE ?? 0),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
//  getLatestPayrollRun — most recently created payroll run row
//  Used by: ADMIN, HR
// ─────────────────────────────────────────────────────────────────────────────
const getLatestPayrollRun = async (conn) => {
  const result = await conn.execute(
    `SELECT PAYROLL_ID, RUN_MONTH, STATUS, TOTAL_GROSS, TOTAL_NET, RUN_DATE
       FROM HR_PAYROLL_RUN
      ORDER BY CREATED_DATE DESC
      FETCH FIRST 1 ROW ONLY`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  if (!result.rows || result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    payrollId:  row.PAYROLL_ID,
    runMonth:   row.RUN_MONTH,
    status:     row.STATUS,
    totalGross: row.TOTAL_GROSS,
    totalNet:   row.TOTAL_NET,
    runDate:    row.RUN_DATE,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
//  getOrgPendingCounts — org-wide pending approval counts (all employees)
//  Used by: ADMIN, HR
// ─────────────────────────────────────────────────────────────────────────────
const getOrgPendingCounts = async (conn) => {
  const result = await conn.execute(
    `SELECT
       (SELECT COUNT(*) FROM HR_LEAVE_REQUEST         WHERE STATUS = 'PENDING') AS PENDING_LEAVES,
       (SELECT COUNT(*) FROM HR_LATE_APPLICATION      WHERE STATUS = 'PENDING') AS PENDING_LATE,
       (SELECT COUNT(*) FROM HR_ATTENDANCE_CORRECTION WHERE STATUS = 'PENDING') AS PENDING_CORRECTIONS
     FROM DUAL`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const row = result.rows[0];
  return {
    pendingLeaves:      Number(row.PENDING_LEAVES      ?? 0),
    pendingLateApps:    Number(row.PENDING_LATE        ?? 0),
    pendingCorrections: Number(row.PENDING_CORRECTIONS ?? 0),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
//  getTeamPendingCounts — pending counts scoped to a supervisor's direct reports
//  Used by: SUPERVISOR
// ─────────────────────────────────────────────────────────────────────────────
const getTeamPendingCounts = async (conn, supervisorId) => {
  const result = await conn.execute(
    `SELECT
       (SELECT COUNT(*)
          FROM HR_LEAVE_REQUEST lr
          JOIN HR_EMPLOYEE_SUPERVISOR es ON lr.EMPLOYEE_ID = es.PERSON_ID
         WHERE lr.STATUS         = 'PENDING'
           AND es.SUPERVISOR_ID  = :SUP_ID
           AND es.STATUS         = 1) AS PENDING_LEAVES,

       (SELECT COUNT(*)
          FROM HR_LATE_APPLICATION la
          JOIN HR_EMPLOYEE_SUPERVISOR es ON la.PERSON_ID = es.PERSON_ID
         WHERE la.STATUS         = 'PENDING'
           AND es.SUPERVISOR_ID  = :SUP_ID
           AND es.STATUS         = 1) AS PENDING_LATE,

       (SELECT COUNT(*)
          FROM HR_ATTENDANCE_CORRECTION ac
          JOIN HR_EMPLOYEE_SUPERVISOR es ON ac.PERSON_ID = es.PERSON_ID
         WHERE ac.STATUS         = 'PENDING'
           AND es.SUPERVISOR_ID  = :SUP_ID
           AND es.STATUS         = 1) AS PENDING_CORRECTIONS
     FROM DUAL`,
    { SUP_ID: parseInt(supervisorId, 10) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const row = result.rows[0];
  return {
    pendingLeaves:      Number(row.PENDING_LEAVES      ?? 0),
    pendingLateApps:    Number(row.PENDING_LATE        ?? 0),
    pendingCorrections: Number(row.PENDING_CORRECTIONS ?? 0),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
//  getMyPendingCounts — pending counts for a single employee's own requests
//  Used by: EMPLOYEE
// ─────────────────────────────────────────────────────────────────────────────
const getMyPendingCounts = async (conn, personId) => {
  const result = await conn.execute(
    `SELECT
       (SELECT COUNT(*)
          FROM HR_LEAVE_REQUEST
         WHERE EMPLOYEE_ID = :PERSON_ID
           AND STATUS      = 'PENDING') AS PENDING_LEAVES,

       (SELECT COUNT(*)
          FROM HR_LATE_APPLICATION
         WHERE PERSON_ID = :PERSON_ID
           AND STATUS    = 'PENDING') AS PENDING_LATE,

       (SELECT COUNT(*)
          FROM HR_ATTENDANCE_CORRECTION
         WHERE PERSON_ID = :PERSON_ID
           AND STATUS    = 'PENDING') AS PENDING_CORRECTIONS
     FROM DUAL`,
    { PERSON_ID: parseInt(personId, 10) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const row = result.rows[0];
  return {
    pendingLeaves:      Number(row.PENDING_LEAVES      ?? 0),
    pendingLateApps:    Number(row.PENDING_LATE        ?? 0),
    pendingCorrections: Number(row.PENDING_CORRECTIONS ?? 0),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
//  getEmployeeMovementSummary — HR events in the current calendar month
//  Used by: ADMIN, HR
// ─────────────────────────────────────────────────────────────────────────────
const getEmployeeMovementSummary = async (conn) => {
  const result = await conn.execute(
    `SELECT
       (SELECT COUNT(*)
          FROM HR_EMPLOYEE
         WHERE (STATUS IS NULL OR STATUS = 1)
           AND JOIN_DATE BETWEEN TRUNC(SYSDATE, 'MM') AND LAST_DAY(SYSDATE)) AS NEW_JOINERS,

       (SELECT COUNT(*)
          FROM HR_AUDIT_LOG
         WHERE OPERATION  = 'TRANSFER'
           AND CHANGED_ON >= TRUNC(SYSDATE, 'MM'))                            AS TRANSFERS,

       (SELECT COUNT(*)
          FROM HR_AUDIT_LOG
         WHERE OPERATION IN ('RESIGNATION', 'TERMINATION', 'RETIREMENT')
           AND CHANGED_ON >= TRUNC(SYSDATE, 'MM'))                            AS END_EMPLOYMENTS,

       (SELECT COUNT(*)
          FROM HR_AUDIT_LOG
         WHERE OPERATION  = 'INCREMENT'
           AND CHANGED_ON >= TRUNC(SYSDATE, 'MM'))                            AS INCREMENTS,

       (SELECT COUNT(*)
          FROM HR_AUDIT_LOG
         WHERE OPERATION  = 'PROMOTION'
           AND CHANGED_ON >= TRUNC(SYSDATE, 'MM'))                            AS PROMOTIONS
     FROM DUAL`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const row = result.rows[0];
  return {
    newJoiners:     Number(row.NEW_JOINERS     ?? 0),
    transfers:      Number(row.TRANSFERS       ?? 0),
    endEmployments: Number(row.END_EMPLOYMENTS ?? 0),
    increments:     Number(row.INCREMENTS      ?? 0),
    promotions:     Number(row.PROMOTIONS      ?? 0),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
//  getRecentNotifications — last 5 notifications for the logged-in user
//  Used by: ALL ROLES
//
//  NOTE: The underlying notification service functions open+close their OWN
//  connection internally, so this must be called AFTER the shared conn is
//  closed in the calling function.
// ─────────────────────────────────────────────────────────────────────────────
const getRecentNotifications = async (personId, role) => {
  // ADMIN and HR are treated as supervisors for notification routing
  const isEmployee = role === "EMPLOYEE";

  const all = isEmployee
    ? await getNotificationsForEmployee(personId)
    : await getNotificationsForSupervisor(personId);

  return all.slice(0, 5);
};


// ═════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORTED FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
//  getAdminHrDashboard
//  Used by: ADMIN, HR
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminHrDashboard = async (employeeId) => {
  // ── Phase 1: queries that share a single connection ───────────────────────
  const conn = await getConnection();
  let kpis, payroll, pending, movement;

  try {
    [kpis, payroll, pending, movement] = await Promise.all([
      getOrgKpis(conn),
      getLatestPayrollRun(conn),
      getOrgPendingCounts(conn),
      getEmployeeMovementSummary(conn),
    ]);
  } catch (err) {
    await conn.close();
    throw err;
  }

  // Close the shared connection before calling services that open their own
  await conn.close();

  // ── Phase 2: services that manage their own connections ───────────────────
  const today       = format(new Date(), "yyyy-MM-dd");
  
  const attStats    = await getAttendanceSummary({ date: today });
  const notifs      = await getRecentNotifications(employeeId, "ADMIN");

  return {
    kpis,
    todayAttendance:       attStats,
    pendingApprovals:      pending,
    latestPayrollRun:      payroll,
    employeeMovement:      movement,
    recentNotifications:   notifs,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
//  getSupervisorDashboard
//  Used by: SUPERVISOR
// ─────────────────────────────────────────────────────────────────────────────
export const getSupervisorDashboard = async (employeeId) => {
  // ── Phase 1: queries that share a single connection ───────────────────────
  const conn = await getConnection();
  let teamKpis, teamPending;

  try {
    [teamKpis, teamPending] = await Promise.all([
      getTeamKpis(conn, employeeId),
      getTeamPendingCounts(conn, employeeId),
    ]);
  } catch (err) {
    await conn.close();
    throw err;
  }

  await conn.close();

  // ── Phase 2: services that manage their own connections ───────────────────
  const today       = format(new Date(), "yyyy-MM-dd");
  const attStats    = await getTeamAttendanceStats(employeeId, { date: today });
  const notifs      = await getRecentNotifications(employeeId, "SUPERVISOR");

  return {
    kpis:                  teamKpis,
    todayAttendance:       attStats,
    pendingApprovals:      teamPending,
    recentNotifications:   notifs,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
//  getEmployeeDashboard
//  Used by: EMPLOYEE
// ─────────────────────────────────────────────────────────────────────────────
export const getEmployeeDashboard = async (employeeId) => {
  const today          = format(new Date(), "yyyy-MM-dd");
  const startOfMonthStr = format(startOfMonth(new Date()), "yyyy-MM-dd");

  // ── getMyPendingCounts needs its own connection (not provided by a reused service) ──
  const conn = await getConnection();
  let myPending;

  try {
    myPending = await getMyPendingCounts(conn, employeeId);
  } catch (err) {
    await conn.close();
    throw err;
  }

  await conn.close();

  // ── Services that manage their own connections ────────────────────────────
  const [attSummary, leaveBalance, notifs] = await Promise.all([
    getMyAttendanceSummary(employeeId, { fromDate: startOfMonthStr, toDate: today }),
    getLeaveBalance(employeeId),
    getRecentNotifications(employeeId, "EMPLOYEE"),
  ]);

  return {
    myAttendanceSummary:   attSummary,
    myLeaveBalance:        leaveBalance,
    myPendingRequests:     myPending,
    recentNotifications:   notifs,
  };
};