import express from "express";
import * as ctrl from "./user-management.controller.js";

const router = express.Router();

// ── Users ──────────────────────────────────────────────────────────────────
router.post("/", ctrl.createUser);
router.get("/", ctrl.getAllUsers);
router.get("/:id", ctrl.getUserById);
router.put("/:id", ctrl.updateUser);
router.patch("/:id/change-password", ctrl.changePassword);
router.delete("/:id", ctrl.deleteUser);

// ── Roles ──────────────────────────────────────────────────────────────────
router.get("/roles/all", ctrl.getAllRoles);
router.post("/roles", ctrl.createRole);
router.put("/roles/:id", ctrl.updateRole);
router.delete("/roles/:id", ctrl.deleteRole);

// ── Permissions ────────────────────────────────────────────────────────────
router.get("/permissions/all", ctrl.getAllPermissions);
router.post("/permissions", ctrl.createPermission);
router.delete("/permissions/:id", ctrl.deletePermission);

// ── Modules ────────────────────────────────────────────────────────────────
router.get("/modules/all", ctrl.getAllModules);
router.post("/modules", ctrl.createModule);
router.put("/modules/:id", ctrl.updateModule);
router.delete("/modules/:id", ctrl.deleteModule);

// ── Assign / Revoke ────────────────────────────────────────────────────────
router.post("/:userId/roles", ctrl.assignRole);
router.delete("/:userId/roles/:roleId", ctrl.revokeRole);
router.post("/:userId/permissions", ctrl.assignPermission);
router.delete("/:userId/permissions/:permissionId", ctrl.revokePermission);

export default router;
