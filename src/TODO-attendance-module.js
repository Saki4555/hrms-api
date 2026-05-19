
// ─────────────────────────────────────────────────────────────────────────────
//  TODO: ATTENDANCE ROW — UNIFIED DETAIL SHEET
// ─────────────────────────────────────────────────────────────────────────────
//
//  Current state:
//    - "Punches" button  → AttendanceDetailDialog  (raw ATT_LOG punches)
//    - "Edit" button     → ManualEditDialog         (Admin/HR edit)
//    Both are separate small dialogs triggered from the table row.
//
//  Target state (see design reference image):
//    - ONE "Details" action button per row
//    - Opens a Sheet (drawer) — wide enough to show rich content
//    - Sheet contains three sections:
//
//      1. EMPLOYEE HEADER
//           Avatar, full name, EMP_NO, role/designation, phone
//           Navigation arrows: "1 of N" ← → to move between employees
//           "View Full Profile" link → /employees/:id
//
//      2. ATTENDANCE STATS STRIP  (monthly KPIs for that employee)
//           Day off · Late clock-in · Late clock-out · No clock-out ·
//           Off time quota · Absent  (with vs-last-month delta)
//
//      3. ATTENDANCE TIMELINE  (per-day rows, most recent first)
//           Each day row shows:
//             - Date label ("Today", "Thursday 18", etc.)
//             - Visual timeline bar  (Working time / Break / Overtime blocks)
//               colour-coded: blue = working, orange = overtime, yellow = break
//             - Clock-in time · Clock-out time · Duration
//             - Status chip: Approved / Late / Requested day off / etc.
//             - Approve button (Supervisor/Admin) where applicable
//           Filter: "All Status" dropdown to filter by status
//           Search: employee search within the sheet
//
//      4. MANUAL EDIT SECTION  (Admin/HR only — replaces ManualEditDialog)
//           Inline within the sheet, not a nested dialog
//           Same fields: in_time / out_time time inputs
//           Same logic: confirmation → mutation → reprocess → invalidate
//           Same audit warning banner
//
//      5. AUDIT LOG TAB / SECTION  (Admin/HR only)
//           Timeline of all MAN_EDIT changes to this attendance record
//           Source: GET /api/attendance/:attendanceId/audit-log
//           Each entry: CHANGED_ON · CHANGED_BY · old times → new times
//
//  Files to create / modify:
//    CREATE  src/features/attendance/attendance-detail-sheet.jsx
//              replaces AttendanceDetailDialog + ManualEditDialog
//    MODIFY  src/features/attendance/attendance-list.jsx
//              remove separate Punches + Edit buttons
//              add single Details button → opens AttendanceDetailSheet
//    CREATE  src/features/attendance/attendance-timeline.jsx
//              the visual bar component (reusable)
//    MODIFY  src/features/attendance/queries.js
//              ADD useAttendanceAuditLog(attendanceId)
//                  GET /api/attendance/:attendanceId/audit-log
//    MODIFY  attendance.service.js
//              ADD getAttendanceAuditLog(attendanceId)
//    MODIFY  attendance.controller.js + attendance.routes.js
//              ADD GET /:attendanceId/audit-log

