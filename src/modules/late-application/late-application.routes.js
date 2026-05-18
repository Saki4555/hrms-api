// src/modules/late-application/late-application.routes.js
import express from "express";
import {
  getAllLateApplicationsController,
  getLateApplicationsByEmployeeController,
  getLateApplicationsByTeamController,
  createLateApplicationController,
  approveLateApplicationController,
  rejectLateApplicationController,
  deleteLateApplicationController,
} from "./late-application.controller.js";

const router = express.Router();

router.get("/",                          getAllLateApplicationsController);
router.get("/employee/:personId",        getLateApplicationsByEmployeeController);
router.get("/team/:supervisorId",        getLateApplicationsByTeamController);
router.post("/",                         createLateApplicationController);
router.post("/:id/approve",             approveLateApplicationController);
router.post("/:id/reject",              rejectLateApplicationController);
router.delete("/:id",                   deleteLateApplicationController);

export default router;

// ── Register in app.js ────────────────────────────────────────────────────────
// import lateApplicationRoutes from "./modules/late-application/late-application.routes.js";
// app.use("/api/late-application", lateApplicationRoutes);