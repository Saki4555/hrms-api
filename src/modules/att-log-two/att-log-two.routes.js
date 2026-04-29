// src\routes\att-log.routes.js
import express from "express";
import * as controller from "./att-log-two-controller.js";

const router = express.Router();

router.post("/attlogtwo", controller.create);
router.get("/attlogtwo", controller.getAll);
router.get("/attlogtwo/:empno", controller.getSingle); // single
router.put("/attlogtwo/:empno", controller.update);
router.delete("/attlogtwo/:empno", controller.remove);

export default router;