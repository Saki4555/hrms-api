// src\modules\hr-employee-lite\routes.js

import express from "express";
import { getEmployeesLite } from "./controller.js";


const router = express.Router();

// GET /api/hr-employee-lite?q=john
router.get("/", getEmployeesLite);

export default router;