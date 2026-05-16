// src/modules/pay-structure/pay-structure.routes.js
import express from "express";
import * as componentCtrl from "./pay-component.controller.js";
import * as structureCtrl from "./pay-structure.controller.js";

const router = express.Router();

// ── Pay Components ────────────────────────────────────────────────────────────
// GET    /api/pay-structure/components          → list all
// GET    /api/pay-structure/components/:id      → get one
// POST   /api/pay-structure/components          → create
// PUT    /api/pay-structure/components/:id      → update
// DELETE /api/pay-structure/components/:id      → delete

router.get("/components",        componentCtrl.getAll);
router.get("/components/:id",    componentCtrl.getOne);
router.post("/components",       componentCtrl.create);
router.put("/components/:id",    componentCtrl.update);
router.delete("/components/:id", componentCtrl.remove);

// ── Pay Structures ────────────────────────────────────────────────────────────
// GET    /api/pay-structure                     → list all (with component count)
// GET    /api/pay-structure/:id                 → get one with its components
// POST   /api/pay-structure                     → create
// PUT    /api/pay-structure/:id                 → update
// DELETE /api/pay-structure/:id                 → delete

router.get("/",        structureCtrl.getAll);
router.get("/:id",     structureCtrl.getOne);
router.post("/",       structureCtrl.create);
router.put("/:id",     structureCtrl.update);
router.delete("/:id",  structureCtrl.remove);

// ── Structure ↔ Component linking ────────────────────────────────────────────
// POST   /api/pay-structure/:id/components                        → add component
// PUT    /api/pay-structure/:id/components/:componentId           → update amount/order
// DELETE /api/pay-structure/:id/components/:componentId           → remove component

router.post("/:id/components",                       structureCtrl.addComponent);
router.put("/:id/components/:componentId",           structureCtrl.updateComponent);
router.delete("/:id/components/:componentId",        structureCtrl.removeComponent);

export default router;