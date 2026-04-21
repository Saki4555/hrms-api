// src/modules/hr-supervisor-lite/controller.js
import { searchSupervisorsLite } from "./supervisor-lite.service.js";

export const getSupervisorsLite = async (req, res) => {
  try {
    const searchTerm = (req.query.q ?? "").trim();

    if (!searchTerm) {
      return res.json({ data: [] });
    }

    const data = await searchSupervisorsLite(searchTerm);
    res.json({ data });
  } catch (error) {
    console.error("Lite supervisor search failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search supervisors",
      error: error.message,
    });
  }
};