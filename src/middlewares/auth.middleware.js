// E:\Web_Dev\JOB\revinns-limited\hrms-api\src\middlewares\auth.middleware.js
import jwt from "jsonwebtoken";
import { getConnection } from "../config/db.js";
import oracledb from "oracledb";
import { getUserEffectivePermissions } from "../modules/user-management/user-management.service.js";

// ─────────────────────────────────────────────
// protectRoute  (updated: now loads permissions)
// ─────────────────────────────────────────────
export const protectRoute = async (req, res, next) => {
  let connection;
  try {
    const token =
      req.cookies?.jwt ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired. Please login again." });
      }
      return res.status(401).json({ error: "Invalid token." });
    }

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

      // Load effective permissions (direct + via roles) from DB.
      // This always reflects the current state — no stale JWT data.
      const permRows = await getUserEffectivePermissions(user.ID);
      const permissions = permRows.map((p) => p.PERMISSION_CODE);

      req.user = {
        id:          user.ID,
        username:    user.USERNAME,
        employee_id: user.EMPLOYEE_ID,
        roles:       decoded.roles || [],   // still available for authorizeRoles()
        permissions,                         // ← new: ["EMP_VIEW_ALL", "PAY_PROCESS_SALARY", ...]
      };
    } finally {
      if (connection) await connection.close().catch(console.error);
    }

    next();
  } catch (error) {
    console.error("❌ protectRoute error:", error);
    return res.status(500).json({ error: "Authentication failed." });
  }
};

// ─────────────────────────────────────────────
// authorizeRoles  (unchanged — still available)
// ─────────────────────────────────────────────
export const authorizeRoles = (...allowedRoles) => {
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
// authorizePermissions  ← new
//
// Usage (require ALL listed permissions):
//   router.post("/payroll", protectRoute, authorizePermissions("PAY_PROCESS_SALARY"), handler)
//
// Usage (require ANY one of the listed permissions):
//   router.get("/reports", protectRoute, authorizePermissions("REP_VIEW_ORG", "REP_VIEW_PAY"), handler)
//
// The second argument controls the mode (default: "ALL").
// ─────────────────────────────────────────────
export const authorizePermissions = (...requiredPerms) => {
  // Optional last argument: { mode: "ANY" | "ALL" }
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