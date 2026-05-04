// src/modules/auth-v2/auth-v2.middleware.js
// ─────────────────────────────────────────────
// Token-only middleware.
// Reads ONLY from: Authorization: Bearer <token>
// Does NOT touch cookies at all.
// ─────────────────────────────────────────────
import jwt from "jsonwebtoken";
import { getConnection } from "../../config/db.js";
import oracledb from "oracledb";
import { getUserEffectivePermissions } from "../user-management/user-management.service.js";

// ─────────────────────────────────────────────
// protectRouteV2
// ─────────────────────────────────────────────
export const protectRouteV2 = async (req, res, next) => {
  let connection;
  try {
    // 1. Extract Bearer token — no cookie fallback
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Access denied. Provide a Bearer token in Authorization header.",
      });
    }
    const token = authHeader.split(" ")[1];

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired. Please login again." });
      }
      return res.status(401).json({ error: "Invalid token." });
    }

    // 3. DB check — user still exists and is active
    try {
      connection = await getConnection();

      const result = await connection.execute(
        `SELECT ID, USERNAME, STATUS, EMPLOYEE_ID
         FROM USERS WHERE ID = :id`,
        { id: decoded.id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "User no longer exists." });
      }

      const user = result.rows[0];

      if (user.STATUS !== "ACTIVE") {
        return res.status(403).json({ error: "Account is inactive or suspended." });
      }

      // 4. Fresh permissions from DB (never stale)
      const permRows = await getUserEffectivePermissions(user.ID);
      const permissions = permRows.map((p) => p.PERMISSION_CODE);

      req.user = {
        id:          user.ID,
        username:    user.USERNAME,
        employee_id: user.EMPLOYEE_ID,
        roles:       decoded.roles || [],
        permissions,
      };
    } finally {
      if (connection) await connection.close().catch(console.error);
    }

    next();
  } catch (error) {
    console.error("❌ protectRouteV2 error:", error);
    return res.status(500).json({ error: "Authentication failed." });
  }
};

// ─────────────────────────────────────────────
// authorizeRolesV2  (same logic, just renamed for clarity)
// ─────────────────────────────────────────────
export const authorizeRolesV2 = (...allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasRole = userRoles.some((role) =>
      allowedRoles.map((r) => r.toUpperCase()).includes(role.toUpperCase())
    );
    if (!hasRole) {
      return res.status(403).json({
        error: `Access denied. Required roles: [${allowedRoles.join(", ")}]. Your roles: [${userRoles.join(", ")}]`,
      });
    }
    next();
  };
};

// ─────────────────────────────────────────────
// authorizePermissionsV2
//
// Default mode: ALL permissions required
// Pass { mode: "ANY" } as last arg to require only one match
//
// Usage:
//   router.post("/pay", protectRouteV2, authorizePermissionsV2("PAY_PROCESS_SALARY"), handler)
//   router.get("/rep", protectRouteV2, authorizePermissionsV2("REP_VIEW_ORG", "REP_VIEW_PAY", { mode: "ANY" }), handler)
// ─────────────────────────────────────────────
export const authorizePermissionsV2 = (...requiredPerms) => {
  let mode = "ALL";
  let perms = requiredPerms;

  if (
    requiredPerms.length > 0 &&
    typeof requiredPerms[requiredPerms.length - 1] === "object"
  ) {
    const opts = requiredPerms[requiredPerms.length - 1];
    mode = opts.mode?.toUpperCase() === "ANY" ? "ANY" : "ALL";
    perms = requiredPerms.slice(0, -1);
  }

  return (req, res, next) => {
    const userPerms = req.user?.permissions || [];

    const granted =
      mode === "ANY"
        ? perms.some((p) => userPerms.includes(p))
        : perms.every((p) => userPerms.includes(p));

    if (!granted) {
      return res.status(403).json({
        error: `Access denied. Required permissions (${mode}): [${perms.join(", ")}]`,
      });
    }
    next();
  };
};