import * as service from "../services/hr-person-type.service.js";

/* CREATE */
export const create = async (req, res) => {
  try {
    await service.create(req.body);

    res.status(201).json({
      success: true,
      message: "Person Type created successfully"
    });

  } catch (err) {
    console.error("Create Controller Error:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/* GET ALL */
export const getAll = async (req, res) => {
  try {
    const data = await service.getAll();

    res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (err) {
    console.error("GetAll Controller Error:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/* GET BY ID */
export const getById = async (req, res) => {
  try {
    const data = await service.getById(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Person Type not found"
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (err) {
    console.error("GetById Controller Error:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/* UPDATE */
export const update = async (req, res) => {
  try {
    await service.update(req.params.id, req.body);

    res.json({
      success: true,
      message: "Person Type updated successfully"
    });

  } catch (err) {
    console.error("Update Controller Error:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/* SOFT DELETE */
export const remove = async (req, res) => {
  try {
    await service.softDelete(req.params.id);

    res.json({
      success: true,
      message: "Person Type deleted"
    });

  } catch (err) {
    console.error("Delete Controller Error:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
