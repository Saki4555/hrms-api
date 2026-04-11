import * as userService from "./user-management.service.js";

// ─── USERS ────────────────────────────────────────────────────────────────────

export const createUser = async (req, res) => {
  try {
    const result = await userService.createUser(req.body);
    res.status(201).json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const data = await userService.getAllUsers(req.query);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const data = await userService.getUserById(req.params.id);
    if (!data) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const affected = await userService.updateUser(req.params.id, req.body);
    if (!affected) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: "New password is required" });
    const affected = await userService.changePassword(req.params.id, newPassword);
    if (!affected) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const affected = await userService.deleteUser(req.params.id);
    if (!affected) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, message: "User deactivated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const activateUser = async (req, res) => {
  try {
    const affected = await userService.activateUser(req.params.id);
    if (!affected) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, message: "User activated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// ─── ROLES ────────────────────────────────────────────────────────────────────

export const getAllRoles = async (req, res) => {
  try {
    const data = await userService.getAllRoles();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createRole = async (req, res) => {
  try {
    await userService.createRole(req.body);
    res.status(201).json({ success: true, message: "Role created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateRole = async (req, res) => {
  try {
    const affected = await userService.updateRole(req.params.id, req.body);
    if (!affected) return res.status(404).json({ error: "Role not found" });
    res.json({ success: true, message: "Role updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const affected = await userService.deleteRole(req.params.id);
    if (!affected) return res.status(404).json({ error: "Role not found" });
    res.json({ success: true, message: "Role deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── PERMISSIONS ──────────────────────────────────────────────────────────────

export const getAllPermissions = async (req, res) => {
  try {
    const data = await userService.getAllPermissions();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createPermission = async (req, res) => {
  try {
    await userService.createPermission(req.body);
    res.status(201).json({ success: true, message: "Permission created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deletePermission = async (req, res) => {
  try {
    const affected = await userService.deletePermission(req.params.id);
    if (!affected) return res.status(404).json({ error: "Permission not found" });
    res.json({ success: true, message: "Permission deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── ASSIGN / REVOKE ──────────────────────────────────────────────────────────

export const assignRole = async (req, res) => {
  try {
    await userService.assignRoleToUser(req.params.userId, req.body.roleId);
    res.status(201).json({ success: true, message: "Role assigned successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const revokeRole = async (req, res) => {
  try {
    const affected = await userService.revokeRoleFromUser(req.params.userId, req.params.roleId);
    if (!affected) return res.status(404).json({ error: "Role assignment not found" });
    res.json({ success: true, message: "Role revoked successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const assignPermission = async (req, res) => {
  try {
    await userService.assignPermissionToUser(req.params.userId, req.body.permissionId);
    res.status(201).json({ success: true, message: "Permission assigned successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const revokePermission = async (req, res) => {
  try {
    const affected = await userService.revokePermissionFromUser(req.params.userId, req.params.permissionId);
    if (!affected) return res.status(404).json({ error: "Permission assignment not found" });
    res.json({ success: true, message: "Permission revoked successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ─── MODULES ──────────────────────────────────────────────────────────────────

export const getAllModules = async (req, res) => {
  try {
    const data = await userService.getAllModules();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createModule = async (req, res) => {
  try {
    await userService.createModule(req.body);
    res.status(201).json({ success: true, message: "Module created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateModule = async (req, res) => {
  try {
    const affected = await userService.updateModule(req.params.id, req.body);
    if (!affected) return res.status(404).json({ error: "Module not found" });
    res.json({ success: true, message: "Module updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteModule = async (req, res) => {
  try {
    const affected = await userService.deleteModule(req.params.id);
    if (!affected) return res.status(404).json({ error: "Module not found" });
    res.json({ success: true, message: "Module deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




// ─── ROLE PERMISSIONS ─────────────────────────────────────────────────────────

export const getRolePermissions = async (req, res) => {
  try {
    const data = await userService.getRolePermissions(req.params.roleId);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const assignPermissionToRole = async (req, res) => {
  try {
    // grantedBy comes from the authenticated user making the request
    await userService.assignPermissionToRole(
      req.params.roleId,
      req.body.permissionId,
      req.user?.id   // set by protectRoute
    );
    res.status(201).json({ success: true, message: "Permission assigned to role successfully" });
  } catch (err) {
    // "already assigned" is a business rule, not a 500
    const status = err.message.includes("already assigned") ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
};

export const revokePermissionFromRole = async (req, res) => {
  try {
    const affected = await userService.revokePermissionFromRole(
      req.params.roleId,
      req.params.permissionId
    );
    if (!affected) return res.status(404).json({ error: "Permission assignment not found" });
    res.json({ success: true, message: "Permission revoked from role successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};