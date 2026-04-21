// src/modules/hr-supervisor-lite/routes.js
import express from "express";
import { getSupervisorsLite } from "./supervioser-lite.controller.js";

const router = express.Router();

// GET /api/hr-supervisor-lite?q=john
router.get("/", getSupervisorsLite);

export default router;