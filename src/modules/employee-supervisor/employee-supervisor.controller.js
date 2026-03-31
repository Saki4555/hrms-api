import * as service from "./employee-supervisor.service.js";

export const assignSupervisor = async (req, res) => {
  try {
    const result = await service.assignSupervisor(req.body);
    res.status(201).json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const data = await service.getAllSupervisorAssignments();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getBySupervisor = async (req, res) => {
  try {
    const data = await service.getTeamBySupervisor(req.params.supervisorId);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getByEmployee = async (req, res) => {
  try {
    const data = await service.getSupervisorByEmployee(req.params.personId);
    if (!data) return res.status(404).json({ error: "No supervisor assigned to this employee" });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const affected = await service.updateSupervisor(req.params.id, req.body);
    if (!affected) return res.status(404).json({ error: "Assignment not found" });
    res.json({ success: true, message: "Supervisor updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const affected = await service.removeSupervisor(req.params.id);
    if (!affected) return res.status(404).json({ error: "Assignment not found" });
    res.json({ success: true, message: "Supervisor removed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};