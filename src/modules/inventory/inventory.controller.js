import * as inventoryService from './inventory.service.js';

export const create = async (req, res) => {
  try {
    const result = await inventoryService.createInventory(req.body);
    res.status(201).json({ success: true});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { tid } = req.params;
    const result = await inventoryService.updateInventory(Number(tid), req.body);
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Inventory not found.' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const rows = await inventoryService.getAllInventories({ page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSingle = async (req, res) => {
  try {
    const row = await inventoryService.getInventoryById(Number(req.params.tid));
    if (!row) return res.status(404).json({ success: false, message: 'Inventory not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const result = await inventoryService.deleteInventory(Number(req.params.tid));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Inventory not found.' });
    res.json({ success: true, message: 'Deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};