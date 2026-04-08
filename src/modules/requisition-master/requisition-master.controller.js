import * as requisitionService from "./requisition-master.service.js";

export async function getAll(req, res) {
  try {
    const data = await requisitionService.getAllRequisitions();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getOne(req, res) {
  try {
    const data = await requisitionService.getRequisitionById(req.params.tid);
    if (!data) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function create(req, res) {
  try {
    const { master, details } = req.body;
    const masterTid = await requisitionService.createRequisition(master, details);
    res.status(201).json({ success: true, message: "Requisition created", masterTid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function update(req, res) {
  try {
    const { master, details } = req.body;
    await requisitionService.updateRequisition(req.params.tid, master, details);
    res.json({ success: true, message: "Requisition updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function approveOne(req, res) {
  try {
    await requisitionService.approveDetail(req.params.masterTid, req.params.detailTid);
    res.json({ success: true, message: "Item approved" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function approveAll(req, res) {
  try {
    await requisitionService.approveAllDetails(req.params.masterTid);
    res.json({ success: true, message: "All pending items approved" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}