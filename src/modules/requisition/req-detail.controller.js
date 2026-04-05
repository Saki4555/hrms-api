import * as reqDetailService from '../requisition/req-detail.service.js';

// GET /api/reqdetail  OR  /api/reqdetail?tid=1001
export const getAll = async (req, res) => {
  try {
    const tid = req.query.tid ? Number(req.query.tid) : null;
    const data = await reqDetailService.getAllReqDetail(tid);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reqdetail/:tid
export const getOne = async (req, res) => {
  try {
    const { tid } = req.params;
    const data = await reqDetailService.getReqDetailById(Number(tid));
    if (!data) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/reqdetail  (single)
export const create = async (req, res) => {
  try {
    const result = await reqDetailService.createReqDetail(req.body);
    res.status(201).json({ success: true, message: 'REQDETAIL created', rowsAffected: result.rowsAffected });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/reqdetail/bulk
export const createBulk = async (req, res) => {
  try {
    const { tid, items } = req.body;
    if (!tid || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ success: false, message: 'tid and items[] are required' });

    const result = await reqDetailService.createReqDetailBulk(tid, items);
    res.status(201).json({
      success: true,
      message: `${items.length} items inserted`,
      rowsAffected: result.rowsAffected,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/reqdetail/:tid
export const update = async (req, res) => {
  try {
    const { tid } = req.params;
    const result = await reqDetailService.updateReqDetail(Number(tid), req.body);
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'REQDETAIL updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
