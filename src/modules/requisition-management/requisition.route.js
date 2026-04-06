import { Router } from 'express';
import {
  createRequisition,
  getAllRequisitions,
  getRequisitionById,
  updateRequisitionStatus,
  addRequisitionDetail,
  getDetailsByReqId,
  approveDetail,
  dispatchDetail,
} from '../requisition-management/requisition.controller.js';

const router = Router();

// ─── REQMASTER routes ──────────────────────────────────────────────────────
router.post('/',               createRequisition);        // Create new requisition
router.get('/',                getAllRequisitions);        // Get all requisitions
router.get('/:tid',            getRequisitionById);       // Get one with its details
router.patch('/:tid/status',   updateRequisitionStatus);  // Update master status

// ─── REQDETAIL routes ──────────────────────────────────────────────────────
router.post('/:reqid/details',        addRequisitionDetail);   // Add items to a requisition
router.get('/:reqid/details',         getDetailsByReqId);      // Get items of a requisition

// ─── Approve & Dispatch ────────────────────────────────────────────────────
router.patch('/detail/:tid/approve',  approveDetail);   // STATUS: 0 → 1
router.patch('/detail/:tid/dispatch', dispatchDetail);  // STATUS: 1 → 2 (fires Oracle trigger)

export default router;