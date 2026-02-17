import { Router } from "express";
import * as controller from "../controllers/hr-grade.controller.js";

const router = Router();

router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);
router.get("/:id", controller.getOne);
router.get("/", controller.getAll);

export default router;
