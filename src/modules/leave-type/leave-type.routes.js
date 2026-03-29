import express from "express";
import * as leaveTypeController from "./leave-type.controller.js";

const router = express.Router();

router.post("/",    leaveTypeController.create);
router.get("/",     leaveTypeController.getAll);
router.get("/:id",  leaveTypeController.getOne);
router.put("/:id",  leaveTypeController.update);
router.delete("/:id", leaveTypeController.remove);

export default router;