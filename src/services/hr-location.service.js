
import { getConnection } from "../config/db.js";

// export const createLocation = async (data) => {
//   const conn = await getConnection();
//   const sql = `
//     INSERT INTO HR_LOCATION ( LOCATION_NAME, STATUS)
//     VALUES ( :name, :1)
//   `;
//   await conn.execute(sql, data, { autoCommit: true });
//   await conn.close();
// };

export const createLocation = async (data) => {
  let conn;
  try {
    conn = await getConnection();

    const sql = `
      INSERT INTO HR_LOCATION (LOCATION_NAME, STATUS)
      VALUES (:name, 1)
    `;

    await conn.execute(
      sql,
      {
        name: data.name,
       
      },
       { autoCommit: true }
    );

  } finally {
    if (conn) await conn.close();
  }
};


export const updateLocation = async (id, data) => {
  const conn = await getConnection();
  const sql = `
    UPDATE HR_LOCATION 
    SET LOCATION_NAME = :name, STATUS = :status
    WHERE ID = :id
  `;
  await conn.execute(sql, { id, ...data }, { autoCommit: true });
  await conn.close();
};

export const softDeleteLocation = async (id) => {
  const conn = await getConnection();
  const sql = `
    UPDATE HR_LOCATION 
    SET STATUS = 0 
    WHERE ID = :id
  `;
  await conn.execute(sql, { id }, { autoCommit: true });
  await conn.close();
};


export const getAllLocations = async () => {
  const conn = await getConnection();
  const result = await conn.execute(`
    SELECT * FROM HR_LOCATION WHERE STATUS = 1
  `, [],
      { outFormat: 4002 },);
  await conn.close();
  return result.rows;
};

export const getLocation = async (id) => {
  const conn = await getConnection();
  const result = await conn.execute(`
    SELECT * FROM HR_LOCATION 
    WHERE ID = :id AND STATUS = 1
  `, { id },{ outFormat: 4002 },);
  await conn.close();
  return result.rows[0];
};

