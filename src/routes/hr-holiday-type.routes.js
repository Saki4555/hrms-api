import express from "express";
import * as controller from "../controllers/hr-holiday-type.controller.js";

const router = express.Router();

router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);
router.get("/:id", controller.getOne);
router.get("/", controller.getAll);

export default router;