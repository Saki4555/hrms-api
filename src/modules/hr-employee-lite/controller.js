// src\modules\hr-employee-lite\controller.js

import { searchEmployeesLite } from "./service.js";


export const getEmployeesLite = async (req, res) => {
  try {
    const searchTerm = (req.query.q ?? "").trim();

    if (!searchTerm) {
      return res.json({ data: [] });
    }

    const data = await searchEmployeesLite(searchTerm);
    res.json({ data });
  } catch (error) {
    console.error("Lite employee search failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search employees",
      error: error.message,
    });
  }
};