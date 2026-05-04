
// src\controllers\auth.controller.js
import { getConnection } from "../config/db.js";
import oracledb from "oracledb";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/auth-token.js";

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
const register = async (req, res) => {
  let connection;

  try {
    const { username, password, employee_id, role_name } = req.body;

    if (!username || !password || !employee_id || !role_name) {
      return res.status(400).json({
        error: "username, password, employee_id and role_name",
      });
    }

    connection = await getConnection();

    // ১. Username আগে আছে কিনা চেক
    const userExists = await connection.execute(
      `SELECT ID FROM USERS WHERE UPPER(USERNAME) = UPPER(:username)`,
      { username },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Username exit" });
    }

    // ২. Role আছে কিনা চেক
    const roleResult = await connection.execute(
      `SELECT ID FROM ROLES WHERE UPPER(ROLE_NAME) = UPPER(:role_name)`,
      { role_name },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({
        error: `"${role_name}" not found role`,
      });
    }

    const roleId = roleResult.rows[0].ID;

    // ৩. Password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ৪. User insert করো, ID ফেরত নাও
    const result = await connection.execute(
      `INSERT INTO USERS (EMPLOYEE_ID, USERNAME, PASSWORD_HASH, STATUS, CREATED_AT)
       VALUES (:employee_id, :username, :password_hash, 'ACTIVE', SYSDATE)
       RETURNING ID INTO :userId`,
      {
        employee_id,
        username: username.trim(),
        password_hash: hashedPassword,
        userId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false }, // commit পরে একসাথে করব
    );

    const userId = result.outBinds.userId[0];

    // ৫. USER_ROLES-এ role assign করো
    await connection.execute(
      `INSERT INTO USER_ROLES (USER_ID, ROLE_ID, ASSIGNED_AT)
       VALUES (:user_id, :role_id, SYSDATE)`,
      { user_id: userId, role_id: roleId },
      { autoCommit: false },
    );

    // ৬. সব ঠিক থাকলে commit
    await connection.commit();

    // ৭. JWT Token বানাও
    const token = generateToken(
      userId,
      username,
      [role_name.toUpperCase()],
      employee_id,
      res,
    );

    return res.status(201).json({
      status: "success",
      data: {
        user: { id: userId, username, employee_id, role: role_name },
        token,
      },
    });
  } catch (error) {
    if (connection) await connection.rollback().catch(console.error);
    console.error("❌ Register error:", error);
    return res.status(500).json({ error: "Registration failed" });
  } finally {
    if (connection) await connection.close().catch(console.error);
  }
};

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
const login = async (req, res) => {
  let connection;

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Enter username and password " });
    }

    connection = await getConnection();

   
    const result = await connection.execute(
      `SELECT ID, USERNAME, PASSWORD_HASH, STATUS, EMPLOYEE_ID
       FROM USERS
       WHERE UPPER(USERNAME) = UPPER(:username)`,
      { username },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "wrong Username and password" });
    }

    const user = result.rows[0];

    console.log("user-->", user);

    
    if (user.STATUS !== "ACTIVE") {
      return res.status(403).json({ error: "Account inactive or suspended" });
    }

    // ৩. Password verify
    const isPasswordValid = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "wrong Username or password" });
    }

    // ৪. এই user-এর সব roles আনো
    const rolesResult = await connection.execute(
      `SELECT R.ID, R.ROLE_NAME
   FROM ROLES R
   JOIN USER_ROLES UR ON R.ID = UR.ROLE_ID
   WHERE UR.USER_ID = :user_id`,
      { user_id: user.ID },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const roles = rolesResult.rows.map((r) => r.ROLE_NAME);

    // ৫. এই user-এর effective permissions আনো (direct + via roles)
    const permissionsResult = await connection.execute(
      `SELECT DISTINCT p.PERMISSION_CODE
   FROM PERMISSIONS p
   WHERE p.ID IN (
     SELECT up.PERMISSION_ID
     FROM USER_PERMISSIONS up
     WHERE up.USER_ID = :user_id
     UNION
     SELECT rp.PERMISSION_ID
     FROM ROLE_PERMISSIONS rp
     JOIN USER_ROLES ur ON rp.ROLE_ID = ur.ROLE_ID
     WHERE ur.USER_ID = :user_id
   )
   ORDER BY p.PERMISSION_CODE`,
      { user_id: user.ID },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const permissions = permissionsResult.rows.map((r) => r.PERMISSION_CODE);

    
    const token = generateToken(
      user.ID,
      user.USERNAME,
      roles,
      user.EMPLOYEE_ID,
      res,
    );

    return res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user.ID,
          username: user.USERNAME,
          employee_id: user.EMPLOYEE_ID,
          roles,
          permissions, // ← added
        },
        token,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  } finally {
    if (connection) await connection.close().catch(console.error);
  }
};

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
const logout = (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  return res.status(200).json({
    status: "success",
    message: "Logout successfully",
  });
};

export { register, login, logout };
