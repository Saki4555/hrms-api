import express from "express";
import * as companyController from "../controllers/hr-company.controller.js";

const router = express.Router();

router.post("/", companyController.create);
router.put("/:id", companyController.update);
router.delete("/:id", companyController.remove);
router.get("/", companyController.getAll);
router.get("/:id", companyController.getOne);

export default router;