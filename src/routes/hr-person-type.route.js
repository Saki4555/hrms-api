import express from "express";
import {
  create,
  getAll,
  getById,
  update,
  remove,
} from "../controllers/hr-person-type.controller.js";

const router = express.Router();

router.post("/", create);
router.get("/", getAll);
router.get("/:id", getById);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
