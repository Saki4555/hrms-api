import express from "express";
import {
  create,
  getAll,
  getSingle,
  update
} from "../controllers/region.controller.js";

const router = express.Router();

router.post("/", create);
router.get("/", getAll);
router.get("/:id", getSingle);
router.put("/:id", update);

export default router;