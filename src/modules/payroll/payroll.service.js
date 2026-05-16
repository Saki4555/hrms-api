// src/modules/payroll/payroll.service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const calculateComponent = (formula, defaultValue, basicAmount, presentDays, workingDays) => {
  if (!formula || formula.trim().toUpperCase() === "FIXED") {
    return defaultValue ?? 0;
  }
  const upper = formula.trim().toUpperCase();
  if (upper.startsWith("PCT_OF_BASIC:")) {
    const pct = parseFloat(upper.split(":")[1]) || 0;
    return (basicAmount * pct) / 100;
  }
  if (upper === "ATTENDANCE_BASED") {
    if (!workingDays || workingDays === 0) return 0;
    return ((defaultValue ?? 0) / workingDays) * presentDays;
  }
  return defaultValue ?? 0;
};

const getWorkingDaysInMonth = (yearMonth) => {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE PAYROLL RUN
// ─────────────────────────────────────────────────────────────────────────────
export const createPayrollRun = async ({ run_month, remarks, run_by }) => {
  const conn = await getConnection();
  try {
    const existing = await conn.execute(
      `SELECT PAYROLL_ID FROM HR_PAYROLL_RUN
        WHERE RUN_MONTH = :RUN_MONTH AND STATUS != 'CANCELLED'`,
      { RUN_MONTH: run_month },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length > 0) {
      throw new Error(`Payroll run for ${run_month} already exists.`);
    }

    const result = await conn.execute(
      `INSERT INTO HR_PAYROLL_RUN (RUN_MONTH, RUN_BY, STATUS, REMARKS)
       VALUES (:RUN_MONTH, :RUN_BY, 'DRAFT', :REMARKS)
       RETURNING PAYROLL_ID INTO :PAYROLL_ID`,
      {
        RUN_MONTH:  run_month,
        RUN_BY:     run_by ?? "SYSTEM",
        REMARKS:    remarks ?? null,
        PAYROLL_ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );

    return { payroll_id: result.outBinds.PAYROLL_ID[0], run_month, status: "DRAFT" };
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. PROCESS PAYROLL RUN
// ─────────────────────────────────────────────────────────────────────────────
export const processPayrollRun = async (payrollId) => {
  const conn = await getConnection();
  try {
    // ── Fetch the run ────────────────────────────────────────────────────────
    const runResult = await conn.execute(
      `SELECT PAYROLL_ID, RUN_MONTH, STATUS
         FROM HR_PAYROLL_RUN
        WHERE PAYROLL_ID = :PAYROLL_ID`,
      { PAYROLL_ID: parseInt(payrollId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (runResult.rows.length === 0) throw new Error("Payroll run not found.");
    const run = runResult.rows[0];
    if (run.STATUS === "APPROVED") throw new Error("Payroll run is already approved.");

    const runMonth      = run.RUN_MONTH;
    const [year, month] = runMonth.split("-").map(Number);
    const workingDays   = getWorkingDaysInMonth(runMonth);
    const firstDay      = new Date(year, month - 1, 1);
    const lastDay       = new Date(year, month, 0);

    // ── ✅ CHANGED: HR_EMPLOYEE + HR_EMP_ASSIGNMENT ──────────────────────────
    const empResult = await conn.execute(
      `SELECT
          E.PERSON_ID                                    AS EMPLOYEE_ID,
          E.EMP_NO                                       AS EMPLOYEE_NUMBER,
          E.FIRST_NAME || ' ' || NVL(E.LAST_NAME, '')   AS FULL_NAME,
          A.PAY_STRUCTURE_ID AS SALARY_STRUCTURE_ID
         FROM HR_EMPLOYEE E
         JOIN HR_EMP_ASSIGNMENT A
           ON A.PERSON_ID = E.PERSON_ID
          AND A.STATUS    = 1
          AND (A.EFFECTIVE_END_DATE IS NULL OR A.EFFECTIVE_END_DATE >= TRUNC(SYSDATE))
        WHERE E.STATUS     = 1
          AND A.PAY_STRUCTURE_ID IS NOT NULL`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const employees = empResult.rows;
    if (employees.length === 0) {
      throw new Error("No active employees with a payroll assignment found.");
    }

    // ── Delete previously drafted payslips for this run ──────────────────────
    await conn.execute(
      `DELETE FROM HR_PAYSLIP WHERE PAYROLL_ID = :PAYROLL_ID`,
      { PAYROLL_ID: parseInt(payrollId) },
      { autoCommit: false }
    );

    let totalGross = 0;
    let totalNet   = 0;

    for (const emp of employees) {
      // 1. Pay structure components
      const compResult = await conn.execute(
        `SELECT
            PC.COMPONENT_ID,
            PC.CODE,
            PC.NAME,
            PC.TYPE,
            PC.CALCULATION_FORMULA,
            PSC.DEFAULT_VALUE,
            PSC.COMPONENT_ORDER
           FROM HR_PAY_STRUCTURE_COMPONENT PSC
           JOIN HR_PAY_COMPONENT PC ON PC.COMPONENT_ID = PSC.COMPONENT_ID
          WHERE PSC.PAY_STRUCTURE_ID = :PAY_STRUCTURE_ID
          ORDER BY PSC.COMPONENT_ORDER`,
        { PAY_STRUCTURE_ID: emp.SALARY_STRUCTURE_ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const components = compResult.rows;

      // 2. Attendance summary — EMPLOYEE_ID in HR_ATTENDANCE = PERSON_ID
      const attResult = await conn.execute(
        `SELECT
            COUNT(*)                          AS PRESENT_DAYS,
            SUM(NVL(OVERTIME_MINUTES, 0))     AS TOTAL_OT_MINUTES
           FROM HR_ATTENDANCE
          WHERE EMPLOYEE_ID      = :EMPLOYEE_ID
            AND ATTENDANCE_DATE >= :FIRST_DAY
            AND ATTENDANCE_DATE <= :LAST_DAY
            AND STATUS IN ('PRESENT', 'LATE')
            AND PAYROLL_FLAG     = 'Y'`,
        {
          EMPLOYEE_ID: emp.EMPLOYEE_ID,
          FIRST_DAY:   firstDay,
          LAST_DAY:    lastDay,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const presentDays = Number(attResult.rows[0]?.PRESENT_DAYS    ?? 0);
      const totalOTMins = Number(attResult.rows[0]?.TOTAL_OT_MINUTES ?? 0);
      const absentDays  = workingDays - presentDays;

      // 3. Active loan deductions
      const loanResult = await conn.execute(
        `SELECT NVL(SUM(MONTHLY_DEDUCTION), 0) AS LOAN_DEDUCTION
           FROM HR_LOAN
          WHERE EMPLOYEE_ID = :EMPLOYEE_ID
            AND STATUS      = 'ACTIVE'`,
        { EMPLOYEE_ID: emp.EMPLOYEE_ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const loanDeduction = Number(loanResult.rows[0]?.LOAN_DEDUCTION ?? 0);

      // 4. Calculate earnings
      let basicAmount  = 0;
      let grossEarning = 0;
      const breakdown  = { earnings: [], deductions: [] };

      for (const comp of components) {
        if (comp.TYPE === "EARNING") {
          if (comp.CODE.toUpperCase() === "BASIC") {
            basicAmount = comp.DEFAULT_VALUE ?? 0;
          }
          const amount = calculateComponent(
            comp.CALCULATION_FORMULA,
            comp.DEFAULT_VALUE,
            basicAmount,
            presentDays,
            workingDays
          );
          grossEarning += amount;
          breakdown.earnings.push({
            code:   comp.CODE,
            name:   comp.NAME,
            amount: parseFloat(amount.toFixed(2)),
          });
        }
      }

      // 5. Absent deduction
      const absentDeduction = basicAmount > 0 && workingDays > 0
        ? (basicAmount / workingDays) * absentDays
        : 0;
      if (absentDeduction > 0) {
        breakdown.deductions.push({
          code:   "ABSENT",
          name:   "Absent Deduction",
          amount: parseFloat(absentDeduction.toFixed(2)),
        });
      }

      // 6. Loan deduction
      if (loanDeduction > 0) {
        breakdown.deductions.push({
          code:   "LOAN",
          name:   "Loan Deduction",
          amount: parseFloat(loanDeduction.toFixed(2)),
        });
      }

      // 7. Overtime (BD standard: Basic ÷ 208 × OT hours × 2)
      if (totalOTMins > 0 && basicAmount > 0) {
        const otHours  = totalOTMins / 60;
        const otAmount = (basicAmount / 208) * otHours * 2;
        grossEarning  += otAmount;
        breakdown.earnings.push({
          code:   "OT",
          name:   "Overtime",
          amount: parseFloat(otAmount.toFixed(2)),
        });
      }

      const totalDeductions = absentDeduction + loanDeduction;
      const gross = parseFloat(grossEarning.toFixed(2));
      const net   = parseFloat((grossEarning - totalDeductions).toFixed(2));

      breakdown.summary = {
        workingDays,
        presentDays,
        absentDays,
        otMinutes: totalOTMins,
        gross,
        totalDeductions: parseFloat(totalDeductions.toFixed(2)),
        net,
      };

      totalGross += gross;
      totalNet   += net;

      // 8. Insert payslip — EMPLOYEE_ID stores PERSON_ID (FK to HR_EMPLOYEES dropped)
      await conn.execute(
        `INSERT INTO HR_PAYSLIP
               (PAYROLL_ID, EMPLOYEE_ID, GROSS, NET, TAX, DEDUCTIONS, PAYSLIP_PATH)
         VALUES (:PAYROLL_ID, :EMPLOYEE_ID, :GROSS, :NET, 0, :DEDUCTIONS, :PAYSLIP_PATH)`,
        {
          PAYROLL_ID:   parseInt(payrollId),
          EMPLOYEE_ID:  emp.EMPLOYEE_ID,
          GROSS:        gross,
          NET:          net,
          DEDUCTIONS:   parseFloat(totalDeductions.toFixed(2)),
          PAYSLIP_PATH: JSON.stringify(breakdown),
        },
        { autoCommit: false }
      );
    }

    // ── Update run totals ────────────────────────────────────────────────────
    await conn.execute(
      `UPDATE HR_PAYROLL_RUN
          SET STATUS      = 'PROCESSED',
              TOTAL_GROSS = :TOTAL_GROSS,
              TOTAL_NET   = :TOTAL_NET,
              RUN_DATE    = TRUNC(SYSDATE)
        WHERE PAYROLL_ID  = :PAYROLL_ID`,
      {
        TOTAL_GROSS: parseFloat(totalGross.toFixed(2)),
        TOTAL_NET:   parseFloat(totalNet.toFixed(2)),
        PAYROLL_ID:  parseInt(payrollId),
      },
      { autoCommit: false }
    );

    await conn.commit();

    return {
      payroll_id:          parseInt(payrollId),
      run_month:           runMonth,
      status:              "PROCESSED",
      total_gross:         parseFloat(totalGross.toFixed(2)),
      total_net:           parseFloat(totalNet.toFixed(2)),
      employees_processed: employees.length,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. APPROVE PAYROLL RUN
// ─────────────────────────────────────────────────────────────────────────────
export const approvePayrollRun = async (payrollId, approvedBy) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT STATUS FROM HR_PAYROLL_RUN WHERE PAYROLL_ID = :PAYROLL_ID`,
      { PAYROLL_ID: parseInt(payrollId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) throw new Error("Payroll run not found.");

    const status = result.rows[0].STATUS;
    if (status !== "PROCESSED") {
      throw new Error(`Cannot approve a run with status '${status}'. Process it first.`);
    }

    await conn.execute(
      `UPDATE HR_PAYROLL_RUN
          SET STATUS = 'APPROVED',
              RUN_BY = :APPROVED_BY
        WHERE PAYROLL_ID = :PAYROLL_ID`,
      {
        APPROVED_BY: approvedBy ?? "SYSTEM",
        PAYROLL_ID:  parseInt(payrollId),
      },
      { autoCommit: true }
    );

    return { payroll_id: parseInt(payrollId), status: "APPROVED" };
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET ALL PAYROLL RUNS
// ─────────────────────────────────────────────────────────────────────────────
export const getPayrollRuns = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT PAYROLL_ID, RUN_MONTH, RUN_DATE, RUN_BY,
              STATUS, TOTAL_GROSS, TOTAL_NET, REMARKS, CREATED_DATE
         FROM HR_PAYROLL_RUN
        ORDER BY CREATED_DATE DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET PAYSLIPS FOR A RUN  (salary sheet)
// ─────────────────────────────────────────────────────────────────────────────
export const getPayslipsByRun = async (payrollId) => {
  const conn = await getConnection();
  try {
    // ✅ CHANGED: join to HR_EMPLOYEE using PERSON_ID
    const result = await conn.execute(
      `SELECT
          PS.PAYSLIP_ID,
          PS.EMPLOYEE_ID,
          E.EMP_NO                                     AS EMPLOYEE_NUMBER,
          E.FIRST_NAME || ' ' || NVL(E.LAST_NAME, '') AS FULL_NAME,
          PS.GROSS,
          PS.NET,
          PS.TAX,
          PS.DEDUCTIONS,
          PS.PAYSLIP_PATH,
          PS.CREATED_DATE
         FROM HR_PAYSLIP PS
         JOIN HR_EMPLOYEE E ON E.PERSON_ID = PS.EMPLOYEE_ID
        WHERE PS.PAYROLL_ID = :PAYROLL_ID
        ORDER BY E.EMP_NO`,
      { PAYROLL_ID: parseInt(payrollId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows.map((row) => ({
      ...row,
      BREAKDOWN:    row.PAYSLIP_PATH ? JSON.parse(row.PAYSLIP_PATH) : null,
      PAYSLIP_PATH: undefined,
    }));
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET SINGLE PAYSLIP BY EMPLOYEE  (self-service)
// ─────────────────────────────────────────────────────────────────────────────
export const getPayslipByEmployee = async (employeeId, month) => {
  const conn = await getConnection();
  try {
    // ✅ CHANGED: join to HR_EMPLOYEE using PERSON_ID
    const result = await conn.execute(
      `SELECT
          PS.PAYSLIP_ID,
          PS.EMPLOYEE_ID,
          E.EMP_NO                                     AS EMPLOYEE_NUMBER,
          E.FIRST_NAME || ' ' || NVL(E.LAST_NAME, '') AS FULL_NAME,
          PR.RUN_MONTH,
          PS.GROSS,
          PS.NET,
          PS.TAX,
          PS.DEDUCTIONS,
          PS.PAYSLIP_PATH,
          PS.CREATED_DATE
         FROM HR_PAYSLIP PS
         JOIN HR_EMPLOYEE E      ON E.PERSON_ID    = PS.EMPLOYEE_ID
         JOIN HR_PAYROLL_RUN PR  ON PR.PAYROLL_ID  = PS.PAYROLL_ID
        WHERE PS.EMPLOYEE_ID = :EMPLOYEE_ID
          AND PR.RUN_MONTH   = :RUN_MONTH
          AND PR.STATUS      = 'APPROVED'`,
      {
        EMPLOYEE_ID: parseInt(employeeId),
        RUN_MONTH:   month,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      BREAKDOWN:    row.PAYSLIP_PATH ? JSON.parse(row.PAYSLIP_PATH) : null,
      PAYSLIP_PATH: undefined,
    };
  } finally {
    await conn.close();
  }
};