import * as itemService from './item.service.js';

export const create = async (req, res) => {
  try {
    const result = await itemService.createItem(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { itemId } = req.params;
    const result = await itemService.updateItem(Number(itemId), req.body);
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Item not found.' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const rows = await itemService.getAllItems({ page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingle = async (req, res) => {
  try {
    const row = await itemService.getItemById(Number(req.params.itemId));
    if (!row) return res.status(404).json({ success: false, message: 'Item not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const result = await itemService.deleteItem(Number(req.params.itemId));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Item not found.' });
    res.json({ success: true, message: 'Deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};