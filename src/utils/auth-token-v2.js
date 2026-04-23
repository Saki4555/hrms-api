// src/utils/auth-token-v2.js
// ─────────────────────────────────────────────
// Token-only version — NO cookie is set.
// The client must store the token in localStorage / sessionStorage
// and send it back as:  Authorization: Bearer <token>
// ─────────────────────────────────────────────
import jwt from "jsonwebtoken";

/**
 * @param {number}   userId
 * @param {string}   userName
 * @param {string[]} roles       - e.g. ["ADMIN", "HR_MANAGER"]
 * @param {number}   employeeId
 * @returns {string} signed JWT
 */
export const generateTokenV2 = (userId, userName, roles = [], employeeId) => {
  const payload = {
    id: userId,
    username: userName,
    employee_id: employeeId,
    roles,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  return token; // caller is responsible for sending it in the response body
};