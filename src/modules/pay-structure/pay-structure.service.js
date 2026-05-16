// src/modules/pay-structure/pay-structure.service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// ── GET ALL ──────────────────────────────────────────────────────────────────
export const getPayStructures = async () => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT PS.PAY_STRUCTURE_ID, PS.NAME, PS.DESCRIPTION,
              PS.CREATED_BY, PS.CREATED_DATE,
              COUNT(PSC.COMPONENT_ID) AS COMPONENT_COUNT
         FROM HR_PAY_STRUCTURE PS
         LEFT JOIN HR_PAY_STRUCTURE_COMPONENT PSC
           ON PSC.PAY_STRUCTURE_ID = PS.PAY_STRUCTURE_ID
        GROUP BY PS.PAY_STRUCTURE_ID, PS.NAME, PS.DESCRIPTION,
                 PS.CREATED_BY, PS.CREATED_DATE
        ORDER BY PS.NAME`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
};

// ── GET ONE WITH COMPONENTS ──────────────────────────────────────────────────
export const getPayStructureById = async (id) => {
  const conn = await getConnection();
  try {
    // Structure
    const structResult = await conn.execute(
      `SELECT PAY_STRUCTURE_ID, NAME, DESCRIPTION, CREATED_BY, CREATED_DATE
         FROM HR_PAY_STRUCTURE
        WHERE PAY_STRUCTURE_ID = :ID`,
      { ID: parseInt(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (structResult.rows.length === 0) return null;
    const structure = structResult.rows[0];

    // Components linked to this structure
    const compResult = await conn.execute(
      `SELECT PC.COMPONENT_ID, PC.CODE, PC.NAME, PC.TYPE,
              PC.CALCULATION_FORMULA, PC.TAXABLE,
              PSC.DEFAULT_VALUE, PSC.COMPONENT_ORDER
         FROM HR_PAY_STRUCTURE_COMPONENT PSC
         JOIN HR_PAY_COMPONENT PC ON PC.COMPONENT_ID = PSC.COMPONENT_ID
        WHERE PSC.PAY_STRUCTURE_ID = :ID
        ORDER BY PSC.COMPONENT_ORDER`,
      { ID: parseInt(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return { ...structure, components: compResult.rows };
  } finally {
    await conn.close();
  }
};

// ── CREATE ───────────────────────────────────────────────────────────────────
export const createPayStructure = async ({ name, description, created_by }) => {
  const conn = await getConnection();
  try {
    const existing = await conn.execute(
      `SELECT PAY_STRUCTURE_ID FROM HR_PAY_STRUCTURE WHERE UPPER(NAME) = UPPER(:NAME)`,
      { NAME: name },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length > 0) throw new Error(`Pay structure '${name}' already exists.`);

    const result = await conn.execute(
      `INSERT INTO HR_PAY_STRUCTURE (NAME, DESCRIPTION, CREATED_BY)
       VALUES (:NAME, :DESCRIPTION, :CREATED_BY)
       RETURNING PAY_STRUCTURE_ID INTO :ID`,
      {
        NAME:        name.trim(),
        DESCRIPTION: description ?? null,
        CREATED_BY:  created_by ?? "SYSTEM",
        ID:          { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );
    return { pay_structure_id: result.outBinds.ID[0] };
  } finally {
    await conn.close();
  }
};

// ── UPDATE ───────────────────────────────────────────────────────────────────
export const updatePayStructure = async (id, { name, description, updated_by }) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HR_PAY_STRUCTURE
          SET NAME         = :NAME,
              DESCRIPTION  = :DESCRIPTION,
              UPDATED_BY   = :UPDATED_BY,
              UPDATED_DATE = SYSTIMESTAMP
        WHERE PAY_STRUCTURE_ID = :ID`,
      {
        NAME:        name.trim(),
        DESCRIPTION: description ?? null,
        UPDATED_BY:  updated_by ?? "SYSTEM",
        ID:          parseInt(id),
      },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) throw new Error("Pay structure not found.");
    return { rows_affected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

// ── DELETE ───────────────────────────────────────────────────────────────────
export const deletePayStructure = async (id) => {
  const conn = await getConnection();
  try {
    // Check if assigned to any employee
    const used = await conn.execute(
      `SELECT ASSIGNMENT_ID FROM HR_EMP_ASSIGNMENT
        WHERE PAY_STRUCTURE_ID = :ID AND STATUS = 1 AND ROWNUM = 1`,
      { ID: parseInt(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (used.rows.length > 0) {
      throw new Error("Cannot delete — this structure is assigned to active employees.");
    }

    // Delete linked components first
    await conn.execute(
      `DELETE FROM HR_PAY_STRUCTURE_COMPONENT WHERE PAY_STRUCTURE_ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: false }
    );

    const result = await conn.execute(
      `DELETE FROM HR_PAY_STRUCTURE WHERE PAY_STRUCTURE_ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: false }
    );
    if (result.rowsAffected === 0) throw new Error("Pay structure not found.");

    await conn.commit();
    return { rows_affected: result.rowsAffected };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURE COMPONENTS (link/unlink)
// ─────────────────────────────────────────────────────────────────────────────

// ── ADD COMPONENT TO STRUCTURE ───────────────────────────────────────────────
export const addComponentToStructure = async (structureId, { component_id, default_value, component_order }) => {
  const conn = await getConnection();
  try {
    // Check duplicate
    const existing = await conn.execute(
      `SELECT COMPONENT_ID FROM HR_PAY_STRUCTURE_COMPONENT
        WHERE PAY_STRUCTURE_ID = :SID AND COMPONENT_ID = :CID`,
      { SID: parseInt(structureId), CID: parseInt(component_id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length > 0) {
      throw new Error("This component is already added to the structure.");
    }

    // Auto order if not provided
    let order = component_order;
    if (!order) {
      const maxOrder = await conn.execute(
        `SELECT NVL(MAX(COMPONENT_ORDER), 0) AS MAX_ORDER
           FROM HR_PAY_STRUCTURE_COMPONENT
          WHERE PAY_STRUCTURE_ID = :SID`,
        { SID: parseInt(structureId) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      order = (maxOrder.rows[0]?.MAX_ORDER ?? 0) + 1;
    }

    await conn.execute(
      `INSERT INTO HR_PAY_STRUCTURE_COMPONENT
             (PAY_STRUCTURE_ID, COMPONENT_ID, COMPONENT_ORDER, DEFAULT_VALUE)
       VALUES (:SID, :CID, :ORDER, :VALUE)`,
      {
        SID:   parseInt(structureId),
        CID:   parseInt(component_id),
        ORDER: order,
        VALUE: default_value ?? 0,
      },
      { autoCommit: true }
    );
    return { success: true };
  } finally {
    await conn.close();
  }
};

// ── UPDATE COMPONENT IN STRUCTURE (amount / order) ───────────────────────────
export const updateComponentInStructure = async (structureId, componentId, { default_value, component_order }) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HR_PAY_STRUCTURE_COMPONENT
          SET DEFAULT_VALUE   = :VALUE,
              COMPONENT_ORDER = :ORDER
        WHERE PAY_STRUCTURE_ID = :SID
          AND COMPONENT_ID     = :CID`,
      {
        VALUE: default_value ?? 0,
        ORDER: component_order ?? 1,
        SID:   parseInt(structureId),
        CID:   parseInt(componentId),
      },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) throw new Error("Component not found in this structure.");
    return { rows_affected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};

// ── REMOVE COMPONENT FROM STRUCTURE ─────────────────────────────────────────
export const removeComponentFromStructure = async (structureId, componentId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM HR_PAY_STRUCTURE_COMPONENT
        WHERE PAY_STRUCTURE_ID = :SID
          AND COMPONENT_ID     = :CID`,
      { SID: parseInt(structureId), CID: parseInt(componentId) },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) throw new Error("Component not found in this structure.");
    return { rows_affected: result.rowsAffected };
  } finally {
    await conn.close();
  }
};