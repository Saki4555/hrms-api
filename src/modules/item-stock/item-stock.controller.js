import * as itemStockService from './item-stock.service.js';

export const create = async (req, res) => {
  try {
    const result = await itemStockService.createItemStock(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { storeId, itemId } = req.params;
    const result = await itemStockService.updateItemStock(Number(storeId), Number(itemId), req.body);
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Item stock record not found.' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// export const getAll = async (req, res) => {
//   try {
//     const { page = 1, limit = 20 } = req.query;
//     const rows = await itemStockService.getAllItemStocks({ page: Number(page), limit: Number(limit) });
//     res.json({ success: true, data: rows });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


export const getAll = async (req, res) => {
  try {
    const { storeId, page = 1, limit = 20 } = req.query;

    // ✅ storeId থাকলে শুধু ওই store এর items
    if (storeId) {
      const rows = await itemStockService.getItemsByStore(Number(storeId));
      return res.json({ success: true, data: rows });
    }

    const rows = await itemStockService.getAllItemStocks({ page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
export const getSingle = async (req, res) => {
  try {
    const { storeId, itemId } = req.params;
    const row = await itemStockService.getItemStockById(Number(storeId), Number(itemId));
    if (!row) return res.status(404).json({ success: false, message: 'Item stock record not found.' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { storeId, itemId } = req.params;
    const result = await itemStockService.deleteItemStock(Number(storeId), Number(itemId));
    if (result.rowsAffected === 0)
      return res.status(404).json({ success: false, message: 'Item stock record not found.' });
    res.json({ success: true, message: 'Deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

