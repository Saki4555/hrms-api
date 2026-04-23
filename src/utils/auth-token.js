// src\utils\auth-token.js
import jwt from "jsonwebtoken";

// roles = string array, e.g. ["ADMIN", "HR_MANAGER"]
export const generateToken = (userId, userName, roles = [], employeeId, res) => {
  const payload = { id: userId, username: userName, employee_id: employeeId, roles };

  const token = jwt.sign(payload,  process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // sameSite: "strict",
      sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 দিন
  });
//   res.cookie("jwt", token, {
//   httpOnly: true,
//   secure: true,        // tunnels are always https
//   sameSite: "none",    // allows cross-origin cookie
//   maxAge: 1000 * 60 * 60 * 24 * 7,
// });

  return token;
};