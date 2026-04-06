import * as RequisitionService from '../requisition-management/requisition.service.js';

// ─── REQMASTER Controllers ─────────────────────────────────────────────────

export const createRequisition = async (req, res) => {
  try {
    const result = await RequisitionService.createRequisition(req.body);
    res.status(201).json({ success: true, data: result, message: 'Requisition created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllRequisitions = async (req, res) => {
  try {
    const data = await RequisitionService.getAllRequisitions();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRequisitionById = async (req, res) => {
  try {
    const data = await RequisitionService.getRequisitionById(Number(req.params.tid));
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateRequisitionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await RequisitionService.updateRequisitionStatus(Number(req.params.tid), status);
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── REQDETAIL Controllers ─────────────────────────────────────────────────

export const addRequisitionDetail = async (req, res) => {
  try {
    const reqid = Number(req.params.reqid);
    const { items } = req.body; // items = array of item objects
    await RequisitionService.addRequisitionDetail(reqid, items);
    res.status(201).json({ success: true, message: 'Detail rows added' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getDetailsByReqId = async (req, res) => {
  try {
    const data = await RequisitionService.getDetailsByReqId(Number(req.params.reqid));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Approve & Dispatch ────────────────────────────────────────────────────

export const approveDetail = async (req, res) => {
  try {
    await RequisitionService.approveDetail(Number(req.params.tid));
    res.json({ success: true, message: 'Detail approved (STATUS → 1)' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const dispatchDetail = async (req, res) => {
  try {
    // STATUS: 1 → 2 triggers Oracle REQUISITION_UPDATE_STAT automatically
    await RequisitionService.dispatchDetail(Number(req.params.tid));
    res.json({ success: true, message: 'Dispatched. Stock updated via Oracle trigger.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};