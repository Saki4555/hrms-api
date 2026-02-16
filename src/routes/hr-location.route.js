import express from "express";
import * as controller from "../controllers/hr-location.controller.js";

const router = express.Router();

router.post("/", controller.create);       // Insert
router.put("/:id", controller.update);      // Update
router.delete("/:id", controller.remove);   // Delete
router.get("/:id", controller.getOne);      // Single Get
router.get("/", controller.getAll);         // Get All

export default router;
