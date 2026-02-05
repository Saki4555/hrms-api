import {
  createHrOrgPosition,
  updateHrOrgPosition,
  deleteHrOrgPosition,
  getAllHrOrgPositions
} from "../services/hr-org-position.service.js";

/**
 * POST
 */
export const create = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      EFFECTIVE_START_DATE: req.body.EFFECTIVE_START_DATE
        ? new Date(req.body.EFFECTIVE_START_DATE)
        : null,
      EFFECTIVE_END_DATE: req.body.EFFECTIVE_END_DATE
        ? new Date(req.body.EFFECTIVE_END_DATE)
        : null
    };

    const result = await createHrOrgPosition(payload);

    res.status(201).json({
      success: true,
      message: "HR Org Position created successfully",
      
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUT
 */
export const update = async (req, res) => {
  try {
    const { id } = req.params;

    const payload = {
      ...req.body,
      EFFECTIVE_START_DATE: req.body.EFFECTIVE_START_DATE
        ? new Date(req.body.EFFECTIVE_START_DATE)
        : null,
      EFFECTIVE_END_DATE: req.body.EFFECTIVE_END_DATE
        ? new Date(req.body.EFFECTIVE_END_DATE)
        : null
    };

    const result = await updateHrOrgPosition(id, payload);

    res.json({
      success: true,
      message: "HR Org Position updated successfully",
      
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE
 */
export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteHrOrgPosition(id);

    res.json({
      success: true,
      message: "HR Org Position deleted successfully",
      
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET ALL
 */
export const getAll = async (req, res) => {
  try {
    const data = await getAllHrOrgPositions();
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
