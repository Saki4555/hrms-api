// E:\Web_Dev\JOB\revinns-limited\hrms-api\src\routes\auth.route.js
import express from "express";
import { login, logout, register } from "../controllers/auth.controller.js";
//  import {  authorizeRoles } from "../middleware/auth.middleware.js";

import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ── Public Routes ────────────────────────────
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// ── Protected: যেকোনো login করা user ──────────
router.get("/me", protectRoute, async (req, res) => {
  try {
    // protectRoute already loaded permissions into req.user
    // so just return req.user directly — no need to decode JWT again
    return res.json({
      status: "success",
      data: {
        user: {
          id:          req.user.id,
          username:    req.user.username,
          employee_id: req.user.employee_id,
          roles:       req.user.roles,
          permissions: req.user.permissions, // ← already loaded by protectRoute
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
