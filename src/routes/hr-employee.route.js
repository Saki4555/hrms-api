import express from "express";
import {
  createEmployeeHandler,
  updateEmployeeHandler,
  deleteEmployeeHandler,
  getEmployeeHandeler,
  getEmployeeByIdController 
} from "../controllers/hr-employee.controller.js";

const router = express.Router();

router.get("/", getEmployeeHandeler);
router.post("/", createEmployeeHandler);
router.get("/:personId", getEmployeeByIdController);
router.put("/:personId", updateEmployeeHandler);
router.delete("/:personId", deleteEmployeeHandler);

export default router;
