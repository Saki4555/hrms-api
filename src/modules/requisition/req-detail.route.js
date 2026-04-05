import { Router } from 'express';
import { getAll, getOne, create, createBulk, update } from './req-detail.controller.js';

const router = Router();

router.get('/',         getAll);       // GET    /api/reqdetail  (or ?tid=1001)
router.get('/:tid',     getOne);       // GET    /api/reqdetail/:tid
router.post('/bulk',    createBulk);   // POST   /api/reqdetail/bulk  ← bulk insert
router.post('/',        create);       // POST   /api/reqdetail
router.put('/:tid',     update);       // PUT    /api/reqdetail/:tid

export default router;
