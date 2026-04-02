import { Router } from 'express';

import * as itemCtrl      from './item.controller.js';


const router = Router();


// ──────────────────────────────────────────────────────────────────────────────
// ITEM   (PK: ITEM_ID)
// ──────────────────────────────────────────────────────────────────────────────
router.post  ('/',               itemCtrl.create);
router.get   ('/',               itemCtrl.getAll);
router.get   ('/:itemId',       itemCtrl.getSingle);
router.put   ('/:itemId',       itemCtrl.update);
router.delete('/:itemId',       itemCtrl.remove);


export default router;