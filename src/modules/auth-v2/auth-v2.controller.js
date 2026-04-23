// src/modules/auth-v2/auth-v2.controller.js
import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";
import bcrypt from "bcryptjs";
import { generateTokenV2 } from "../../utils/auth-token-v2.js";

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
export const registerV2 = async (req, res) => {
  let connection;
  try {
    const { username, password, employee_id, role_name } = req.body;

    if (!username || !password || !employee_id || !role_name) {
      return res.status(400).json({
        error: "username, password, employee_id and role_name are required",
      });
    }

    connection = await getConnection();

    // 1. Username already exists?
    const userExists = await connection.execute(
      `SELECT ID FROM HCM.USERS WHERE UPPER(USERNAME) = UPPER(:username)`,
      { username },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // 2. Role exists?
    const roleResult = await connection.execute(
      `SELECT ID FROM HCM.ROLES WHERE UPPER(ROLE_NAME) = UPPER(:role_name)`,
      { role_name },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ error: `Role "${role_name}" not found` });
    }
    const roleId = roleResult.rows[0].ID;

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Insert user
    const result = await connection.execute(
      `INSERT INTO HCM.USERS (EMPLOYEE_ID, USERNAME, PASSWORD_HASH, STATUS, CREATED_AT)
       VALUES (:employee_id, :username, :password_hash, 'ACTIVE', SYSDATE)
       RETURNING ID INTO :userId`,
      {
        employee_id,
        username: username.trim(),
        password_hash: hashedPassword,
        userId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false }
    );
    const userId = result.outBinds.userId[0];

    // 5. Assign role
    await connection.execute(
      `INSERT INTO HCM.USER_ROLES (USER_ID, ROLE_ID, ASSIGNED_AT)
       VALUES (:user_id, :role_id, SYSDATE)`,
      { user_id: userId, role_id: roleId },
      { autoCommit: false }
    );

    await connection.commit();

    // 6. Generate token (no cookie)
    const token = generateTokenV2(userId, username, [role_name.toUpperCase()], employee_id);

    return res.status(201).json({
      status: "success",
      data: {
        user: { id: userId, username, employee_id, role: role_name },
        token, // client stores this in localStorage / sessionStorage
      },
    });
  } catch (error) {
    if (connection) await connection.rollback().catch(console.error);
    console.error("❌ RegisterV2 error:", error);
    return res.status(500).json({ error: "Registration failed" });
  } finally {
    if (connection) await connection.close().catch(console.error);
  }
};

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
export const loginV2 = async (req, res) => {
  let connection;
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Enter username and password" });
    }

    connection = await getConnection();

    // 1. Find user
    const result = await connection.execute(
      `SELECT ID, USERNAME, PASSWORD_HASH, STATUS, EMPLOYEE_ID
       FROM HCM.USERS
       WHERE UPPER(USERNAME) = UPPER(:username)`,
      { username },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Wrong username or password" });
    }

    const user = result.rows[0];

    // 2. Account active?
    if (user.STATUS !== "ACTIVE") {
      return res.status(403).json({ error: "Account inactive or suspended" });
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Wrong username or password" });
    }

    // 4. Fetch roles
    const rolesResult = await connection.execute(
      `SELECT R.ROLE_NAME
       FROM HCM.ROLES R
       JOIN HCM.USER_ROLES UR ON R.ID = UR.ROLE_ID
       WHERE UR.USER_ID = :user_id`,
      { user_id: user.ID },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const roles = rolesResult.rows.map((r) => r.ROLE_NAME);

    // 5. Fetch effective permissions (direct + via roles)
    const permissionsResult = await connection.execute(
      `SELECT DISTINCT p.PERMISSION_CODE
       FROM HCM.PERMISSIONS p
       WHERE p.ID IN (
         SELECT up.PERMISSION_ID FROM HCM.USER_PERMISSIONS up WHERE up.USER_ID = :user_id
         UNION
         SELECT rp.PERMISSION_ID
         FROM HCM.ROLE_PERMISSIONS rp
         JOIN HCM.USER_ROLES ur ON rp.ROLE_ID = ur.ROLE_ID
         WHERE ur.USER_ID = :user_id
       )
       ORDER BY p.PERMISSION_CODE`,
      { user_id: user.ID },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const permissions = permissionsResult.rows.map((r) => r.PERMISSION_CODE);

    // 6. Generate token (no cookie)
    const token = generateTokenV2(user.ID, user.USERNAME, roles, user.EMPLOYEE_ID);

    return res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user.ID,
          username: user.USERNAME,
          employee_id: user.EMPLOYEE_ID,
          roles,
          permissions,
        },
        token, // client stores this in localStorage / sessionStorage
      },
    });
  } catch (error) {
    console.error("❌ LoginV2 error:", error);
    return res.status(500).json({ error: "Login failed" });
  } finally {
    if (connection) await connection.close().catch(console.error);
  }
};

// ─────────────────────────────────────────────
// LOGOUT
// Stateless — client just deletes the token.
// This endpoint is optional but useful for audit logs or token blacklisting later.
// ─────────────────────────────────────────────
export const logoutV2 = (req, res) => {
  // Nothing to clear server-side (no cookie).
  // Tell the client to discard the token.
  return res.status(200).json({
    status: "success",
    message: "Logout successful. Please remove the token from storage.",
  });
};