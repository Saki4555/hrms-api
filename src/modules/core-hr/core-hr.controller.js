import {
  transferEmployee,
  processIncrement,
  endEmployment,
  reinstateEmployee,
  getEmployeeAuditHistory,
} from "./core-hr.service.js";

/* ─────────────────────────────────────────────────────────────
   HELPER — send a clean error response
───────────────────────────────────────────────────────────── */
const handleError = (res, err) => {
  console.error("[core-hr]", err.message);
  const status = err.message.startsWith("No active assignment") ? 404 : 400;
  res.status(status).json({ success: false, message: err.message });
};

/* ─────────────────────────────────────────────────────────────
   POST /core-hr/transfer/:personId

   Body:
   {
     "COMPANY_ID":     2,
     "OU_ID":          null,
     "ORG_ID":         5,
     "POSITION_ID":    12,
     "GRADE_ID":       3,
     "EFFECTIVE_DATE": "2025-06-01",
     "END_DATE":       null,          // optional — open-ended transfer
     "CHANGED_BY":     "admin_user",
     "REMARKS":        "Transferred to Dhaka branch"
   }
───────────────────────────────────────────────────────────── */
export const transferEmployeeController = async (req, res) => {
  const { personId } = req.params;
  const { COMPANY_ID, ORG_ID, POSITION_ID, GRADE_ID, EFFECTIVE_DATE, CHANGED_BY } = req.body;

  // Required field validation
  const missing = [];
  if (!COMPANY_ID)     missing.push("COMPANY_ID");
  if (!EFFECTIVE_DATE) missing.push("EFFECTIVE_DATE");
  if (!CHANGED_BY)     missing.push("CHANGED_BY");

  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  try {
    const result = await transferEmployee(Number(personId), req.body);
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /core-hr/increment/:personId

   Body:
   {
     "NEW_GRADE_ID":    4,             // optional — omit if only position changes
     "NEW_POSITION_ID": 15,            // optional — omit if only grade changes
     "ACTION":          "PROMOTION",   // 'INCREMENT' | 'PROMOTION'  (default: INCREMENT)
     "EFFECTIVE_DATE":  "2025-07-01",
     "CHANGED_BY":      "hr_manager",
     "REMARKS":         "Annual promotion"
   }
───────────────────────────────────────────────────────────── */
export const processIncrementController = async (req, res) => {
  const { personId } = req.params;
  const { NEW_GRADE_ID, NEW_POSITION_ID, EFFECTIVE_DATE, CHANGED_BY } = req.body;

  if (!NEW_GRADE_ID && !NEW_POSITION_ID) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one of NEW_GRADE_ID or NEW_POSITION_ID.",
    });
  }

  if (!EFFECTIVE_DATE || !CHANGED_BY) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: EFFECTIVE_DATE, CHANGED_BY",
    });
  }

  try {
    const result = await processIncrement(Number(personId), req.body);
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /core-hr/end-employment/:personId

   Body:
   {
     "TYPE":           "RESIGNATION",   // 'RESIGNATION' | 'TERMINATION' | 'RETIREMENT'
     "EFFECTIVE_DATE": "2025-08-31",
     "CHANGED_BY":     "hr_manager",
     "REMARKS":        "Employee submitted resignation letter"
   }
───────────────────────────────────────────────────────────── */
export const endEmploymentController = async (req, res) => {
  const { personId } = req.params;
  const { TYPE, EFFECTIVE_DATE, CHANGED_BY } = req.body;

  const missing = [];
  if (!TYPE)           missing.push("TYPE");
  if (!EFFECTIVE_DATE) missing.push("EFFECTIVE_DATE");
  if (!CHANGED_BY)     missing.push("CHANGED_BY");

  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  try {
    const result = await endEmployment(Number(personId), req.body);
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /core-hr/reinstate/:personId

   Body:
   {
     "EFFECTIVE_DATE": "2025-09-01",
     "CHANGED_BY":     "hr_manager",
     "REMARKS":        "Employee rejoined after leave of absence"
   }
───────────────────────────────────────────────────────────── */
export const reinstateEmployeeController = async (req, res) => {
  const { personId } = req.params;
  const { EFFECTIVE_DATE, CHANGED_BY } = req.body;

  const missing = [];
  if (!EFFECTIVE_DATE) missing.push("EFFECTIVE_DATE");
  if (!CHANGED_BY)     missing.push("CHANGED_BY");

  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  try {
    const result = await reinstateEmployee(Number(personId), req.body);
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /core-hr/audit-history/:personId?page=1&limit=10
───────────────────────────────────────────────────────────── */
export const getEmployeeAuditHistoryController = async (req, res) => {
  const { personId } = req.params;
  const { page, limit } = req.query;

  try {
    const result = await getEmployeeAuditHistory(Number(personId), { page, limit });
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err);
  }
};