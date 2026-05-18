// ─────────────────────────────────────────────────────────────────────────────
//  TODO [done]: ESS Attendance Tables — Late Application & Attendance Correction
//  Waiting for DB tables to be created by boss before building these modules.
// ─────────────────────────────────────────────────────────────────────────────

// ── TABLE STATUS ──────────────────────────────────────────────────────────────

// TODO[done]: Ask boss to run create-late-correction-tables.sql on the Oracle DB
//       Tables needed:
//         - HR_LATE_APPLICATION         (with sequence + trigger)
//         - HR_ATTENDANCE_CORRECTION    (with sequence + trigger)
//       Alter needed:
//         - HR_EMPLOYEE_NOTIFICATION    ADD LATE_ID, CORRECTION_ID columns
//           ← required before building either module, notifications depend on it

// ── MODULE 1: LATE APPLICATION ────────────────────────────────────────────────
//
//  Flow:
//    Employee submits late application
//      → Supervisor gets notification
//        → Supervisor approves/rejects
//          → Employee gets notification
//
//  Files to create once table exists:
//
//  Backend:
//    src/modules/late-application/
//      late-application.service.js
//        - createLateApplication(data)
//            fields: person_id, late_date, actual_in_time, reason
//            — employee submits
//        - getLateApplicationsByEmployee(personId, status)  — ESS view
//        - getLateApplicationsByTeam(supervisorId, status)  — MSS view
//        - getAllLateApplications(params)      — Admin/HR paginated view
//        - approveLateApplication(lateId, approverId, notificationId)
//        - rejectLateApplication(lateId, approverId, notificationId, reason)
//        - deleteLateApplication(lateId)      — cancel if still PENDING
//
//      late-application.controller.js
//      late-application.routes.js
//        GET    /api/late-application                → getAllLateApplications (Admin/HR)
//        GET    /api/late-application/employee/:id  → getLateApplicationsByEmployee
//        GET    /api/late-application/team/:id      → getLateApplicationsByTeam
//        POST   /api/late-application               → createLateApplication
//        POST   /api/late-application/:id/approve   → approveLateApplication
//        POST   /api/late-application/:id/reject    → rejectLateApplication
//        DELETE /api/late-application/:id           → deleteLateApplication
//
//  Frontend:
//    src/features/attendance-management/late-application/
//      queries.js
//      late-application-list.jsx   — same pattern as leave-request-list.jsx
//      add-late-application-sheet.jsx
//        Fields: late_date, actual_in_time, reason
//
//  Notification:
//    Same pattern as leave — notify supervisor on create, notify employee on approve/reject
//    Plug into HR_EMPLOYEE_NOTIFICATION using LATE_ID column (newly added)

// ── MODULE 2: ATTENDANCE CORRECTION ──────────────────────────────────────────
//
//  Flow:
//    Employee submits correction request (wrong/missing punch)
//      → Supervisor gets notification
//        → Supervisor approves
//          → HR_ATTENDANCE row is updated with requested times
//            → processAttendance(date, date, personId) reclassifies the row
//              → Employee gets notification
//
//  Key difference from Late Application:
//    Approval triggers processAttendance() — not just a status change.
//    If HR_ATTENDANCE row doesn't exist for that date → MERGE handles INSERT.
//    If HR_ATTENDANCE row exists → MERGE handles UPDATE.
//
//  Files to create once table exists:
//
//  Backend:
//    src/modules/attendance-correction/
//      attendance-correction.service.js
//        - createCorrectionRequest(data)
//            fields: person_id, correction_date, requested_in_time, requested_out_time, reason
//        - getCorrectionsByEmployee(personId, status)
//        - getCorrectionsByTeam(supervisorId, status)
//        - getAllCorrections(params)
//        - approveCorrection(correctionId, approverId, notificationId)
//            → MERGE into HR_ATTENDANCE with requested times + STATUS = 'PENDING'
//            → call processAttendance(correctionDate, correctionDate, personId)
//        - rejectCorrection(correctionId, approverId, notificationId, reason)
//        - deleteCorrectionRequest(correctionId)
//
//      attendance-correction.controller.js
//      attendance-correction.routes.js
//        GET    /api/attendance-correction                → getAllCorrections
//        GET    /api/attendance-correction/employee/:id  → getCorrectionsByEmployee
//        GET    /api/attendance-correction/team/:id      → getCorrectionsByTeam
//        POST   /api/attendance-correction               → createCorrectionRequest
//        POST   /api/attendance-correction/:id/approve   → approveCorrection
//        POST   /api/attendance-correction/:id/reject    → rejectCorrection
//        DELETE /api/attendance-correction/:id           → deleteCorrectionRequest
//
//  Frontend:
//    src/features/attendance-management/attendance-correction/
//      queries.js
//      attendance-correction-list.jsx
//      add-correction-request-sheet.jsx
//        Fields: correction_date, requested_in_time, requested_out_time, reason
//
//  Notification:
//    Plug into HR_EMPLOYEE_NOTIFICATION using CORRECTION_ID column (newly added)

// ── REGISTER IN app.js WHEN READY ────────────────────────────────────────────
//
// import lateApplicationRoutes       from "./modules/late-application/late-application.routes.js";
// import attendanceCorrectionRoutes  from "./modules/attendance-correction/attendance-correction.routes.js";
//
// app.use("/api/late-application",      lateApplicationRoutes);
// app.use("/api/attendance-correction", attendanceCorrectionRoutes);

// ! src\extra-tables.sql