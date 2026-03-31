import * as service from "./employee-notification.service.js";

export const getForSupervisor = async (req, res) => {
  try {
    const data = await service.getNotificationsForSupervisor(req.params.supervisorId);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getForEmployee = async (req, res) => {
  try {
    const data = await service.getNotificationsForEmployee(req.params.employeeId);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await service.getUnreadCount(req.params.supervisorId);
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const affected = await service.markAsRead(req.params.id);
    if (!affected) return res.status(404).json({ error: "Notification not found" });
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await service.markAllAsRead(req.params.supervisorId);
    res.json({ success: true, message: "All marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const approveLeave = async (req, res) => {
  try {
    const { leaveId, approverId, notificationId } = req.body;
    await service.approveLeave(leaveId, approverId, notificationId);
    res.json({ success: true, message: "Leave approved successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const rejectLeave = async (req, res) => {
  try {
    const { leaveId, approverId, notificationId, reason } = req.body;
    await service.rejectLeave(leaveId, approverId, notificationId, reason);
    res.json({ success: true, message: "Leave rejected successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};