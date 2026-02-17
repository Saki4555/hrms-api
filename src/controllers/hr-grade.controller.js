import * as service from "../services/hr-grade.service.js";

export const create = async (req, res) => {
  try {
    await service.createGrade(req.body);
    res.status(201).json({ message: "Grade created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const update = async (req, res) => {
  try {
    await service.updateGrade(req.params.id, req.body);
    res.json({ message: "Grade updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



export const remove = async (req, res) => {
  try {
    await service.softDeleteGrade(req.params.id);
    res.json({ message: "Grade soft deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const data = await service.getGradeById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const data = await service.getAllGrades();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
