import { getConnection } from "../config/db.js";

export const insertHrOrg = async (data) => {
  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `INSERT INTO HR_ORG (
  NAME, PARENT_ORG_ID, ORG_TYPE_ID,
  LOCATION, COST_CENTER_ID, CREATED_BY,
  CREATED_DATE, STATUS
)
VALUES (
  :NAME, :PARENT_ORG_ID, :ORG_TYPE_ID,
  :LOCATION, :COST_CENTER_ID, :CREATED_BY,
  SYSTIMESTAMP, :STATUS
)
`,
      data,
      { autoCommit: true }
    );

    return result;
  } finally {
    await conn.close();
  }
};

export const updateHrOrg = async (id, data) => {
  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `UPDATE HR_ORG SET
        NAME = :NAME,
        PARENT_ORG_ID = :PARENT_ORG_ID,
        ORG_TYPE_ID = :ORG_TYPE_ID,
        LOCATION = :LOCATION,
        COST_CENTER_ID = :COST_CENTER_ID,
        UPDATED_BY = :UPDATED_BY,
        UPDATED_DATE = SYSTIMESTAMP,
        STATUS = :STATUS
       WHERE ID = :ID`,
      { ...data, ID: id },
      { autoCommit: true }
    );

    return result;
  } finally {
    await conn.close();
  }
};

export const deleteHrOrg = async (id, updatedBy) => {
  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `UPDATE HR_ORG
       SET STATUS = 0,
           UPDATED_BY = :UPDATED_BY,
           UPDATED_DATE = SYSTIMESTAMP
       WHERE ID = :ID`,
      {
        ID: id,
        UPDATED_BY: updatedBy
      },
      { autoCommit: true }
    );
    
    return result;
  } finally {
    await conn.close();
  }
};


// export const deleteHrOrg = async (id) => {
//   const conn = await getConnection();

//   try {
//     const result = await conn.execute(
//       `DELETE FROM HR_ORG WHERE ID = :ID`,
//       { ID: id },
//       { autoCommit: true }
//     );

//     return result;
//   } finally {
//     await conn.close();
//   }
// };

// export const getHrOrgList = async () => {
//   const conn = await getConnection();

//   const sql = `
//     SELECT o.*, t.org_type
//     FROM hr_org o
//     LEFT JOIN hr_org_type t ON o.org_type_id = t.id
//     WHERE o.org_type_id = (
//       SELECT id FROM hr_org_type WHERE org_type = 'Cost Center'
//     )
//   `;

//   const result = await conn.execute(sql, [], { outFormat: 4002 });
//   await conn.close();

//   return result.rows;
// };

export const getHrOrgList = async () => {
  const conn = await getConnection();

  const sql = `
    SELECT 
      o.*,
      t.org_type,
      p.name AS parent_org_name,
      c.name AS cost_center_name
    FROM hr_org o
    LEFT JOIN hr_org_type t ON o.org_type_id = t.id
    LEFT JOIN hr_org p ON o.parent_org_id = p.id
    LEFT JOIN hr_org c ON o.cost_center_id = c.id
  `;

  const result = await conn.execute(sql, [], { outFormat: 4002 });
  await conn.close();

  return result.rows;
};







// export const getHrOrgList = async () => {
//   const conn = await getConnection();

//   const sql = `
//     SELECT o.*, t.org_type
//     FROM hr_org o
//     LEFT JOIN hr_org_type t ON o.org_type_id = t.id
//   `;

//   const result = await conn.execute(sql, [], { outFormat: 4002 });
//   await conn.close();

//   return result.rows;
// };



// export const getHrOrgList = async () => {
//   const conn = await getConnection();

//   try {
//     const result = await conn.execute(
//       `SELECT * FROM HR_ORG 
//        WHERE STATUS = 1`,
//       [],
//       { outFormat: 4002 } // Object format
//     );

//     return result.rows;
//   } finally {
//     await conn.close();
//   }
// };
