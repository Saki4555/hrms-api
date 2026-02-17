import { getConnection } from "../config/db.js";

export const createGrade = async (data) => {
  let conn;
  try {
    conn = await getConnection();

    const sql = `
      INSERT INTO HR_GRADE
      (GRADE, EFFECTIVE_START_DATE, EFFECTIVE_END_DATE, STATUS)
      VALUES
      (:grade, :startDate, :endDate, 1)
    `;

    await conn.execute(
      sql,
      {
        grade: data.grade,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
      { autoCommit: true }
    );
  } finally {
    if (conn) await conn.close();
  }
};




export const updateGrade = async (id, data) => {
  const conn = await getConnection();

  const sql = `
    UPDATE HR_GRADE
    SET GRADE = :grade,
        EFFECTIVE_START_DATE = :startDate,
        EFFECTIVE_END_DATE = :endDate
    WHERE ID = :id
      AND STATUS = 1
  `;

  await conn.execute(
    sql,
    {
      id,
      grade: data.grade,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
    { autoCommit: true }
  );

  await conn.close();
};

export const softDeleteGrade = async (id) => {
  const conn = await getConnection();

  const sql = `
    UPDATE HR_GRADE
    SET STATUS = 0
    WHERE ID = :id
  `;

  await conn.execute(sql, { id }, { autoCommit: true });
  await conn.close();
};


export const getGradeById = async (id) => {
  const conn = await getConnection();

  const result = await conn.execute(
    `
    SELECT *
    FROM HR_GRADE
    WHERE ID = :id
      AND STATUS = 1
    `,
    { id },{outFormat: 4002}
  );

  await conn.close();
  return result.rows[0];
};

export const getAllGrades = async () => {
  const conn = await getConnection();

  const result = await conn.execute(`
    SELECT *
    FROM HR_GRADE
    WHERE STATUS = 1
    ORDER BY ID
  `, [], {outFormat: 4002});

  await conn.close();
  return result.rows;
};

