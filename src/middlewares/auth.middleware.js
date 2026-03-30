import jwt from "jsonwebtoken";
import { getConnection } from "../config/db.js";
import oracledb from "oracledb";

// ─────────────────────────────────────────────
// protectRoute — only authenticated users can pass
// ─────────────────────────────────────────────
export const protectRoute = async (req, res, next) => {
  try {
    // Extract token from cookie or Authorization header (Bearer <token>)
    const token =
      req.cookies?.jwt ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided" });
    }

    // Verify JWT signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired. Please login again." });
      }
      return res.status(401).json({ error: "Invalid token." });
    }

    // Check the latest user status from DB
    // This catches cases where user was deactivated after token was issued
    let connection;
    try {
      connection = await getConnection();

      const result = await connection.execute(
        `SELECT ID, USERNAME, STATUS, EMPLOYEE_ID
         FROM HCM.USERS WHERE ID = :id`,
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

      // Attach user info to req — available in all subsequent middlewares and controllers
      req.user = {
        id: user.ID,
        username: user.USERNAME,
        employee_id: user.EMPLOYEE_ID,
        roles: decoded.roles || [], // roles come from the JWT token payload
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
// authorizeRoles(...roles) — restrict route to specific roles
//
// Usage:
//   router.get("/admin",    protectRoute, authorizeRoles("ADMIN"), handler)
//   router.get("/hr",       protectRoute, authorizeRoles("ADMIN", "HR_MANAGER"), handler)
//   router.get("/profile",  protectRoute, handler)  // no role restriction
// ─────────────────────────────────────────────
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];

    // Pass if the user has at least one of the allowed roles (case-insensitive)
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