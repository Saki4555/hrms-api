// src/modules/payroll/payroll.controller.js
import * as payrollService from "./payroll.service.js";

export const createRun = async (req, res) => {
  try {
    const { run_month, remarks } = req.body;
    if (!run_month) return res.status(400).json({ error: "run_month is required (format: YYYY-MM)" });

    // Basic format check
    if (!/^\d{4}-\d{2}$/.test(run_month)) {
      return res.status(400).json({ error: "run_month must be in YYYY-MM format" });
    }

    const run_by = req.user?.username ?? "SYSTEM"; // assumes auth middleware sets req.user
    const result = await payrollService.createPayrollRun({ run_month, remarks, run_by });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const processRun = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await payrollService.processPayrollRun(id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const approveRun = async (req, res) => {
  try {
    const { id }   = req.params;
    const approvedBy = req.user?.username ?? "SYSTEM";
    const result   = await payrollService.approvePayrollRun(id, approvedBy);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getRuns = async (req, res) => {
  try {
    const result = await payrollService.getPayrollRuns();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPayslips = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await payrollService.getPayslipsByRun(id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getEmployeePayslip = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month }      = req.query;
    if (!month) return res.status(400).json({ error: "month query param is required (format: YYYY-MM)" });

    const result = await payrollService.getPayslipByEmployee(employeeId, month);
    if (!result) return res.status(404).json({ error: "Payslip not found." });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};