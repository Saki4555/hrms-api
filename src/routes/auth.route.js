import express from "express";
import { login, logout, register } from "../controllers/auth.controller.js";
//  import {  authorizeRoles } from "../middleware/auth.middleware.js";
 import jwt from "jsonwebtoken";

const router = express.Router();

// ── Public Routes ────────────────────────────
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// ── Protected: যেকোনো login করা user ──────────
router.get("/me", (req, res) => {
  try {
    const token =
      req.cookies?.jwt ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({ error: "Token নেই" });
    }

   

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      status: "success",
      data: {
        user: {
          id: decoded.id,
          username: decoded.username,
          employee_id: decoded.employee_id,
          roles: decoded.roles,
        },
      },
    });
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
});

// // ── Admin only ────────────────────────────────
// router.get(
//   "/admin/dashboard",

//   authorizeRoles("ADMIN"),
//   (req, res) => {
//     res.json({ status: "success", message: "Admin dashboard data" });
//   }
// );

// // // ── HR Manager অথবা Admin ────────────────────
// router.get(
//   "/hr/employees",
 
//   authorizeRoles("ADMIN", "HR_MANAGER"),
//   (req, res) => {
//     res.json({ status: "success", message: "HR employee list data" });
//   }
// );

// // // ── Employee only ─────────────────────────────
// router.get(
//   "/employee/profile",
 
//   authorizeRoles("EMPLOYEE"),
//   (req, res) => {
//     res.json({ status: "success", message: "Employee profile data" });
//   }
// );

export default router;