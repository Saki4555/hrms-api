import * as service from "../services/hr-org-type.service.js";

export const getAll = async (req, res) => {
  try {
    const data = await service.getAllHrOrgTypes();
    res.json({ success: true, count:data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const id = await service.createHrOrgType(req.body);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    await service.updateHrOrgType(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const softDelete = async (req, res) => {
  try {
    await service.deleteHrOrgType(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



export const getOrgTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await service.getHrOrgTypeById(id);

    if (!data) {
      return res.status(404).json({ message: "Org Type Not Found" });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
