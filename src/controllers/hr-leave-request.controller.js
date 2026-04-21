import {
  createLeaveService,
  getAllLeavesService,
  getLeaveByIdService,
  getLeavesByEmployeeId,
  getLeavesByTeam,
  updateLeaveService,
  deleteLeaveService,
} from "../services/hr-leave-request.service.js";

// CREATE
export const createLeave = async (req, res) => {
  try {
    await createLeaveService(req.body);
    res.status(201).json({ message: "Leave created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET ALL — paginated + filtered (Admin / HR)
export const getAllLeaves = async (req, res) => {
  try {
    const result = await getAllLeavesService(req.query);
    res.json({ success: true, ...result });
    // response shape: { success, data: [], pagination: { total, page, limit, totalPages } }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET BY EMPLOYEE — employee sees own leave history (ESS)
export const getLeavesByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status } = req.query;
    const data = await getLeavesByEmployeeId(employeeId, status || null);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET BY TEAM — supervisor sees their team's leaves (MSS)
export const getLeavesByTeamController = async (req, res) => {
  try {
    const { supervisorId } = req.params;
    const { status } = req.query;
    const data = await getLeavesByTeam(supervisorId, status || null);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET SINGLE
export const getLeaveById = async (req, res) => {
  try {
    const data = await getLeaveByIdService(req.params.id);
    if (!data) return res.status(404).json({ message: "Leave not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
export const updateLeave = async (req, res) => {
  try {
    await updateLeaveService(req.params.id, req.body);
    res.json({ message: "Leave updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
export const deleteLeave = async (req, res) => {
  try {
    await deleteLeaveService(req.params.id);
    res.json({ message: "Leave deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};