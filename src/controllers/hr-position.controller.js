

import * as positionService from "../services/hr-position.service.js";

export const create = async (req, res) => {
  try {
    const result = await positionService.createPosition(req.body);
    res.status(201).json({ message: "Position created successful"});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const result = await positionService.updatePosition(
      req.params.id,
      req.body
    );
    res.json({ message: "Position updated", result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// export const remove = async (req, res) => {
//   try {
//     const result = await positionService.deletePosition(req.params.id);
//     res.json({ message: "Position deleted", result });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

export const getOne = async (req, res) => {
  try {
    const result = await positionService.getPositionById(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const result = await positionService.getAllPositions();
    res.json({success: true, count:result.length, data:result});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};