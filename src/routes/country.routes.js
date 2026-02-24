import express from "express";
import {
  create,
  getAll,
  update
} from "../controllers/country.controller.js";

const router = express.Router();

router.post("/", create);
router.get("/", getAll);
router.put("/:id", update);

export default router;