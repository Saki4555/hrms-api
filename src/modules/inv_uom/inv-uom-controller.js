import {
  createUOMService,
  getAllUOMService,
  getUOMByIdService,
  updateUOMService,
  deleteUOMService,
} from "../inv_uom/inv-uom-service.js";

export const createUOM = async (req, res) => {
  try {
    const id = await createUOMService(req.body);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllUOM = async (req, res) => {
  try {
    const data = await getAllUOMService();
    res.json(data);
  } catch (err) {
    res.status(500).json(err);
  }
};

export const getUOMById = async (req, res) => {
  const data = await getUOMByIdService(req.params.id);
  res.json(data);
};

export const updateUOM = async (req, res) => {
  await updateUOMService(req.params.id, req.body);
  res.json({ message: "Updated" });
};

export const deleteUOM = async (req, res) => {
  await deleteUOMService(req.params.id);
  res.json({ message: "Deleted" });
};
