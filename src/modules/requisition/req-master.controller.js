import * as reqMasterService from '../requisition/req-master.service.js';

// GET /api/reqmaster
export const getAll = async (req, res) => {
  try {
    const data = await reqMasterService.getAllReqMaster();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reqmaster/:tid
export const getOne = async (req, res) => {
  try {
    const { tid } = req.params;
    const data = await reqMasterService.getReqMasterById(Number(tid));
    if (!data) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/reqmaster
export const create = async (req, res) => {
  try {
    const result = await reqMasterService.createReqMaster(req.body);
    res.status(201).json({ success: true, message: 'REQMASTER created', tid: result.tid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/reqmaster/:tid
export const update = async (req, res) => {
  try {
    const { tid } = req.params;
    const result = await reqMasterService.updateReqMaster(Number(tid), req.body);
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'REQMASTER updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
