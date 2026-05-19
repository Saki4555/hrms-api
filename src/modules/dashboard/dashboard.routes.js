// src/modules/dashboard/dashboard.routes.js
// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD ROUTES
//  Single GET /summary endpoint — auth required via protectRouteV2.
//  Registered in server.js under /api/dashboard.
// ─────────────────────────────────────────────────────────────────────────────

import express                  from "express";
import { getDashboardSummary }  from "./dashboard.controller.js";
import { protectRouteV2 }       from "../auth-v2/auth-v2.middleware.js";

const router = express.Router();

// GET /api/dashboard/summary
router.get("/summary", protectRouteV2, getDashboardSummary);

export default router;