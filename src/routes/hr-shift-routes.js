import express from "express";
import * as shiftController from "../controllers/hr-shift.controller.js";

const router = express.Router();

router.post("/", shiftController.createShift);
router.get("/", shiftController.getAllShift);
router.get("/:id", shiftController.getShiftById);
router.put("/:id", shiftController.updateShift);
router.delete("/:id", shiftController.deleteShift);

export default router;