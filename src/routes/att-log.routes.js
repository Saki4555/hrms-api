// src\routes\att-log.routes.js
import express from "express";
import * as controller from "../controllers/att-log.controller.js";

const router = express.Router();

router.post("/attlog", controller.create);
router.get("/attlog", controller.getAll);
router.get("/attlog/:empno", controller.getSingle); // single
router.put("/attlog/:empno", controller.update);
router.delete("/attlog/:empno", controller.remove);

export default router;