import express from "express";
import * as contractController from "../controllers/hr-contract-controller.js";

const router = express.Router();

router.post("/", contractController.createContract);
router.get("/", contractController.getAllContracts);
router.get("/:id", contractController.getContractById);
router.put("/:id", contractController.updateContract);
router.delete("/:id", contractController.deleteContract);

export default router;