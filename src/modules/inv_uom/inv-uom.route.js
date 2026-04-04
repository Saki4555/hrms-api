import express from "express";
import {
  createUOM,
  getAllUOM,
  getUOMById,
  updateUOM,
  deleteUOM,
} from "../inv_uom/inv-uom-controller.js";

const router = express.Router();

router.post("/", createUOM);
router.get("/", getAllUOM);
router.get("/:id", getUOMById);
router.put("/:id", updateUOM);
router.delete("/:id", deleteUOM);

export default router;
