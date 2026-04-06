import express from "express";
import {
  createLeave,
  getAllLeaves,
  getLeaveById,
  updateLeave,
  deleteLeave,
} from "../controllers/hr-leave-request.controller.js";
import { authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authorizeRoles(""), createLeave);
router.get("/", getAllLeaves);
router.get("/:id", getLeaveById);
router.put("/:id", updateLeave);
router.delete("/:id", deleteLeave);

export default router;