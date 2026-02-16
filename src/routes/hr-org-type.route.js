import express from "express";
import * as controller from "../controllers/hr-org-type.controller.js";

const router = express.Router();

router.get("/", controller.getAll);
router.post("/", controller.create);
router.get("/:id", controller.getOrgTypeById);
router.put("/:id", controller.update);
router.delete("/:id", controller.softDelete);

export default router;