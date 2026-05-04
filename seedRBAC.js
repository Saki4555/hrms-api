// seedRbac.js — Modules + Permissions
// Based on HRMS_Features.pdf Role–Permission Matrix (pages 10–15)
// Total: 12 Modules, 55 Permissions

import { getConnection, connectDB } from "./src/config/db.js";
import oracledb from "oracledb";

export const seedRbacData = async () => {
  let conn;
  try {
    conn = await getConnection();

    // ─────────────────────────────────────────────────────────────────────────
    // MODULES (12)
    // ─────────────────────────────────────────────────────────────────────────
    const modulesData = [
      { name: "Dashboard",           desc: "Main entry point for all users",               seq: 1  },
      { name: "Core HR",             desc: "Employee data and organizational structure",    seq: 2  },
      { name: "Attendance",          desc: "Shift, rotation, AI attendance tracking",       seq: 3  },
      { name: "Payroll",             desc: "Salary processing and bank reports",            seq: 4  },
      { name: "Performance",         desc: "KPIs, appraisals and evaluations",              seq: 5  },
      { name: "Self-Service",        desc: "Employee and Manager self-service portal",      seq: 6  },
      { name: "PF Management",       desc: "Provident Fund tracking and contributions",     seq: 7  },
      { name: "Gratuity",            desc: "Final settlement and monthly provisioning",     seq: 8  },
      { name: "Loan & Advance",      desc: "Loan lifecycle and repayment management",       seq: 9  },
      { name: "Document Management", desc: "Digital storage for HR and Employee files",     seq: 10 },
      { name: "Communication",       desc: "Announcements, team messages, and alerts",      seq: 11 },
      { name: "Reports",             desc: "Standard reports and custom analytics",         seq: 12 },
    ];

    const moduleMap = {};

    console.log("📦 Inserting Modules...");
    for (const m of modulesData) {
      // Check if module already exists
      const existing = await conn.execute(
        `SELECT ID FROM MODULES WHERE MODULE_NAME = :1`, [m.name]
      );
      if (existing.rows.length > 0) {
        moduleMap[m.name] = existing.rows[0][0];
        console.log(`  - Module '${m.name}' already exists → ID ${moduleMap[m.name]}. Skipping.`);
        continue;
      }
      const result = await conn.execute(
        `INSERT INTO MODULES (MODULE_NAME, DESCRIPTION, SEQUENCE_NO)
         VALUES (:m_name, :m_desc, :m_seq)
         RETURNING ID INTO :returned_id`,
        {
          m_name:      m.name,
          m_desc:      m.desc,
          m_seq:       m.seq,
          returned_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        }
      );
      moduleMap[m.name] = result.outBinds.returned_id[0];
      console.log(`  ✓ Module '${m.name}' → ID ${moduleMap[m.name]}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PERMISSIONS (55)
    // ─────────────────────────────────────────────────────────────────────────
    const permissionsData = [

      // ── 1. Dashboard (3) ──────────────────────────────────────────────────
      {
        mName: "Dashboard", code: "DASH_VIEW_ADMIN", name: "Admin Dashboard View",
        desc: "Access the admin-level dashboard showing system-wide KPIs, headcount, pending approvals, and HR analytics."
      },
      {
        mName: "Dashboard", code: "DASH_VIEW_TEAM", name: "Manager Dashboard View",
        desc: "Access the manager dashboard showing team attendance summary, pending leave/late approvals, and team schedule."
      },
      {
        mName: "Dashboard", code: "DASH_VIEW_SELF", name: "Employee Dashboard View",
        desc: "Access the personal dashboard showing today's attendance status, leave balances, and notifications."
      },

      // ── 2. Core HR (5) ────────────────────────────────────────────────────
      {
        mName: "Core HR", code: "REQUISITION_MANAGE", name: "Employee Requisition Management",
        desc: "Create and approve employee requisition requests for new hires across departments."
      },
      {
        mName: "Core HR", code: "HR_SETUP", name: "Core HR & Org Setup",
        desc: "Configure grades, positions, departments, sections, and assign organizational structure to employees."
      },
      {
        mName: "Core HR", code: "EMP_MANAGE", name: "Employee Management",
        desc: "Create new employee records and update existing employee information including personal and job details."
      },
      {
        mName: "Core HR", code: "EMP_LIFECYCLE", name: "Employee Lifecycle Management",
        desc: "Process employee transfers, increment/promotion, and end employment events such as resignation, termination, and retirement."
      },
      {
        mName: "Core HR", code: "ORG_CHART_VIEW", name: "View Employee & Org Chart",
        desc: "View employee details and organization chart. Supervisors see team members only; Employees see their own profile only."
      },

      // ── 3. Attendance (8) ─────────────────────────────────────────────────
      {
        mName: "Attendance", code: "SHIFT_SETUP", name: "Shift & Rotation Plan Setup",
        desc: "Create shifts, rotation plans, assign employees to rotations, and sync attendance devices. Admin and HR only."
      },
      {
        mName: "Attendance", code: "ATT_SCHEDULE_MANAGE", name: "Manage Work Schedules",
        desc: "Create, approve, and modify weekly/monthly work schedules for teams. Available to Admin, HR, and Supervisor."
      },
      {
        mName: "Attendance", code: "ATT_REALTIME_AI", name: "AI Face Detection Attendance",
        desc: "Take real-time AI-based face detection attendance for the team from the workplace or factory. Supervisor only."
      },
      {
        mName: "Attendance", code: "ATT_CORRECTION_APPROVE", name: "Approve Attendance Corrections",
        desc: "Manually edit or approve attendance correction requests. Restricted to Admin and HR only."
      },
      {
        mName: "Attendance", code: "ATT_VIEW_TEAM", name: "View Team Attendance",
        desc: "View daily and monthly attendance records for all team members."
      },
      {
        mName: "Attendance", code: "ATT_REPORT_ALL", name: "Attendance Report (All)",
        desc: "Generate and view attendance reports including daily, monthly, late, absent, and exception reports."
      },
      {
        mName: "Attendance", code: "ATT_LEAVE_APPLY", name: "Apply for Leave",
        desc: "Submit leave or late arrival requests for self. Available to all roles."
      },
      {
        mName: "Attendance", code: "ATT_LEAVE_APPROVE", name: "Approve Team Leave & Late",
        desc: "Review and approve or reject leave and late arrival requests submitted by team members."
      },

      // ── 4. Payroll (7) ────────────────────────────────────────────────────
      {
        mName: "Payroll", code: "PAY_CONFIG", name: "Configure Pay & Deduction Elements",
        desc: "Define pay elements, deduction elements, and their formulas. Admin only — core payroll configuration."
      },
      {
        mName: "Payroll", code: "PAY_TAX_SLABS", name: "Setup Income Tax Slabs",
        desc: "Configure employee income tax slabs and rules used during payroll calculation. Admin only."
      },
      {
        mName: "Payroll", code: "PAY_PROCESS", name: "Run & Approve Monthly Payroll",
        desc: "Execute monthly payroll run including attendance validation, leave encashment, auto salary calculation, and payroll sheet approval."
      },
      {
        mName: "Payroll", code: "PAY_BONUS_MANAGE", name: "Manage Bonus & Allowances",
        desc: "Process festival bonus, performance bonus, TA/DA, maternity benefits, and other allowances."
      },
      {
        mName: "Payroll", code: "PAY_ADVICE_GEN", name: "Generate Payslip & Bank Advice",
        desc: "Generate employee payslips, bank transfer files, and journal entry files for salary disbursement."
      },
      {
        mName: "Payroll", code: "PAY_VIEW_ALL", name: "View All Salary Sheets",
        desc: "View salary sheets and payroll summaries for all employees. Admin and HR only."
      },
      {
        mName: "Payroll", code: "PAY_PAYSLIP_SELF", name: "View Own Payslip",
        desc: "View personal monthly salary slip including allowances, deductions, and net pay. Available to all roles."
      },

      // ── 5. Performance (3) ────────────────────────────────────────────────
      {
        mName: "Performance", code: "PERF_KPI_SETUP", name: "Setup Appraisal Templates & Cycles",
        desc: "Configure appraisal templates, define KPIs, and start appraisal cycles. Admin and HR only."
      },
      {
        mName: "Performance", code: "PERF_REVIEW_SUBMIT", name: "Submit Performance Reviews",
        desc: "Complete employee self-appraisal form. Supervisors can evaluate team members and recommend increment or promotion."
      },
      {
        mName: "Performance", code: "PERF_VIEW_REPORT", name: "View Performance Reports",
        desc: "View appraisal results and performance analytics. Supervisors see team results; Employees see their own result only."
      },

      // ── 6. Self-Service (8) ───────────────────────────────────────────────
      {
        mName: "Self-Service", code: "ESS_PROFILE_UPDATE", name: "Update Personal Information (Self)",
        desc: "Update personal details such as present address, contact number, and education level. Self only."
      },
      {
        mName: "Self-Service", code: "ESS_LEAVE_APPLY", name: "Apply for Leave (Self)",
        desc: "Submit leave requests and track approval status through the self-service portal. Available to all roles."
      },
      {
        mName: "Self-Service", code: "ESS_LATE_APPLY", name: "Late Entry Request (Self)",
        desc: "Submit late arrival requests with reason and track approval status. Available to all roles."
      },
      {
        mName: "Self-Service", code: "ESS_ATT_CORRECT", name: "Attendance Correction Request (Self)",
        desc: "Submit attendance correction or misreporting requests for HR or Admin review. Available to all roles."
      },
      {
        mName: "Self-Service", code: "ESS_LOAN_APPLY", name: "Apply for Loan / Advance (Self)",
        desc: "Submit loan or salary advance requests through the self-service portal. Available to all roles."
      },
      {
        mName: "Self-Service", code: "ESS_ATT_VIEW", name: "View Own Attendance (Self)",
        desc: "View personal attendance status, leave status, and monthly attendance summary. Available to all roles."
      },
      {
        mName: "Self-Service", code: "MSS_APPROVE_TEAM", name: "Approve Team Requests",
        desc: "Review and approve or reject leave, late, attendance correction, and loan requests from team members."
      },
      {
        mName: "Self-Service", code: "MSS_TEAM_VIEW", name: "View Team Profile & Attendance",
        desc: "View team members' profiles, attendance status, leave balances, and work schedules."
      },

      // ── 7. PF Management (4) ──────────────────────────────────────────────
      {
        mName: "PF Management", code: "PF_RULES_CONFIG", name: "Configure PF Rules",
        desc: "Set up PF contribution rules including employee and employer contribution percentages and eligibility. Admin only."
      },
      {
        mName: "PF Management", code: "PF_CONTRIB_PROCESS", name: "Process PF Contribution",
        desc: "Run monthly PF contribution processing for all eligible employees and generate PF statements."
      },
      {
        mName: "PF Management", code: "PF_LOAN_APPROVE", name: "PF Loan Approval",
        desc: "Review and approve PF loan or withdrawal requests submitted by employees."
      },
      {
        mName: "PF Management", code: "PF_STATEMENT_VIEW", name: "View PF Statement",
        desc: "View PF contribution statements. Supervisors see team statements; Employees view their own statement only."
      },

      // ── 8. Gratuity (4) ───────────────────────────────────────────────────
      {
        mName: "Gratuity", code: "GRAT_FORMULA_CONFIG", name: "Configure Gratuity Formula",
        desc: "Define gratuity calculation formula and eligibility rules based on company policy. Admin only."
      },
      {
        mName: "Gratuity", code: "GRAT_PROVISION", name: "Gratuity Provisioning",
        desc: "Run monthly gratuity provisioning to accrue liability for all eligible employees."
      },
      {
        mName: "Gratuity", code: "GRAT_SETTLE", name: "Final Gratuity Settlement",
        desc: "Process final gratuity settlement payment upon end of employment."
      },
      {
        mName: "Gratuity", code: "GRAT_STATEMENT_VIEW", name: "View Gratuity Statement",
        desc: "View gratuity ledger and statement. Supervisor does NOT have this access per policy. Employee views own only."
      },

      // ── 9. Loan & Advance (3) ─────────────────────────────────────────────
      {
        mName: "Loan & Advance", code: "LOAN_CAT_CREATE", name: "Create Loan Category",
        desc: "Define loan categories, types, and EMI rules for the organization. Admin only."
      },
      {
        mName: "Loan & Advance", code: "LOAN_APPROVE", name: "Approve Loan Request",
        desc: "Review and approve or reject loan and salary advance requests. Supervisors can approve for their team only."
      },
      {
        mName: "Loan & Advance", code: "LOAN_LEDGER_VIEW", name: "View Loan Ledger",
        desc: "View loan ledger, outstanding balances, and repayment schedules. Employees view their own ledger only."
      },

      // ── 10. Document Management (4) ───────────────────────────────────────
      {
        mName: "Document Management", code: "DOC_ORG_UPLOAD", name: "Upload Organization Documents",
        desc: "Upload and manage organization-level documents such as policies, circulars, and HR notices."
      },
      {
        mName: "Document Management", code: "DOC_EMP_UPLOAD", name: "Upload Employee Documents",
        desc: "Upload and manage employee documents such as contracts, certificates, and ID proofs."
      },
      {
        mName: "Document Management", code: "DOC_TEAM_VIEW", name: "View Team Documents",
        desc: "View digitized documents for team members. Admin and HR see all; Supervisors see their team only."
      },
      {
        mName: "Document Management", code: "DOC_SELF_VIEW", name: "View My Documents",
        desc: "View own digitized documents and personal document archive. Available to all roles."
      },

      // ── 11. Communication (3) ─────────────────────────────────────────────
      {
        mName: "Communication", code: "COMM_ANNOUNCE", name: "Create Global Announcements",
        desc: "Send system-wide announcements via mobile notification and email to all employees. Admin and HR only."
      },
      {
        mName: "Communication", code: "COMM_TEAM_MSG", name: "Send Team Messages",
        desc: "Send messages and notifications to team members. Available to Admin, HR, and Supervisor."
      },
      {
        mName: "Communication", code: "COMM_RECEIVE", name: "Receive Notifications",
        desc: "Receive system notifications including work schedule, leave approval status, and announcements. All roles."
      },

      // ── 12. Reports (3) ───────────────────────────────────────────────────
      {
        mName: "Reports", code: "REP_ANALYTICS", name: "Access Full Analytics Dashboard",
        desc: "Access HR analytics dashboard including attrition, headcount, leave analytics, overtime, and performance insights. Admin and HR only."
      },
      {
        mName: "Reports", code: "REP_GENERATE", name: "Generate Standard Reports",
        desc: "Generate standard reports: Attendance (team for Supervisor), Appraisal (team for Supervisor), and Employee List (self for Employee)."
      },
      {
        mName: "Reports", code: "REP_PAYROLL", name: "Payroll Reports",
        desc: "Generate payroll reports including salary summary, deduction summary, bonus, and tax reports. Admin and HR only."
      },



    ];

    console.log("\n🔑 Inserting Permissions...");
    for (const p of permissionsData) {
      const modId = moduleMap[p.mName];
      if (!modId) {
        console.warn(`  ⚠ Module '${p.mName}' not found for '${p.code}'. Skipping.`);
        continue;
      }

      // Check if permission already exists
      const existing = await conn.execute(
        `SELECT ID FROM PERMISSIONS WHERE PERMISSION_CODE = :1`, [p.code]
      );
      if (existing.rows.length > 0) {
        console.log(`  - Permission '${p.code}' already exists. Skipping.`);
        continue;
      }

      await conn.execute(
        `INSERT INTO PERMISSIONS (MODULE_ID, PERMISSION_CODE, PERMISSION_NAME, DESCRIPTION)
         VALUES (:mod_id, :p_code, :p_name, :p_desc)`,
        {
          mod_id: modId,
          p_code: p.code,
          p_name: p.name,
          p_desc: p.desc,
        }
      );
      console.log(`  ✓ [${p.mName}] ${p.code}`);
    }

    await conn.commit();
    console.log(`\n✅ RBAC Seed Complete: ${modulesData.length} Modules, ${permissionsData.length} Permissions.`);
    console.log("\n  Dashboard:3 | Core HR:5 | Attendance:8 | Payroll:7 | Performance:3");
    console.log("  Self-Service:8 | PF:4 | Gratuity:4 | Loan:3 | Documents:4 | Comm:3 | Reports:3");
    console.log("  ─────────────────────────────────────────────────────────────────────");

    
    console.log("  Total: 55 ✓");

  } catch (err) {
    if (conn) await conn.rollback();
    console.error("❌ Critical Seed Failure:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};

const run = async () => {
  try {
    console.log("🚀 Initializing Oracle Connection Pool...");
    await connectDB();
    await seedRbacData();
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  }
};

run();