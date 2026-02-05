import express from "express";
import * as controller from "../controllers/hrOrg.controller.js";

const router = express.Router();

router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);
router.get("/", controller.list);

export default router;
