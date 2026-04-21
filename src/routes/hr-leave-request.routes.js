import express from "express";
import {
  createLeave,
  getAllLeaves,
  getLeavesByEmployee,
  getLeavesByTeamController,
  getLeaveById,
  updateLeave,
  deleteLeave,
} from "../controllers/hr-leave-request.controller.js";

const router = express.Router();

// ── Specific routes MUST come before /:id ──────────────────────────────────
router.get("/employee/:employeeId", getLeavesByEmployee);   // ESS: own leaves
router.get("/team/:supervisorId",   getLeavesByTeamController); // MSS: team leaves

// ── General CRUD ───────────────────────────────────────────────────────────
router.post("/",    createLeave);
router.get("/",     getAllLeaves);  // Admin/HR — paginated + filtered
router.get("/:id",  getLeaveById);
router.put("/:id",  updateLeave);
router.delete("/:id", deleteLeave);

export default router;