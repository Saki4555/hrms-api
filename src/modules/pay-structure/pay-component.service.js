// src/modules/pay-structure/pay-component.service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// ── GET ALL ──────────────────────────────────────────────────────────────────
export const getPayComponents = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT COMPONENT_ID, CODE, NAME, TYPE, CALCULATION_FORMULA,
              TAXABLE, IS_PENULTIMATE, CREATED_BY, CREATED_DATE
         FROM HR_PAY_COMPONENT
        ORDER BY TYPE, NAME`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ── GET ONE ──────────────────────────────────────────────────────────────────
export const getPayComponentById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT COMPONENT_ID, CODE, NAME, TYPE, CALCULATION_FORMULA,
              TAXABLE, IS_PENULTIMATE, CREATED_BY, CREATED_DATE
         FROM HR_PAY_COMPONENT
        WHERE COMPONENT_ID = :ID`,
      { ID: parseInt(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

// ── CREATE ───────────────────────────────────────────────────────────────────
export const createPayComponent = async ({ code, name, type, calculation_formula, taxable, is_penultimate, created_by }) => {
  const conn = await getConnection();
  try {
    // Check duplicate code
    const existing = await conn.execute(
      `SELECT COMPONENT_ID FROM HR_PAY_COMPONENT WHERE UPPER(CODE) = UPPER(:CODE)`,
      { CODE: code },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length > 0) throw new Error(`Component code '${code}' already exists.`);

    const result = await conn.execute(
      `INSERT INTO HR_PAY_COMPONENT
             (CODE, NAME, TYPE, CALCULATION_FORMULA, TAXABLE, IS_PENULTIMATE, CREATED_BY)
       VALUES (:CODE, :NAME, :TYPE, :FORMULA, :TAXABLE, :IS_PENULTIMATE, :CREATED_BY)
       RETURNING COMPONENT_ID INTO :ID`,
      {
        CODE:           code.toUpperCase().trim(),
        NAME:           name.trim(),
        TYPE:           type.toUpperCase(),
        FORMULA:        calculation_formula ?? "FIXED",
        TAXABLE:        taxable ?? "YES",
        IS_PENULTIMATE: is_penultimate ?? 0,
        CREATED_BY:     created_by ?? "SYSTEM",
        ID:             { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );
    return { component_id: result.outBinds.ID[0] };
  } finally {
    await conn.close();
  }
};

// ── UPDATE ───────────────────────────────────────────────────────────────────
export const updatePayComponent = async (id, { name, type, calculation_formula, taxable, is_penultimate, updated_by }) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HR_PAY_COMPONENT
          SET NAME                = :NAME,
              TYPE                = :TYPE,
              CALCULATION_FORMULA = :FORMULA,
              TAXABLE             = :TAXABLE,
              IS_PENULTIMATE      = :IS_PENULTIMATE,
              UPDATED_BY          = :UPDATED_BY,
              UPDATED_DATE        = SYSTIMESTAMP
        WHERE COMPONENT_ID = :ID`,
      {
        NAME:           name.trim(),
        TYPE:           type.toUpperCase(),
        FORMULA:        calculation_formula ?? "FIXED",
        TAXABLE:        taxable ?? "YES",
        IS_PENULTIMATE: is_penultimate ?? 0,
        UPDATED_BY:     updated_by ?? "SYSTEM",
        ID:             parseInt(id),
      },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) throw new Error("Component not found.");
    return { rows_affected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

// ── DELETE ───────────────────────────────────────────────────────────────────
export const deletePayComponent = async (id) => {
  const conn = await getConnection();
  try {
    // Check if used in any structure
    const used = await conn.execute(
      `SELECT PAY_STRUCTURE_ID FROM HR_PAY_STRUCTURE_COMPONENT
        WHERE COMPONENT_ID = :ID AND ROWNUM = 1`,
      { ID: parseInt(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (used.rows.length > 0) {
      throw new Error("Cannot delete — this component is used in one or more pay structures.");
    }

    const result = await conn.execute(
      `DELETE FROM HR_PAY_COMPONENT WHERE COMPONENT_ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) throw new Error("Component not found.");
    return { rows_affected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};