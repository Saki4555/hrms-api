import { Router } from 'express';
import * as inventoryCtrl from './inventory.controller.js';

const router = Router();

// ──────────────────────────────────────────────────────────────────────────────
// INVENTORIES   (PK: TID)
// ──────────────────────────────────────────────────────────────────────────────
router.post  ('/',         inventoryCtrl.create);
router.get   ('/',         inventoryCtrl.getAll);
router.get   ('/:tid',    inventoryCtrl.getSingle);
router.put   ('/:tid',    inventoryCtrl.update);
router.delete('/:tid',    inventoryCtrl.remove);


export default router;