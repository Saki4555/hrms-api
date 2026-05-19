// src/modules/dashboard/TODO-dashboard-module.js
// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD MODULE — FULL IMPLEMENTATION PLAN
//  Single endpoint that returns role-scoped summary data.
//  Roles: ADMIN | HR | SUPERVISOR | EMPLOYEE
// ─────────────────────────────────────────────────────────────────────────────


// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 1 — BACKEND
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
//  1.A  FILES TO CREATE
// ─────────────────────────────────────────────────────────────────────────────
//
//  src/modules/dashboard/
//    ├── dashboard.service.js      ← all DB queries live here
//    ├── dashboard.controller.js   ← reads req.user, calls service, sends JSON
//    └── dashboard.routes.js       ← single GET /summary route + auth middleware
//
// ─────────────────────────────────────────────────────────────────────────────
//  1.B  FILES TO MODIFY
// ─────────────────────────────────────────────────────────────────────────────
//
//  src/server.js
//    ADD:
//      import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
//      app.use("/api/dashboard", dashboardRoutes);
//
// ─────────────────────────────────────────────────────────────────────────────
//  1.C  API ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
//
//  GET /api/dashboard/summary
//
//  Auth     : required (auth-v2 middleware — attaches req.user)
//  req.user : { id, username, employee_id, roles: [], permissions: [] }
//             ↑ set by protectRouteV2 in auth-v2.middleware.js
//             roles is an ARRAY e.g. ["ADMIN"] | ["HR"] | ["SUPERVISOR"] | ["EMPLOYEE"]
//             employee_id maps to HR_EMPLOYEE.PERSON_ID
//
//  The controller reads req.user.roles (array) and req.user.employee_id.
//  It calls the appropriate service function(s) based on role.
//  All data is returned in a SINGLE JSON response — frontend makes ONE request.
//
//  Response shape varies by role (see Section 1.E for details).
//
// ─────────────────────────────────────────────────────────────────────────────
//  1.D  DATABASE TABLES USED
// ─────────────────────────────────────────────────────────────────────────────
//
//  HR_EMPLOYEE              — active headcount, new joiners this month
//  HR_ATTENDANCE            — today's attendance stats (existing getAttendanceSummary reused)
//  HR_LEAVE_REQUEST         — pending leave count (STATUS = 'PENDING')
//  HR_LATE_APPLICATION      — pending late application count (STATUS = 'PENDING')
//  HR_ATTENDANCE_CORRECTION — pending correction count (STATUS = 'PENDING')
//  HR_EMPLOYEE_NOTIFICATION — last 5 notifications for the logged-in user
//  HR_PAYROLL_RUN           — latest payroll run status (Admin/HR only)
//  HR_AUDIT_LOG             — employee movement this month
//                             OPERATION IN ('RESIGNATION','TERMINATION','RETIREMENT','TRANSFER','INCREMENT','PROMOTION')
//                             CHANGED_ON between first and last day of current month
//  HR_EMPLOYEE_SUPERVISOR   — used for SUPERVISOR role to scope team queries
//
// ─────────────────────────────────────────────────────────────────────────────
//  1.E  SERVICE FUNCTIONS TO WRITE  (dashboard.service.js)
// ─────────────────────────────────────────────────────────────────────────────
//
//  NOTE: Do NOT re-implement existing logic.
//  Import and reuse from existing services where noted.
//
//  ── SHARED IMPORTS (reuse, do not duplicate) ─────────────────────────────────
//
//  import { getAttendanceSummary }      from "../attendacne/attendance.service.js";
//  import { getTeamAttendanceStats }    from "../attendacne/attendance.service.js";
//  import { getMyAttendanceSummary }    from "../attendacne/attendance.service.js";
//  import { getLeaveBalance }           from "../leave-balance/leave-balance.service.js";
//  import { getNotificationsForSupervisor, getNotificationsForEmployee }
//                                       from "../employee-notification/employee-notification.service.js";
//
//
//  ── FUNCTION 1: getOrgKpis(conn) ──────────────────────────────────────────
//  Used by: ADMIN, HR
//  Returns:
//    {
//      totalActiveEmployees: NUMBER,      -- HR_EMPLOYEE WHERE STATUS = 1
//      newJoinersThisMonth:  NUMBER,      -- HR_EMPLOYEE WHERE JOIN_DATE between
//                                         --   TRUNC(SYSDATE,'MM') AND LAST_DAY(SYSDATE)
//                                         --   AND STATUS = 1
//    }
//  Single SQL query using conditional aggregation:
//    SELECT
//      COUNT(*)                                                   AS TOTAL_ACTIVE,
//      SUM(CASE WHEN JOIN_DATE >= TRUNC(SYSDATE,'MM') THEN 1 ELSE 0 END) AS NEW_JOINERS
//    FROM HR_EMPLOYEE
//    WHERE STATUS = 1
//
//
//  ── FUNCTION 2: getTeamKpis(conn, supervisorId) ───────────────────────────
//  Used by: SUPERVISOR
//  Returns:
//    {
//      teamSize: NUMBER   -- HR_EMPLOYEE_SUPERVISOR WHERE SUPERVISOR_ID = :id AND STATUS = 1
//    }
//  Simple COUNT query on HR_EMPLOYEE_SUPERVISOR.
//
//
//  ── FUNCTION 3: getLatestPayrollRun(conn) ─────────────────────────────────
//  Used by: ADMIN, HR
//  Returns:
//    {
//      payrollId:  NUMBER,
//      runMonth:   STRING,   -- e.g. "2026-04"
//      status:     STRING,   -- DRAFT | PROCESSED | APPROVED
//      totalGross: NUMBER,
//      totalNet:   NUMBER,
//      runDate:    DATE
//    }
//  Query:
//    SELECT PAYROLL_ID, RUN_MONTH, STATUS, TOTAL_GROSS, TOTAL_NET, RUN_DATE
//    FROM HR_PAYROLL_RUN
//    ORDER BY CREATED_DATE DESC
//    FETCH FIRST 1 ROW ONLY
//
//
//  ── FUNCTION 4: getOrgPendingCounts(conn) ─────────────────────────────────
//  Used by: ADMIN, HR
//  Returns:
//    {
//      pendingLeaves:       NUMBER,   -- HR_LEAVE_REQUEST WHERE STATUS = 'PENDING'
//      pendingLateApps:     NUMBER,   -- HR_LATE_APPLICATION WHERE STATUS = 'PENDING'
//      pendingCorrections:  NUMBER    -- HR_ATTENDANCE_CORRECTION WHERE STATUS = 'PENDING'
//    }
//  Single SQL using three subqueries or UNION — prefer three scalar subqueries for clarity:
//    SELECT
//      (SELECT COUNT(*) FROM HR_LEAVE_REQUEST        WHERE STATUS = 'PENDING') AS PENDING_LEAVES,
//      (SELECT COUNT(*) FROM HR_LATE_APPLICATION     WHERE STATUS = 'PENDING') AS PENDING_LATE,
//      (SELECT COUNT(*) FROM HR_ATTENDANCE_CORRECTION WHERE STATUS = 'PENDING') AS PENDING_CORRECTIONS
//    FROM DUAL
//
//
//  ── FUNCTION 5: getTeamPendingCounts(conn, supervisorId) ──────────────────
//  Used by: SUPERVISOR
//  Returns same shape as getOrgPendingCounts but scoped to team.
//  Join HR_LEAVE_REQUEST / HR_LATE_APPLICATION / HR_ATTENDANCE_CORRECTION
//  each with HR_EMPLOYEE_SUPERVISOR on PERSON_ID WHERE SUPERVISOR_ID = :id AND es.STATUS = 1
//  Query:
//    SELECT
//      (SELECT COUNT(*) FROM HR_LEAVE_REQUEST lr
//         JOIN HR_EMPLOYEE_SUPERVISOR es ON lr.EMPLOYEE_ID = es.PERSON_ID
//        WHERE lr.STATUS = 'PENDING' AND es.SUPERVISOR_ID = :SUP_ID AND es.STATUS = 1) AS PENDING_LEAVES,
//      (SELECT COUNT(*) FROM HR_LATE_APPLICATION la
//         JOIN HR_EMPLOYEE_SUPERVISOR es ON la.PERSON_ID = es.PERSON_ID
//        WHERE la.STATUS = 'PENDING' AND es.SUPERVISOR_ID = :SUP_ID AND es.STATUS = 1) AS PENDING_LATE,
//      (SELECT COUNT(*) FROM HR_ATTENDANCE_CORRECTION ac
//         JOIN HR_EMPLOYEE_SUPERVISOR es ON ac.PERSON_ID = es.PERSON_ID
//        WHERE ac.STATUS = 'PENDING' AND es.SUPERVISOR_ID = :SUP_ID AND es.STATUS = 1) AS PENDING_CORRECTIONS
//    FROM DUAL
//
//
//  ── FUNCTION 6: getMyPendingCounts(conn, personId) ────────────────────────
//  Used by: EMPLOYEE
//  Returns own submitted-but-pending request counts:
//    {
//      pendingLeaves:      NUMBER,   -- HR_LEAVE_REQUEST WHERE EMPLOYEE_ID = :id AND STATUS = 'PENDING'
//      pendingLateApps:    NUMBER,   -- HR_LATE_APPLICATION WHERE PERSON_ID = :id AND STATUS = 'PENDING'
//      pendingCorrections: NUMBER    -- HR_ATTENDANCE_CORRECTION WHERE PERSON_ID = :id AND STATUS = 'PENDING'
//    }
//  Same scalar-subquery pattern as above, filtered by personId.
//
//
//  ── FUNCTION 7: getEmployeeMovementSummary(conn) ──────────────────────────
//  Used by: ADMIN, HR
//  Returns counts of HR events in the current calendar month:
//    {
//      newJoiners:    NUMBER,   -- HR_EMPLOYEE.JOIN_DATE in current month AND STATUS = 1
//      transfers:     NUMBER,   -- HR_AUDIT_LOG OPERATION = 'TRANSFER'
//      endEmployments:NUMBER,   -- HR_AUDIT_LOG OPERATION IN ('RESIGNATION','TERMINATION','RETIREMENT')
//      increments:    NUMBER,   -- HR_AUDIT_LOG OPERATION = 'INCREMENT'
//      promotions:    NUMBER    -- HR_AUDIT_LOG OPERATION = 'PROMOTION'
//    }
//  Query:
//    SELECT
//      (SELECT COUNT(*) FROM HR_EMPLOYEE
//        WHERE STATUS = 1
//          AND JOIN_DATE BETWEEN TRUNC(SYSDATE,'MM') AND LAST_DAY(SYSDATE)) AS NEW_JOINERS,
//      (SELECT COUNT(*) FROM HR_AUDIT_LOG
//        WHERE OPERATION = 'TRANSFER'
//          AND CHANGED_ON >= TRUNC(SYSDATE,'MM'))                           AS TRANSFERS,
//      (SELECT COUNT(*) FROM HR_AUDIT_LOG
//        WHERE OPERATION IN ('RESIGNATION','TERMINATION','RETIREMENT')
//          AND CHANGED_ON >= TRUNC(SYSDATE,'MM'))                           AS END_EMPLOYMENTS,
//      (SELECT COUNT(*) FROM HR_AUDIT_LOG
//        WHERE OPERATION = 'INCREMENT'
//          AND CHANGED_ON >= TRUNC(SYSDATE,'MM'))                           AS INCREMENTS,
//      (SELECT COUNT(*) FROM HR_AUDIT_LOG
//        WHERE OPERATION = 'PROMOTION'
//          AND CHANGED_ON >= TRUNC(SYSDATE,'MM'))                           AS PROMOTIONS
//    FROM DUAL
//
//
//  ── FUNCTION 8: getRecentNotifications(conn, personId, role) ──────────────
//  Used by: ALL ROLES
//  Reuse existing service functions — just slice to last 5:
//    - SUPERVISOR → getNotificationsForSupervisor(personId) then .slice(0, 5)
//    - EMPLOYEE   → getNotificationsForEmployee(personId) then .slice(0, 5)
//    - ADMIN / HR → getNotificationsForSupervisor(personId) then .slice(0, 5)
//                   (Admin/HR users are treated as supervisors for notification routing)
//  NOTE: These functions already open+close their own connection.
//  So call them AFTER closing the shared conn in the main service function.
//  See Section 1.F for connection management pattern.
//
//
//  ── MAIN EXPORTED FUNCTIONS ───────────────────────────────────────────────
//
//  export const getAdminHrDashboard = async (employeeId) => { ... }
//    Opens ONE connection, runs:
//      getOrgKpis, getLatestPayrollRun, getOrgPendingCounts, getEmployeeMovementSummary
//    using the shared conn (pass conn as param to each helper).
//    Then calls getAttendanceSummary({ date: TODAY }) — it opens its own conn.
//    Then calls getRecentNotifications — it opens its own conn.
//    Returns the full combined object.
//
//  export const getSupervisorDashboard = async (employeeId) => { ... }
//    Opens ONE connection, runs:
//      getTeamKpis, getTeamPendingCounts
//    using shared conn.
//    Then calls getTeamAttendanceStats(employeeId, { date: TODAY }) — own conn.
//    Then calls getRecentNotifications — own conn.
//    Returns combined object.
//
//  export const getEmployeeDashboard = async (employeeId) => { ... }
//    No shared conn needed — all reused functions manage their own connections:
//      getMyAttendanceSummary(employeeId, { fromDate: START_OF_MONTH, toDate: TODAY })
//      getLeaveBalance(employeeId)
//      getMyPendingCounts  ← this one needs a conn, open separately
//      getRecentNotifications
//    Returns combined object.
//
// ─────────────────────────────────────────────────────────────────────────────
//  1.F  CONNECTION MANAGEMENT PATTERN
// ─────────────────────────────────────────────────────────────────────────────
//
//  IMPORTANT: Functions that reuse existing services (getAttendanceSummary,
//  getTeamAttendanceStats, getLeaveBalance, etc.) each open and close their
//  OWN connection internally. DO NOT pass a shared conn to them.
//
//  For the new helper functions in dashboard.service.js (getOrgKpis,
//  getLatestPayrollRun, etc.) — accept `conn` as a parameter so the
//  main function can share ONE connection across them.
//
//  Pattern:
//    export const getAdminHrDashboard = async (employeeId) => {
//      const conn = await getConnection();
//      try {
//        const kpis     = await getOrgKpis(conn);
//        const payroll  = await getLatestPayrollRun(conn);
//        const pending  = await getOrgPendingCounts(conn);
//        const movement = await getEmployeeMovementSummary(conn);
//        await conn.close();
//        // ── now call functions that manage their own connections ──────────
//        const today    = format(new Date(), "yyyy-MM-dd");
//        const attStats = await getAttendanceSummary({ date: today });
//        const notifs   = await getRecentNotifications(employeeId, "ADMIN");
//        return { kpis, payroll, pendingApprovals: pending, movement, todayAttendance: attStats, recentNotifications: notifs };
//      } catch (err) {
//        await conn.close();   // close on error too — no rollback needed (all SELECTs)
//        throw err;
//      }
//    };
//
// ─────────────────────────────────────────────────────────────────────────────
//  1.G  CONTROLLER  (dashboard.controller.js)
// ─────────────────────────────────────────────────────────────────────────────
//
//  import { getAdminHrDashboard, getSupervisorDashboard, getEmployeeDashboard }
//    from "./dashboard.service.js";
//
//  export const getDashboardSummary = async (req, res) => {
//    try {
//      const { roles = [], employee_id } = req.user;  // from protectRouteV2 middleware
//
//      // Same pattern as leave-request-list.jsx on the frontend
//      const isAdminOrHR  = roles.includes("ADMIN") || roles.includes("HR");
//      const isSupervisor = !isAdminOrHR && roles.includes("SUPERVISOR");
//
//      let data;
//      if (isAdminOrHR) {
//        data = await getAdminHrDashboard(employee_id);
//      } else if (isSupervisor) {
//        data = await getSupervisorDashboard(employee_id);
//      } else {
//        data = await getEmployeeDashboard(employee_id);
//      }
//
//      return res.status(200).json({ success: true, data });
//    } catch (err) {
//      console.error("[Dashboard] Error:", err.message);
//      return res.status(500).json({ success: false, error: err.message });
//    }
//  };
//
// ─────────────────────────────────────────────────────────────────────────────
//  1.H  ROUTES  (dashboard.routes.js)
// ─────────────────────────────────────────────────────────────────────────────
//
//  import express from "express";
//  import { getDashboardSummary } from "./dashboard.controller.js";
//  import { protectRouteV2 } from "../auth-v2/auth-v2.middleware.js";  // correct middleware name
//
//  const router = express.Router();
//  router.get("/summary", protectRouteV2, getDashboardSummary);
//  export default router;
//
// ─────────────────────────────────────────────────────────────────────────────
//  1.I  RESPONSE SHAPE PER ROLE
// ─────────────────────────────────────────────────────────────────────────────
//
//  ADMIN / HR:
//  {
//    kpis: {
//      totalActiveEmployees: 150,
//      newJoinersThisMonth:  3
//    },
//    todayAttendance: {         // from getAttendanceSummary — existing shape
//      TOTAL: 150, PRESENT: 120, LATE: 10, ABSENT: 15,
//      ON_LEAVE: 3, HOLIDAY: 0, WEEKLY_OFF: 2, UNSCHEDULED: 0,
//      TOTAL_WORK_HOURS: 960, TOTAL_OVERTIME_HOURS: 12
//    },
//    pendingApprovals: {
//      pendingLeaves:      8,
//      pendingLateApps:    3,
//      pendingCorrections: 2
//    },
//    latestPayrollRun: {
//      payrollId: 5, runMonth: "2026-04",
//      status: "APPROVED", totalGross: 1500000, totalNet: 1380000,
//      runDate: "2026-04-30"
//    },
//    employeeMovement: {
//      newJoiners:     3,
//      transfers:      1,
//      endEmployments: 1,
//      increments:     2,
//      promotions:     0
//    },
//    recentNotifications: [   // last 5, existing shape from notification service
//      { ID, NOTIFICATION_DETAILS, STATUS, CREATED_DATE, FIRST_NAME, LAST_NAME, ... }
//    ]
//  }
//
//  SUPERVISOR:
//  {
//    kpis: {
//      teamSize: 12
//    },
//    todayAttendance: {         // from getTeamAttendanceStats — team-scoped
//      TOTAL: 12, PRESENT: 10, LATE: 1, ABSENT: 1, ON_LEAVE: 0, ...
//    },
//    pendingApprovals: {        // team-scoped
//      pendingLeaves:      2,
//      pendingLateApps:    1,
//      pendingCorrections: 0
//    },
//    recentNotifications: [...]
//  }
//
//  EMPLOYEE:
//  {
//    myAttendanceSummary: {     // from getMyAttendanceSummary — current month
//      period: { from: "2026-05-01", to: "2026-05-19" },
//      TOTAL_DAYS: 19, PRESENT: 16, LATE: 2, ABSENT: 1,
//      WORKING_DAYS: 17, ATTENDED_DAYS: 18,
//      TOTAL_WORK_HOURS: 128, AVG_WORK_HOURS_PER_DAY: 7.5
//    },
//    myLeaveBalance: [          // from getLeaveBalance — existing shape
//      { LEAVE_TYPE_NAME, ALLOCATED, USED, REMAINING, PENDING_DAYS, APPROVED_DAYS }
//    ],
//    myPendingRequests: {
//      pendingLeaves:      1,
//      pendingLateApps:    0,
//      pendingCorrections: 0
//    },
//    recentNotifications: [...]
//  }


// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 2 — FRONTEND
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
//  2.A  FILES TO CREATE
// ─────────────────────────────────────────────────────────────────────────────
//
//  src/features/dashboard/
//    ├── index.jsx                       ← main dashboard page, role-aware layout
//    ├── queries.js                      ← useDashboardSummary hook
//    └── components/
//        ├── kpi-card.jsx               ← reusable stat card (icon + label + value + optional delta)
//        ├── attendance-summary-card.jsx ← today's attendance breakdown (bar or stat row)
//        ├── pending-approvals-card.jsx  ← pending counts with link to the relevant page
//        ├── notifications-card.jsx      ← last 5 notifications list
//        ├── employee-movement-card.jsx  ← movement counts (Admin/HR only)
//        └── payroll-status-card.jsx     ← latest payroll run status (Admin/HR only)
//
// ─────────────────────────────────────────────────────────────────────────────
//  2.B  FILES TO MODIFY
// ─────────────────────────────────────────────────────────────────────────────
//
//  src/pages/welcome.jsx
//    REPLACE placeholder content with:
//      import DashboardPage from "@/features/dashboard/index.jsx";
//      const Welcome = () => <DashboardPage />;
//    Keep the file — just swap its content.
//
// ─────────────────────────────────────────────────────────────────────────────
//  2.C  QUERY HOOK  (src/features/dashboard/queries.js)
// ─────────────────────────────────────────────────────────────────────────────
//
//  const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/dashboard`;
//
//  export const useDashboardSummary = () =>
//    useQuery({
//      queryKey: ["dashboard", "summary"],
//      queryFn:  async () => {
//        const res = await fetch(`${BASE}/summary`, {
//          headers: {
//            "Content-Type": "application/json",
//            Authorization: `Bearer ${getToken()}`,  // same pattern used in other queries
//          },
//        });
//        if (!res.ok) throw new Error("Failed to load dashboard");
//        const json = await res.json();
//        return json.data;
//      },
//      staleTime: 60 * 1000,        // dashboard data is fine at 1-minute stale
//      refetchOnWindowFocus: false,
//      retry: 1,
//    });
//
// ─────────────────────────────────────────────────────────────────────────────
//  2.D  MAIN PAGE  (src/features/dashboard/index.jsx)
// ─────────────────────────────────────────────────────────────────────────────
//
//  - Call useDashboardSummary()
//  - Read role from useAuthV2() → user.role
//  - While loading: show skeleton cards (use Skeleton from shadcn/ui)
//  - On error: show a simple error state (not a full crash)
//  - Render role-specific layout:
//
//    ADMIN / HR layout (2-col grid on desktop):
//      Row 1 — KPI cards (Total Employees, New Joiners, Pending Approvals total)
//      Row 2 — Today's Attendance card (full width) + Payroll Status card
//      Row 3 — Employee Movement card + Notifications card
//
//    SUPERVISOR layout:
//      Row 1 — KPI card (Team Size) + Pending Approvals card
//      Row 2 — Today's Team Attendance card (full width)
//      Row 3 — Notifications card
//
//    EMPLOYEE layout:
//      Row 1 — My Attendance Summary card (current month stats)
//      Row 2 — Leave Balance card
//      Row 3 — My Pending Requests card + Notifications card
//
// ─────────────────────────────────────────────────────────────────────────────
//  2.E  COMPONENT DETAILS
// ─────────────────────────────────────────────────────────────────────────────
//
//  kpi-card.jsx
//    Props: { title, value, icon, description? }
//    Use shadcn Card component.
//    Example: <KpiCard title="Total Employees" value={150} icon={<UsersIcon />} />
//
//  attendance-summary-card.jsx
//    Props: { data }  — data is the todayAttendance or myAttendanceSummary object
//    Show status breakdown as colored stat items:
//      Present (green) · Late (yellow) · Absent (red) · On Leave (blue) · Weekly Off / Holiday (gray)
//    Show total work hours at the bottom.
//
//  pending-approvals-card.jsx
//    Props: { pendingLeaves, pendingLateApps, pendingCorrections }
//    Show each count as a row with a link to the relevant page:
//      Leaves      → PATHS.ATTENDANCE.LEAVE_REQUEST
//      Late Apps   → PATHS.ATTENDANCE.LATE_APPLICATION
//      Corrections → PATHS.ATTENDANCE.ATTENDANCE_CORRECTION
//    Use shadcn Badge for counts.
//
//  notifications-card.jsx
//    Props: { notifications }  — array of notification objects
//    Show last 5. Each row: NOTIFICATION_DETAILS (truncated) + CREATED_DATE (relative time).
//    "View All" link at the bottom.
//    If empty: empty state ("No new notifications").
//
//  employee-movement-card.jsx  (Admin/HR only)
//    Props: { movement }  — { newJoiners, transfers, endEmployments, increments, promotions }
//    Label: "This Month"
//    Display as a simple list of rows:  icon · label · count
//
//  payroll-status-card.jsx  (Admin/HR only)
//    Props: { payrollRun }
//    Show: Run Month · Status badge (DRAFT=gray, PROCESSED=yellow, APPROVED=green) · Net Total
//    If null (no payroll run yet): "No payroll run found"
//    Link to PATHS.PAYROLL.RUNS


// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 3 — IMPLEMENTATION ORDER (for a 2-dev team)
// ═════════════════════════════════════════════════════════════════════════════
//
//  Step 1 — Backend
//    1. Create dashboard.service.js  (write all helper functions + 3 main exports)
//    2. Create dashboard.controller.js
//    3. Create dashboard.routes.js
//    4. Register in server.js
//    5. Test with REST client (Postman / Thunder Client) for each role
//
//  Step 2 — Frontend
//    1. Create queries.js with useDashboardSummary
//    2. Create kpi-card.jsx (simplest component, unblocks everything)
//    3. Create index.jsx with skeleton loading + role branching
//    4. Create attendance-summary-card.jsx
//    5. Create pending-approvals-card.jsx
//    6. Create notifications-card.jsx
//    7. Create employee-movement-card.jsx
//    8. Create payroll-status-card.jsx
//    9. Update welcome.jsx to render DashboardPage
//
//  Step 3 — Polish (defer until core is working)
//    - Relative timestamps on notifications ("2 hours ago")
//    - Refetch interval on dashboard (every 5 minutes)
//    - Empty states for each card
//    - Mobile layout review (single column)