// seedRole.js

import { getConnection, connectDB } from "./src/config/db.js";

export const seedRoles = async () => {
  let conn;
  try {
    conn = await getConnection();

    const rolesData = [
      { name: 'Admin', desc: 'Full system configuration, security access, and global settings.' },
      { name: 'HR', desc: 'Management of Employee lifecycle, Payroll processing, and Attendance.' },
      { name: 'Supervisor', desc: 'Management and approval of team-level attendance, leaves, and performance.' },
      { name: 'Employee', desc: 'Access to personal profile, payslips, and self-service requests.' }
    ];

    console.log("🚀 Processing System Roles...");

    for (const r of rolesData) {
      const checkSql = `SELECT ID FROM ROLES WHERE ROLE_NAME = :1`;
      const checkRes = await conn.execute(checkSql, [r.name]);

      if (checkRes.rows.length === 0) {
        // Removed IS_SYSTEM_ROLE from the query
        const insertSql = `
          INSERT INTO ROLES (ROLE_NAME, DESCRIPTION) 
          VALUES (:1, :2)
        `;
        await conn.execute(insertSql, [r.name, r.desc]);
        console.log(`  + Role '${r.name}' inserted successfully.`);
      } else {
        console.log(`  - Role '${r.name}' already exists. Skipping.`);
      }
    }

    await conn.commit();
    console.log("✅ Roles seeding completed.");
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("❌ Critical Role Seed Failure:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};

const run = async () => {
  try {
    await connectDB();
    await seedRoles();
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  }
};

run();