// src/modules/payroll/payroll.routes.js
import express from "express";
import * as payrollController from "./payroll.controller.js";

const router = express.Router();

// Payroll run management
router.get("/run",                    payrollController.getRuns);          // list all runs
router.post("/run",                   payrollController.createRun);        // create new run
router.post("/run/:id/process",       payrollController.processRun);       // calculate salaries
router.post("/run/:id/approve",       payrollController.approveRun);       // lock & approve

// Salary sheet for a run
router.get("/run/:id/payslips",       payrollController.getPayslips);      // all payslips in a run

// Employee self-service: GET /api/payroll/payslip/42?month=2025-11
router.get("/payslip/:employeeId",    payrollController.getEmployeePayslip);

export default router;