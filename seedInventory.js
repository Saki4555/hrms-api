// seedInventory.js
// ১. Inventory module insert
// ২. INVENTORY_VIEW permission insert
// ৩. "Inventory User" role তৈরি
// ৪. সেই role এ INVENTORY_VIEW assign
// Run: node seedInventory.js

import { getConnection, connectDB } from "./src/config/db.js";
import oracledb from "oracledb";

const run = async () => {
  let conn;
  try {
    console.log("🚀 Connecting to Oracle...");
    await connectDB();
    conn = await getConnection();

    // ── Step 1: Inventory module ──────────────────────────────────────────────
    let moduleId;
    const existingModule = await conn.execute(
      `SELECT ID FROM HCM.MODULES WHERE MODULE_NAME = :1`, ["Inventory"]
    );
    if (existingModule.rows.length > 0) {
      moduleId = existingModule.rows[0][0];
      console.log(`✓ Module 'Inventory' already exists → ID ${moduleId}`);
    } else {
      const res = await conn.execute(
        `INSERT INTO HCM.MODULES (MODULE_NAME, DESCRIPTION, SEQUENCE_NO)
         VALUES (:m_name, :m_desc, :m_seq)
         RETURNING ID INTO :returned_id`,
        {
          m_name:      "Inventory",
          m_desc:      "Inventory, items, item stocks and dispatch",
          m_seq:       13,
          returned_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        }
      );
      moduleId = res.outBinds.returned_id[0];
      console.log(`✅ Module 'Inventory' inserted → ID ${moduleId}`);
    }

    // ── Step 2: INVENTORY_VIEW permission ─────────────────────────────────────
    let permId;
    const existingPerm = await conn.execute(
      `SELECT ID FROM HCM.PERMISSIONS WHERE PERMISSION_CODE = :1`, ["INVENTORY_VIEW"]
    );
    if (existingPerm.rows.length > 0) {
      permId = existingPerm.rows[0][0];
      console.log(`✓ Permission 'INVENTORY_VIEW' already exists → ID ${permId}`);
    } else {
      const res = await conn.execute(
        `INSERT INTO HCM.PERMISSIONS (MODULE_ID, PERMISSION_CODE, PERMISSION_NAME, DESCRIPTION)
         VALUES (:mod_id, :p_code, :p_name, :p_desc)
         RETURNING ID INTO :returned_id`,
        {
          mod_id:      moduleId,
          p_code:      "INVENTORY_VIEW",
          p_name:      "View Inventory",
          p_desc:      "Access inventory list, items, item stocks and dispatch pages.",
          returned_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        }
      );
      permId = res.outBinds.returned_id[0];
      console.log(`✅ Permission 'INVENTORY_VIEW' inserted → ID ${permId}`);
    }

    // ── Step 3: "Inventory User" role তৈরি ────────────────────────────────────
    let roleId;
    const existingRole = await conn.execute(
      `SELECT ID FROM HCM.ROLES WHERE ROLE_NAME = :1`, ["Inventory User"]
    );
    if (existingRole.rows.length > 0) {
      roleId = existingRole.rows[0][0];
      console.log(`✓ Role 'Inventory User' already exists → ID ${roleId}`);
    } else {
      const res = await conn.execute(
        `INSERT INTO HCM.ROLES (ROLE_NAME, DESCRIPTION)
         VALUES (:r_name, :r_desc)
         RETURNING ID INTO :returned_id`,
        {
          r_name:      "Inventory User",
          r_desc:      "Access to inventory, items, item stocks and dispatch pages only.",
          returned_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        }
      );
      roleId = res.outBinds.returned_id[0];
      console.log(`✅ Role 'Inventory User' created → ID ${roleId}`);
    }

    // ── Step 4: INVENTORY_VIEW → "Inventory User" role এ assign ──────────────
    const alreadyAssigned = await conn.execute(
      `SELECT 1 FROM HCM.ROLE_PERMISSIONS WHERE ROLE_ID = :1 AND PERMISSION_ID = :2`,
      [roleId, permId]
    );
    if (alreadyAssigned.rows.length > 0) {
      console.log(`✓ INVENTORY_VIEW already assigned to 'Inventory User' role`);
    } else {
      await conn.execute(
        `INSERT INTO HCM.ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID, GRANTED_BY)
         VALUES (:1, :2, NULL)`,
        [roleId, permId]
      );
      console.log(`✅ INVENTORY_VIEW assigned to 'Inventory User' role`);
    }

    await conn.commit();
    console.log("\n🎉 Done! এখন User details → Roles tab → 'Inventory User' assign করুন।");

  } catch (err) {
    if (conn) await conn.rollback();
    console.error("❌ Failed:", err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.close();
    process.exit(0);
  }
};

run();