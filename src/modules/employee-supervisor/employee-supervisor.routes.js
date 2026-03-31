import express from "express";
import * as ctrl from "./employee-supervisor.controller.js";

const router = express.Router();

router.post("/",                              ctrl.assignSupervisor);
router.get("/",                               ctrl.getAll);
router.get("/supervisor/:supervisorId/team",  ctrl.getBySupervisor);
router.get("/employee/:personId",             ctrl.getByEmployee);
router.put("/:id",                            ctrl.update);
router.delete("/:id",                         ctrl.remove);

export default router;