import { Router } from 'express';

import * as itemStockCtrl from './item-stock.controller.js';

const router = Router();



// ──────────────────────────────────────────────────────────────────────────────
// ITEM_STOCK   (Composite PK: STORE_ID + ITEM_ID)
// ──────────────────────────────────────────────────────────────────────────────
router.post  ('/',                          itemStockCtrl.create);
router.get   ('/',                          itemStockCtrl.getAll);
router.get   ('/:storeId/:itemId',         itemStockCtrl.getSingle);
router.put   ('/:storeId/:itemId',         itemStockCtrl.update);
router.delete('/:storeId/:itemId',         itemStockCtrl.remove);

export default router;