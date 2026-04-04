import {
  createStoreService,
  getAllStoresService,
  getStoreByIdService,
  updateStoreService,
  deleteStoreService,
} from "../store/store.service.js";

/* CREATE */
export const createStore = async (req, res) => {
  try {
    const id = await createStoreService(req.body);
    res.status(201).json({ message: "Store created", id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* GET ALL */
export const getAllStores = async (req, res) => {
  try {
    const data = await getAllStoresService();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* GET ONE */
export const getStoreById = async (req, res) => {
  try {
    const data = await getStoreByIdService(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* UPDATE */
export const updateStore = async (req, res) => {
  try {
    await updateStoreService(req.params.id, req.body);
    res.json({ message: "Updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* DELETE */
export const deleteStore = async (req, res) => {
  try {
    await deleteStoreService(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
