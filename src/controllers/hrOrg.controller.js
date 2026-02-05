import {
  insertHrOrg,
  updateHrOrg,
  deleteHrOrg,
  getHrOrgList
} from "../services/hrOrg.service.js";

export const create = async (req, res) => {
  try {
    const result = await insertHrOrg(req.body);
    res.json({ message: "Created successfully"});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const result = await updateHrOrg(req.params.id, req.body);
    res.json({ message: "Updated successfully"});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const result = await deleteHrOrg(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const list = async (req, res) => {
  try {
    const data = await getHrOrgList();
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
