// seedRbac.js — Modules + Permissions
// Based on HRMS_Features.pdf Role–Permission Matrix (pages 10–15)
// Total: 12 Modules, 55 Permissions
//
// Removed vs previous version (60 → 55):
//   ✗ HR_POLICY_MANAGE   — not in matrix
//   ✗ EMP_DOC_UPLOAD     — duplicate of DOC_EMP_UPLOAD (Document Management)
//   ✗ COMM_NOTIFY        — not in matrix (Communication has exactly 3 rows)
//   ✗ PERF_HR_REVIEW     — not a separate matrix row
//   ✗ REP_EXPORT         — not in matrix (Reports has exactly 5 rows)

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
      const result = await conn.execute(
        `INSERT INTO HCM.MODULES (MODULE_NAME, DESCRIPTION, SEQUENCE_NO)
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
    // Each permission maps to one or more rows in the matrix (PDF pages 10–15)
    // ─────────────────────────────────────────────────────────────────────────
    const permissionsData = [

      // ── 1. Dashboard (3) ──────────────────────────────────────────────────
      { mName: "Dashboard", code: "DASH_VIEW_ADMIN", name: "Admin Dashboard View"    },
      { mName: "Dashboard", code: "DASH_VIEW_TEAM",  name: "Manager Dashboard View"  },
      { mName: "Dashboard", code: "DASH_VIEW_SELF",  name: "Employee Dashboard View" },

      // ── 2. Core HR (5) ────────────────────────────────────────────────────
      // → Create Employee Requisition, Approve Employee Requisition
      { mName: "Core HR", code: "REQUISITION_MANAGE", name: "Employee Requisition Management" },
      // → Manage Grades/Positions, Assign Org Structure
      { mName: "Core HR", code: "HR_SETUP",           name: "Core HR & Org Setup"            },
      // → Create New Employee, Edit Employee Information
      { mName: "Core HR", code: "EMP_MANAGE",         name: "Employee Management"             },
      // → Employee Transfer, Increment/Promotion Processing, End Employment Process
      { mName: "Core HR", code: "EMP_LIFECYCLE",      name: "Employee Lifecycle Management"   },
      // → View Employee Details (Supervisor=team only, Employee=self only)
      { mName: "Core HR", code: "ORG_CHART_VIEW",     name: "View Employee & Org Chart"      },

      // ── 3. Attendance (8) ─────────────────────────────────────────────────
      // → Create Shift, Create Rotation Plan, Assign Employee to Rotation,
      //   Sync Attendance Devices
      { mName: "Attendance", code: "SHIFT_SETUP",            name: "Shift & Rotation Plan Setup"    },
      // → Create Work Schedule (Team), Approve Work Schedule, Modify Work Schedule
      { mName: "Attendance", code: "ATT_SCHEDULE_MANAGE",    name: "Manage Work Schedules"          },
      // → Take AI-based Team Attendance (Supervisor ONLY per matrix)
      { mName: "Attendance", code: "ATT_REALTIME_AI",        name: "AI Face Detection Attendance"   },
      // → Manual Attendance Edit (Admin+HR restricted)
      { mName: "Attendance", code: "ATT_CORRECTION_APPROVE", name: "Approve Attendance Corrections" },
      // → View Attendance (Team)
      { mName: "Attendance", code: "ATT_VIEW_TEAM",          name: "View Team Attendance"           },
      // → Attendance Reports (Admin, HR, Supervisor team)
      { mName: "Attendance", code: "ATT_REPORT_ALL",         name: "Attendance Report (All)"        },
      // → Apply for Leave / Late (all 4 roles, self)
      { mName: "Attendance", code: "ATT_LEAVE_APPLY",        name: "Apply for Leave"                },
      // → Approve Leave / Late (Admin, HR, Supervisor team)
      { mName: "Attendance", code: "ATT_LEAVE_APPROVE",      name: "Approve Team Leave & Late"      },

      // ── 4. Payroll (7) ────────────────────────────────────────────────────
      // → Configure Pay Elements, Configure Deduction Elements (Admin ONLY)
      { mName: "Payroll", code: "PAY_CONFIG",       name: "Configure Pay & Deduction Elements" },
      // → Configure Tax Slabs (Admin ONLY)
      { mName: "Payroll", code: "PAY_TAX_SLABS",   name: "Setup Income Tax Slabs"             },
      // → Run Monthly Payroll, Leave Encashment Processing,
      //   Attendance Validation for Payroll, Approve Payroll Sheet
      { mName: "Payroll", code: "PAY_PROCESS",      name: "Run & Approve Monthly Payroll"      },
      // → Bonus Processing
      { mName: "Payroll", code: "PAY_BONUS_MANAGE", name: "Manage Bonus & Allowances"          },
      // → Generate Payslip, Generate Bank Advice (Bank Transfer File)
      { mName: "Payroll", code: "PAY_ADVICE_GEN",   name: "Generate Payslip & Bank Advice"     },
      // → View Salary Sheet (Admin, HR)
      { mName: "Payroll", code: "PAY_VIEW_ALL",     name: "View All Salary Sheets"             },
      // → View Payslip (all 4 roles, self)
      { mName: "Payroll", code: "PAY_PAYSLIP_SELF", name: "View Own Payslip"                   },

      // ── 5. Performance (3) ────────────────────────────────────────────────
      // → Configure Appraisal Templates, Start Appraisal Cycle
      { mName: "Performance", code: "PERF_KPI_SETUP",     name: "Setup Appraisal Templates & Cycles" },
      // → Employee Self-Appraisal, Supervisor Evaluation,
      //   Recommend Increment/Promotion (scoped by role in app logic)
      { mName: "Performance", code: "PERF_REVIEW_SUBMIT", name: "Submit Performance Reviews"         },
      // → View Appraisal Result (all 4, Supervisor=team, Employee=self)
      { mName: "Performance", code: "PERF_VIEW_REPORT",   name: "View Performance Reports"           },

      // ── 6. Self-Service (8) ───────────────────────────────────────────────
      // → Update Personal Information (all 4, self)
      { mName: "Self-Service", code: "ESS_PROFILE_UPDATE", name: "Update Personal Information (Self)"  },
      // → Apply for Leave (all 4, self)
      { mName: "Self-Service", code: "ESS_LEAVE_APPLY",    name: "Apply for Leave (Self)"             },
      // → Apply for Late (all 4, self)
      { mName: "Self-Service", code: "ESS_LATE_APPLY",     name: "Late Entry Request (Self)"          },
      // → Attendance Correction Request (all 4, self)
      { mName: "Self-Service", code: "ESS_ATT_CORRECT",    name: "Attendance Correction Request (Self)"},
      // → Apply for Loan / Advance (all 4, self)
      { mName: "Self-Service", code: "ESS_LOAN_APPLY",     name: "Apply for Loan / Advance (Self)"    },
      // → View Own Attendance (all 4, self)
      { mName: "Self-Service", code: "ESS_ATT_VIEW",       name: "View Own Attendance (Self)"         },
      // → Approve Team Requests — Leave, Late, Loan (Admin, HR, Supervisor)
      { mName: "Self-Service", code: "MSS_APPROVE_TEAM",   name: "Approve Team Requests"              },
      // → View Team Attendance / View Team Profile (Admin, HR, Supervisor)
      { mName: "Self-Service", code: "MSS_TEAM_VIEW",      name: "View Team Profile & Attendance"     },

      // ── 7. PF Management (4) ──────────────────────────────────────────────
      // → Configure PF Rules (Admin ONLY)
      { mName: "PF Management", code: "PF_RULES_CONFIG",    name: "Configure PF Rules"      },
      // → Process PF Contribution (Admin, HR)
      { mName: "PF Management", code: "PF_CONTRIB_PROCESS", name: "Process PF Contribution" },
      // → PF Loan Approval (Admin, HR)
      { mName: "PF Management", code: "PF_LOAN_APPROVE",    name: "PF Loan Approval"        },
      // → View PF Statement (all 4 — Supervisor=team, Employee=self)
      { mName: "PF Management", code: "PF_STATEMENT_VIEW",  name: "View PF Statement"       },

      // ── 8. Gratuity (4) ───────────────────────────────────────────────────
      // → Configure Gratuity Formula (Admin ONLY)
      { mName: "Gratuity", code: "GRAT_FORMULA_CONFIG", name: "Configure Gratuity Formula" },
      // → Gratuity Provisioning (Admin, HR)
      { mName: "Gratuity", code: "GRAT_PROVISION",      name: "Gratuity Provisioning"      },
      // → Final Gratuity Settlement (Admin, HR)
      { mName: "Gratuity", code: "GRAT_SETTLE",         name: "Final Gratuity Settlement"  },
      // → View Gratuity Statement (Admin, HR, Employee self)
      //   ⚠ Supervisor ✗ explicitly per matrix page 13
      { mName: "Gratuity", code: "GRAT_STATEMENT_VIEW", name: "View Gratuity Statement"    },

      // ── 9. Loan & Advance (3) ─────────────────────────────────────────────
      // → Create Loan Category (Admin ONLY)
      { mName: "Loan & Advance", code: "LOAN_CAT_CREATE",  name: "Create Loan Category" },
      // → Approve Loan Request (Admin, HR, Supervisor team)
      { mName: "Loan & Advance", code: "LOAN_APPROVE",     name: "Approve Loan Request" },
      // → View Loan Ledger (all 4 — Supervisor=team, Employee=self)
      { mName: "Loan & Advance", code: "LOAN_LEDGER_VIEW", name: "View Loan Ledger"     },

      // ── 10. Document Management (4) ───────────────────────────────────────
      // → Upload Organization Docs (Admin, HR)
      { mName: "Document Management", code: "DOC_ORG_UPLOAD", name: "Upload Organization Documents" },
      // → Upload Employee Docs / Upload Documents from Core HR (Admin, HR)
      { mName: "Document Management", code: "DOC_EMP_UPLOAD", name: "Upload Employee Documents"     },
      // → View Digitized Documents team / View Team Documents (Admin, HR, Supervisor)
      { mName: "Document Management", code: "DOC_TEAM_VIEW",  name: "View Team Documents"           },
      // → View Digitized Documents self / View Own Documents (all 4)
      { mName: "Document Management", code: "DOC_SELF_VIEW",  name: "View My Documents"             },

      // ── 11. Communication (3) ─────────────────────────────────────────────
      // → Send Announcement (Admin, HR)
      { mName: "Communication", code: "COMM_ANNOUNCE", name: "Create Global Announcements" },
      // → Send Team Messages (Admin, HR, Supervisor)
      { mName: "Communication", code: "COMM_TEAM_MSG", name: "Send Team Messages"          },
      // → Receive Notifications (all 4)
      { mName: "Communication", code: "COMM_RECEIVE",  name: "Receive Notifications"       },

      // ── 12. Reports (3) ───────────────────────────────────────────────────
      // → Full Analytics Dashboard (Admin, HR)
      { mName: "Reports", code: "REP_ANALYTICS", name: "Access Full Analytics Dashboard"              },
      // → Attendance Reports (Supervisor team), Appraisal Reports (Supervisor team),
      //   Employee List (all 4)
      { mName: "Reports", code: "REP_GENERATE",  name: "Generate Standard Reports"                   },
      // → Payroll Reports (Admin, HR ONLY)
      { mName: "Reports", code: "REP_PAYROLL",   name: "Payroll Reports"                             },
    ];

    console.log("\n🔑 Inserting Permissions...");
    for (const p of permissionsData) {
      const modId = moduleMap[p.mName];
      if (!modId) {
        console.warn(`  ⚠ Module '${p.mName}' not found for '${p.code}'. Skipping.`);
        continue;
      }
      await conn.execute(
        `INSERT INTO HCM.PERMISSIONS (MODULE_ID, PERMISSION_CODE, PERMISSION_NAME)
         VALUES (:mod_id, :p_code, :p_name)`,
        { mod_id: modId, p_code: p.code, p_name: p.name }
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