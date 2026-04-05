import { Router } from 'express';
import { getAll, getOne, create, update } from './req-master.controller.js';

const router = Router();

router.get('/',        getAll);    // GET    /api/reqmaster
router.get('/:tid',    getOne);    // GET    /api/reqmaster/:tid
router.post('/',       create);    // POST   /api/reqmaster
router.put('/:tid',    update);    // PUT    /api/reqmaster/:tid

export default router;
