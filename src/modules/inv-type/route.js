import { Router } from 'express';
import * as invTypeController from '../inv-type/controller.js';

const router = Router();

router.get('/',       invTypeController.getAll);
router.get('/:id',    invTypeController.getById);
router.post('/',      invTypeController.create);
router.put('/:id',    invTypeController.update);
router.delete('/:id', invTypeController.remove);

export default router;