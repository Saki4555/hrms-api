import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";
import bcrypt from "bcryptjs"; // ← bcryptjs

const SALT_ROUNDS = 10;

// ─────────────────────────────────────────
//  USERS
// ─────────────────────────────────────────

export const createUser = async (data) => {
  const conn = await getConnection();
  try {
    const passwordHash = await bcrypt.hash(data.PASSWORD, SALT_ROUNDS);
    const result = await conn.execute(
      `INSERT INTO HCM.USERS
         (USERNAME, PASSWORD_HASH, EMPLOYEE_ID, LOCATION_ID, STATUS, CREATED_AT)
       VALUES
         (:USERNAME, :PASSWORD_HASH, :EMPLOYEE_ID, :LOCATION_ID, :STATUS, SYSDATE)
       RETURNING ID INTO :ID`,
      {
        USERNAME:      data.USERNAME,
        PASSWORD_HASH: passwordHash,
        EMPLOYEE_ID:   data.EMPLOYEE_ID ?? null,
        LOCATION_ID:   data.LOCATION_ID ?? null,
        STATUS:        data.STATUS      ?? "ACTIVE",
        ID:            { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );
    return { id: result.outBinds.ID[0] };
  } finally {
    await conn.close();
  }
};

export const getAllUsers = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         u.ID, u.USERNAME, u.EMPLOYEE_ID, u.LOCATION_ID,
         u.STATUS, u.CREATED_AT, u.UPDATED_AT,
         e.FIRST_NAME, e.LAST_NAME, e.EMP_NO,
         l.LOCATION_NAME
       FROM HCM.USERS u
       LEFT JOIN HCM.HR_EMPLOYEE e ON u.EMPLOYEE_ID = e.PERSON_ID
       LEFT JOIN HCM.HR_LOCATION l ON u.LOCATION_ID = l.ID
       ORDER BY u.ID DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const getUserById = async (id) => {
  const conn = await getConnection();
  try {
    const userResult = await conn.execute(
      `SELECT
         u.ID, u.USERNAME, u.EMPLOYEE_ID, u.LOCATION_ID,
         u.STATUS, u.CREATED_AT, u.UPDATED_AT,
         e.FIRST_NAME, e.LAST_NAME, e.EMP_NO,
         l.LOCATION_NAME
       FROM HCM.USERS u
       LEFT JOIN HCM.HR_EMPLOYEE e ON u.EMPLOYEE_ID = e.PERSON_ID
       LEFT JOIN HCM.HR_LOCATION l ON u.LOCATION_ID = l.ID
       WHERE u.ID = :ID`,
      { ID: parseInt(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const user = userResult.rows[0] ?? null;
    if (!user) return null;

    const rolesResult = await conn.execute(
      `SELECT r.ID, r.ROLE_NAME, r.DESCRIPTION, ur.ASSIGNED_AT
         FROM HCM.USER_ROLES ur
         JOIN HCM.ROLES r ON ur.ROLE_ID = r.ID
        WHERE ur.USER_ID = :USER_ID`,
      { USER_ID: parseInt(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const permissionsResult = await conn.execute(
      `SELECT
         p.ID, p.PERMISSION_CODE, p.PERMISSION_NAME, p.DESCRIPTION,
         m.MODULE_NAME, m.ID AS MODULE_ID,
         up.GRANTED_AT
       FROM HCM.USER_PERMISSIONS up
       JOIN HCM.PERMISSIONS p ON up.PERMISSION_ID = p.ID
       LEFT JOIN HCM.MODULES m ON p.MODULE_ID = m.ID
       WHERE up.USER_ID = :USER_ID
       ORDER BY m.SEQUENCE_NO, p.ID`,
      { USER_ID: parseInt(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return {
      ...user,
      roles:       rolesResult.rows,
      permissions: permissionsResult.rows,
    };
  } finally {
    await conn.close();
  }
};

export const updateUser = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HCM.USERS
          SET USERNAME    = :USERNAME,
              EMPLOYEE_ID = :EMPLOYEE_ID,
              LOCATION_ID = :LOCATION_ID,
              STATUS      = :STATUS,
              UPDATED_AT  = SYSDATE
        WHERE ID = :ID`,
      {
        ID:          parseInt(id),
        USERNAME:    data.USERNAME,
        EMPLOYEE_ID: data.EMPLOYEE_ID ?? null,
        LOCATION_ID: data.LOCATION_ID ?? null,
        STATUS:      data.STATUS      ?? "ACTIVE",
      },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

export const changePassword = async (id, newPassword) => {
  const conn = await getConnection();
  try {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const result = await conn.execute(
      `UPDATE HCM.USERS
          SET PASSWORD_HASH = :PASSWORD_HASH,
              UPDATED_AT    = SYSDATE
        WHERE ID = :ID`,
      { ID: parseInt(id), PASSWORD_HASH: passwordHash },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

export const deleteUser = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HCM.USERS
          SET STATUS = 'INACTIVE', UPDATED_AT = SYSDATE
        WHERE ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────
//  MODULES  ← new
// ─────────────────────────────────────────

export const getAllModules = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM HCM.MODULES ORDER BY SEQUENCE_NO, ID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const createModule = async (data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO HCM.MODULES (MODULE_NAME, DESCRIPTION, SEQUENCE_NO)
       VALUES (:MODULE_NAME, :DESCRIPTION, :SEQUENCE_NO)`,
      {
        MODULE_NAME: data.MODULE_NAME,
        DESCRIPTION: data.DESCRIPTION  ?? null,
        SEQUENCE_NO: data.SEQUENCE_NO  ?? null,
      },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

export const updateModule = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HCM.MODULES
          SET MODULE_NAME = :MODULE_NAME,
              DESCRIPTION = :DESCRIPTION,
              SEQUENCE_NO = :SEQUENCE_NO
        WHERE ID = :ID`,
      {
        ID:          parseInt(id),
        MODULE_NAME: data.MODULE_NAME,
        DESCRIPTION: data.DESCRIPTION ?? null,
        SEQUENCE_NO: data.SEQUENCE_NO ?? null,
      },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

export const deleteModule = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM HCM.MODULES WHERE ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────
//  ROLES
// ─────────────────────────────────────────

export const getAllRoles = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM HCM.ROLES ORDER BY ID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const createRole = async (data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO HCM.ROLES (ROLE_NAME, DESCRIPTION, CREATED_AT)
       VALUES (:ROLE_NAME, :DESCRIPTION, SYSDATE)`,
      {
        ROLE_NAME:   data.ROLE_NAME,
        DESCRIPTION: data.DESCRIPTION ?? null,
      },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

export const updateRole = async (id, data) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HCM.ROLES
          SET ROLE_NAME   = :ROLE_NAME,
              DESCRIPTION = :DESCRIPTION
        WHERE ID = :ID`,
      {
        ID:          parseInt(id),
        ROLE_NAME:   data.ROLE_NAME,
        DESCRIPTION: data.DESCRIPTION ?? null,
      },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

export const deleteRole = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM HCM.ROLES WHERE ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────
//  PERMISSIONS
// ─────────────────────────────────────────

export const getAllPermissions = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT
         p.ID, p.PERMISSION_CODE, p.PERMISSION_NAME, p.DESCRIPTION,
         p.MODULE_ID, m.MODULE_NAME, m.SEQUENCE_NO
       FROM HCM.PERMISSIONS p
       LEFT JOIN HCM.MODULES m ON p.MODULE_ID = m.ID
       ORDER BY m.SEQUENCE_NO, p.ID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

export const createPermission = async (data) => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO HCM.PERMISSIONS
         (MODULE_ID, PERMISSION_CODE, PERMISSION_NAME, DESCRIPTION)
       VALUES
         (:MODULE_ID, :PERMISSION_CODE, :PERMISSION_NAME, :DESCRIPTION)`,
      {
        MODULE_ID:       data.MODULE_ID,
        PERMISSION_CODE: data.PERMISSION_CODE,
        PERMISSION_NAME: data.PERMISSION_NAME,
        DESCRIPTION:     data.DESCRIPTION ?? null,
      },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

export const deletePermission = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM HCM.PERMISSIONS WHERE ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────
//  ASSIGN / REVOKE
// ─────────────────────────────────────────

export const assignRoleToUser = async (userId, roleId) => {
  const conn = await getConnection();
  try {
    const existing = await conn.execute(
      `SELECT ID FROM HCM.USER_ROLES
        WHERE USER_ID = :USER_ID AND ROLE_ID = :ROLE_ID`,
      { USER_ID: parseInt(userId), ROLE_ID: parseInt(roleId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length > 0) throw new Error("Role already assigned to this user");

    await conn.execute(
      `INSERT INTO HCM.USER_ROLES (USER_ID, ROLE_ID, ASSIGNED_AT)
       VALUES (:USER_ID, :ROLE_ID, SYSDATE)`,
      { USER_ID: parseInt(userId), ROLE_ID: parseInt(roleId) },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

export const revokeRoleFromUser = async (userId, roleId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM HCM.USER_ROLES
        WHERE USER_ID = :USER_ID AND ROLE_ID = :ROLE_ID`,
      { USER_ID: parseInt(userId), ROLE_ID: parseInt(roleId) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

export const assignPermissionToUser = async (userId, permissionId) => {
  const conn = await getConnection();
  try {
    const existing = await conn.execute(
      `SELECT ID FROM HCM.USER_PERMISSIONS
        WHERE USER_ID = :USER_ID AND PERMISSION_ID = :PERMISSION_ID`,
      { USER_ID: parseInt(userId), PERMISSION_ID: parseInt(permissionId) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length > 0) throw new Error("Permission already assigned to this user");

    await conn.execute(
      `INSERT INTO HCM.USER_PERMISSIONS (USER_ID, PERMISSION_ID, GRANTED_AT)
       VALUES (:USER_ID, :PERMISSION_ID, SYSDATE)`,
      { USER_ID: parseInt(userId), PERMISSION_ID: parseInt(permissionId) },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

export const revokePermissionFromUser = async (userId, permissionId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM HCM.USER_PERMISSIONS
        WHERE USER_ID = :USER_ID AND PERMISSION_ID = :PERMISSION_ID`,
      { USER_ID: parseInt(userId), PERMISSION_ID: parseInt(permissionId) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};