// import jwt from "jsonwebtoken";
// import { getConnection } from "../config/db.js";
// import oracledb from "oracledb";

// ─────────────────────────────────────────────
// protectRoute — শুধু login করা user যেতে পারবে
// ─────────────────────────────────────────────
// export const protectRoute = async (req, res, next) => {
//   try {
//     // Token কুকি থেকে অথবা Authorization header থেকে নাও
//     const token =
//       req.cookies?.jwt ||
//       (req.headers.authorization?.startsWith("Bearer ")
//         ? req.headers.authorization.split(" ")[1]
//         : null);

//     if (!token) {
//       return res.status(401).json({ error: "Login , not found token " });
//     }

//     // Token verify করো
//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch {
//       return res.status(401).json({ error: "Token is expired" });
//     }

//     // DB থেকে user এর সর্বশেষ অবস্থা চেক করো
//     let connection;
//     try {
//       connection = await getConnection();

//       const result = await connection.execute(
//         `SELECT ID, USERNAME, STATUS, EMPLOYEE_ID
//          FROM HCM.USERS WHERE ID = :id`,
//         { id: decoded.id },
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );

//       if (result.rows.length === 0) {
//         return res.status(401).json({ error: "not found user" });
//       }

//       const user = result.rows[0];

//       if (user.STATUS !== "ACTIVE") {
//         return res.status(403).json({ error: "Account inactive or suspended" });
//       }

//       // req-এ user ও roles রাখো — পরের middleware/controller ব্যবহার করবে
//       req.user = {
//         id: user.ID,
//         username: user.USERNAME,
//         employee_id: user.EMPLOYEE_ID,
//         roles: decoded.roles || [], // token থেকে roles
//       };
//     } finally {
//       if (connection) await connection.close().catch(console.error);
//     }

//     next();
//   } catch (error) {
//     console.error("❌ protectRoute error:", error);
//     return res.status(500).json({ error: "Authentication failed" });
//   }
// };

// ─────────────────────────────────────────────
// authorizeRoles(...roles) — নির্দিষ্ট role চেক
//
// ব্যবহার:
//   router.get("/admin", protectRoute, authorizeRoles("ADMIN"), handler)
//   router.get("/hr",    protectRoute, authorizeRoles("ADMIN", "HR_MANAGER"), handler)
// ─────────────────────────────────────────────
// export const authorizeRoles = (...allowedRoles) => {
//   return (req, res, next) => {
//     const userRoles = req.user?.roles || [];

//     // allowedRoles-এর মধ্যে user-এর যেকোনো একটা role থাকলেই চলবে
//     const hasRole = userRoles.some((role) =>
//       allowedRoles.map((r) => r.toUpperCase()).includes(role.toUpperCase())
//     );

//     if (!hasRole) {
//       return res.status(403).json({
//         error: `that route is not need for role needed: [${allowedRoles.join(", ")}]`,
//       });
//     }

//     next();
//   };
// };