// seedRolePermissions.js
// Maps all 55 permissions to 4 roles based EXACTLY on HRMS_Features.pdf matrix
// Run AFTER: seedRoles.js → seedRbac.js → this file

import { getConnection, connectDB } from "./src/config/db.js";

export const seedRolePermissions = async () => {
  let conn;
  try {
    conn = await getConnection();

    // ── 1. Fetch role IDs ─────────────────────────────────────────────────────
    const getRoleId = async (name) => {
      const res = await conn.execute(
        `SELECT ID FROM HCM.ROLES WHERE ROLE_NAME = :1`, [name]
      );
      if (res.rows.length === 0)
        throw new Error(`Role '${name}' not found. Run seedRoles.js first.`);
      return res.rows[0][0];
    };

    const adminId      = await getRoleId("Admin");
    const hrId         = await getRoleId("HR");
    const supervisorId = await getRoleId("Supervisor");
    const employeeId   = await getRoleId("Employee");

    console.log(`✅ Roles → Admin:${adminId} HR:${hrId} Supervisor:${supervisorId} Employee:${employeeId}`);

    // ── 2. Fetch all permissions: code → id ───────────────────────────────────
    const allPermsRes = await conn.execute(
      `SELECT ID, PERMISSION_CODE FROM HCM.PERMISSIONS`
    );
    const permMap = {};
    for (const [id, code] of allPermsRes.rows) {
      permMap[code] = id;
    }
    console.log(`✅ ${Object.keys(permMap).length} permissions loaded.\n`);

    // ── 3. Insert helper (duplicate-safe) ─────────────────────────────────────
    const assign = async (roleId, permCode) => {
      const permId = permMap[permCode];
      if (!permId) {
        console.warn(`  ⚠ Permission '${permCode}' not in DB. Skipping.`);
        return;
      }
      const check = await conn.execute(
        `SELECT 1 FROM HCM.ROLE_PERMISSIONS
          WHERE ROLE_ID = :1 AND PERMISSION_ID = :2`,
        [roleId, permId]
      );
      if (check.rows.length === 0) {
        await conn.execute(
          `INSERT INTO HCM.ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID, GRANTED_BY)
           VALUES (:1, :2, NULL)`,
          [roleId, permId]
        );
      }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // ADMIN — Full access to all 55 permissions
    // Every ✓ column in every matrix table
    // ═════════════════════════════════════════════════════════════════════════
    console.log("👑 Seeding ADMIN (full access)...");
    for (const code of Object.keys(permMap)) {
      await assign(adminId, code);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HR — All operational permissions
    // Restricted from Admin-only system config per matrix:
    //   ✗ Configure Pay Elements / Deduction   → PAY_CONFIG
    //   ✗ Configure Tax Slabs                  → PAY_TAX_SLABS
    //   ✗ Configure PF Rules                   → PF_RULES_CONFIG
    //   ✗ Configure Gratuity Formula            → GRAT_FORMULA_CONFIG
    //   ✗ Create Loan Category                 → LOAN_CAT_CREATE
    //   ✗ Take AI-based Team Attendance        → ATT_REALTIME_AI (Supervisor only)
    // ═════════════════════════════════════════════════════════════════════════
    console.log("👤 Seeding HR...");
    const HR_RESTRICTED = new Set([
      "PAY_CONFIG",
      "PAY_TAX_SLABS",
      "PF_RULES_CONFIG",
      "GRAT_FORMULA_CONFIG",
      "LOAN_CAT_CREATE",
      "ATT_REALTIME_AI",
    ]);
    for (const code of Object.keys(permMap)) {
      if (!HR_RESTRICTED.has(code)) {
        await assign(hrId, code);
      }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SUPERVISOR — Team management + self-service only
    // Sourced row-by-row from matrix ✓ column (pages 10–15)
    // ═════════════════════════════════════════════════════════════════════════
    console.log("🏢 Seeding SUPERVISOR...");
    const SUPERVISOR_PERMISSIONS = [
      // Dashboard
      "DASH_VIEW_TEAM",       // ✓ Manager Dashboard
      "DASH_VIEW_SELF",       // ✓ Employee Dashboard (self)

      // Core HR
      "ORG_CHART_VIEW",       // ✓ View Employee Details (team only)

      // Attendance
      "ATT_SCHEDULE_MANAGE",  // ✓ Create/Approve/Modify Work Schedule (Team)
      "ATT_REALTIME_AI",      // ✓ ONLY Supervisor — AI face detection attendance
      "ATT_VIEW_TEAM",        // ✓ View Attendance (Team)
      "ATT_REPORT_ALL",       // ✓ Attendance Reports (team)
      "ATT_LEAVE_APPLY",      // ✓ Apply for Leave / Late (self)
      "ATT_LEAVE_APPROVE",    // ✓ Approve Leave / Late (team)

      // Payroll
      "PAY_PAYSLIP_SELF",     // ✓ View Payslip (self)

      // Performance
      "PERF_REVIEW_SUBMIT",   // ✓ Employee Self-Appraisal + Supervisor Evaluation
                              //   + Recommend Increment/Promotion
      "PERF_VIEW_REPORT",     // ✓ View Appraisal Result (team)

      // Self-Service
      "ESS_PROFILE_UPDATE",   // ✓ Update Personal Information (self)
      "ESS_LEAVE_APPLY",      // ✓ Apply for Leave (self)
      "ESS_LATE_APPLY",       // ✓ Apply for Late (self)
      "ESS_ATT_CORRECT",      // ✓ Attendance Correction Request (self)
      "ESS_LOAN_APPLY",       // ✓ Apply for Loan / Advance (self)
      "ESS_ATT_VIEW",         // ✓ View Own Attendance (self)
      "MSS_APPROVE_TEAM",     // ✓ Approve Team Requests
      "MSS_TEAM_VIEW",        // ✓ View Team Attendance / Profile

      // PF Management
      "PF_STATEMENT_VIEW",    // ✓ View PF Statement (team)

      // Gratuity
      // ✗ GRAT_STATEMENT_VIEW — Supervisor explicitly ✗ per matrix page 13

      // Loan & Advance
      "LOAN_APPROVE",         // ✓ Approve Loan Request (team)
      "LOAN_LEDGER_VIEW",     // ✓ View Loan Ledger (team)

      // Document Management
      "DOC_TEAM_VIEW",        // ✓ View Team Documents
      "DOC_SELF_VIEW",        // ✓ View Own Documents (self)

      // Communication
      "COMM_TEAM_MSG",        // ✓ Send Team Messages
      "COMM_RECEIVE",         // ✓ Receive Notifications

      // Reports
      "REP_GENERATE",         // ✓ Attendance Reports (team) + Appraisal Reports (team)
                              //   + Employee List (team)
    ];
    for (const code of SUPERVISOR_PERMISSIONS) {
      await assign(supervisorId, code);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // EMPLOYEE — Personal / self-service access only
    // Sourced row-by-row from matrix ✓ column (pages 10–15)
    // ═════════════════════════════════════════════════════════════════════════
    console.log("👨‍💼 Seeding EMPLOYEE...");
    const EMPLOYEE_PERMISSIONS = [
      // Dashboard
      "DASH_VIEW_SELF",       // ✓ Employee Dashboard (self)

      // Core HR
      "ORG_CHART_VIEW",       // ✓ View Employee Details (self only)

      // Attendance
      "ATT_LEAVE_APPLY",      // ✓ Apply for Leave / Late (self)

      // Payroll
      "PAY_PAYSLIP_SELF",     // ✓ View Payslip (self)

      // Performance
      "PERF_REVIEW_SUBMIT",   // ✓ Employee Self-Appraisal (self)
      "PERF_VIEW_REPORT",     // ✓ View Appraisal Result (self)

      // Self-Service
      "ESS_PROFILE_UPDATE",   // ✓ Update Personal Information (self)
      "ESS_LEAVE_APPLY",      // ✓ Apply for Leave (self)
      "ESS_LATE_APPLY",       // ✓ Apply for Late (self)
      "ESS_ATT_CORRECT",      // ✓ Attendance Correction Request (self)
      "ESS_LOAN_APPLY",       // ✓ Apply for Loan / Advance (self)
      "ESS_ATT_VIEW",         // ✓ View Own Attendance (self)

      // PF Management
      "PF_STATEMENT_VIEW",    // ✓ View PF Statement (self)

      // Gratuity
      "GRAT_STATEMENT_VIEW",  // ✓ View Gratuity Statement (self)

      // Loan & Advance
      "LOAN_LEDGER_VIEW",     // ✓ View Loan Ledger (self)

      // Document Management
      "DOC_SELF_VIEW",        // ✓ View Own Documents (self)

      // Communication
      "COMM_RECEIVE",         // ✓ Receive Notifications

      // Reports
      "REP_GENERATE",         // ✓ Employee List (self)
    ];
    for (const code of EMPLOYEE_PERMISSIONS) {
      await assign(employeeId, code);
    }

    await conn.commit();

    // ── Summary ───────────────────────────────────────────────────────────────
    const countRes = await conn.execute(
      `SELECT r.ROLE_NAME, COUNT(rp.PERMISSION_ID) AS CNT
       FROM HCM.ROLES r
       LEFT JOIN HCM.ROLE_PERMISSIONS rp ON r.ID = rp.ROLE_ID
       GROUP BY r.ROLE_NAME
       ORDER BY CNT DESC`
    );
    console.log("\n📊 Final Role–Permission Summary:");
    for (const [roleName, cnt] of countRes.rows) {
      console.log(`  ${roleName.padEnd(12)}: ${cnt} permissions`);
    }
    console.log("\n✅ Role–Permission Mapping Complete!");

  } catch (err) {
    if (conn) await conn.rollback();
    console.error("❌ Mapping failed:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};

const run = async () => {
  try {
    await connectDB();
    await seedRolePermissions();
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  }
};

run();