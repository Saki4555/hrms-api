import * as invTypeService from '../inv-type/service.js';

export const getAll = async (req, res) => {
  try {
    const data = await invTypeService.getAllInvTypes();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getById = async (req, res) => {
  try {
    const data = await invTypeService.getInvTypeById(Number(req.params.id));
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const result = await invTypeService.createInvType(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const result = await invTypeService.updateInvType(Number(req.params.id), req.body);
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const result = await invTypeService.deleteInvType(Number(req.params.id));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};