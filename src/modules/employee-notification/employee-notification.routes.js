import express from "express";
import * as ctrl from "./employee-notification.controller.js";

const router = express.Router();

// Get notifications
router.get("/supervisor/:supervisorId",             ctrl.getForSupervisor);
router.get("/employee/:employeeId",                 ctrl.getForEmployee);
router.get("/supervisor/:supervisorId/unread-count", ctrl.getUnreadCount);

// Mark as read
router.patch("/:id/read",                           ctrl.markAsRead);
router.patch("/supervisor/:supervisorId/read-all",  ctrl.markAllAsRead);

// Approve / Reject
router.post("/approve",                             ctrl.approveLeave);
router.post("/reject",                              ctrl.rejectLeave);

export default router;