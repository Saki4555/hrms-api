import { Router } from "express";
import {
  transferEmployeeController,
  processIncrementController,
  endEmploymentController,
  reinstateEmployeeController,
  getEmployeeAuditHistoryController,
} from "./core-hr.controller.js";

const router = Router();

// POST /api/core-hr/transfer/:personId
router.post("/transfer/:personId",        transferEmployeeController);

// POST /api/core-hr/increment/:personId
router.post("/increment/:personId",       processIncrementController);

// POST /api/core-hr/end-employment/:personId
router.post("/end-employment/:personId",  endEmploymentController);

// POST /api/core-hr/reinstate/:personId
router.post("/reinstate/:personId",       reinstateEmployeeController);

// GET  /api/core-hr/audit-history/:personId?page=1&limit=10
router.get("/audit-history/:personId",    getEmployeeAuditHistoryController);

export default router;