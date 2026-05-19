// src/modules/attendance-correction/attendance-correction.routes.js
import express from "express";
import {
  getAllCorrectionsController,
  getCorrectionsByEmployeeController,
  getCorrectionsByTeamController,
  createCorrectionRequestController,
  approveCorrectionController,
  rejectCorrectionController,
  deleteCorrectionRequestController,
} from "./attendance-correction.controller.js";
import { protectRouteV2 } from "../auth-v2/auth-v2.middleware.js";

const router = express.Router();

router.get("/",                       getAllCorrectionsController);
router.get("/employee/:personId",       getCorrectionsByEmployeeController);
router.get("/team/:supervisorId",       getCorrectionsByTeamController);
router.post("/",                        createCorrectionRequestController);
router.post("/:id/approve",            approveCorrectionController);
router.post("/:id/reject",             rejectCorrectionController);
router.delete("/:id",                  deleteCorrectionRequestController);

export default router;

// ── Register in app.js ────────────────────────────────────────────────────────
// import attendanceCorrectionRoutes from "./modules/attendance-correction/attendance-correction.routes.js";
// app.use("/api/attendance-correction", attendanceCorrectionRoutes);