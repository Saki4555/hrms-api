import oracledb from "oracledb";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { getConnection } from "../../config/db.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ── Shared helper: validate + compress ──────────────────────────────────────
const processImage = async (buffer) => {
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !ALLOWED_TYPES.includes(type.mime)) {
    throw new Error("Invalid file type. Only JPG, PNG, WEBP allowed.");
  }

  const processed = await sharp(buffer)
    .resize(400, 400, { fit: "cover", position: "center" })
    .jpeg({ quality: 80 })
    .toBuffer();

  return processed;
};

/* UPLOAD / CREATE */
export const uploadImage = async (personId, imageBuffer) => {
  const conn = await getConnection();
  try {
    const processed = await processImage(imageBuffer); // ← added
    const result = await conn.execute(
      `INSERT INTO HCM.HR_EMP_IMGES (PERSON_ID, IMAGE, STATUS)
       VALUES (:PERSON_ID, :IMAGE, 1)
       RETURNING ID INTO :ID`,
      {
        PERSON_ID: parseInt(personId),
        IMAGE:     { val: processed, type: oracledb.BLOB }, // ← processed not imageBuffer
        ID:        { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );
    return { id: result.outBinds.ID[0] };
  } finally {
    await conn.close();
  }
};

/* GET LATEST IMAGE BY PERSON_ID  */
export const getImageByPersonId = async (personId) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID, PERSON_ID, IMAGE, STATUS
         FROM HCM.HR_EMP_IMGES
        WHERE PERSON_ID = :PERSON_ID AND STATUS = 1
        ORDER BY ID DESC
        FETCH FIRST 1 ROW ONLY`,
      { PERSON_ID: parseInt(personId) },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: { IMAGE: { type: oracledb.BUFFER } },
      }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

/* GET IMAGE BY RECORD ID — no change */
export const getImageById = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT ID, PERSON_ID, IMAGE, STATUS
         FROM HCM.HR_EMP_IMGES
        WHERE ID = :ID AND STATUS = 1`,
      { ID: parseInt(id) },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: { IMAGE: { type: oracledb.BUFFER } },
      }
    );
    return result.rows[0] ?? null;
  } finally {
    await conn.close();
  }
};

/* UPDATE IMAGE BY PERSON_ID */
export const updateImage = async (personId, imageBuffer) => {
  const conn = await getConnection();
  try {
    const processed = await processImage(imageBuffer); // ← added
    const result = await conn.execute(
      `UPDATE HCM.HR_EMP_IMGES
          SET IMAGE = :IMAGE
        WHERE PERSON_ID = :PERSON_ID AND STATUS = 1`,
      {
        PERSON_ID: parseInt(personId),
        IMAGE:     { val: processed, type: oracledb.BLOB }, // ← processed not imageBuffer
      },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

/* SOFT DELETE BY RECORD ID — no change */
export const deleteImage = async (id) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `UPDATE HCM.HR_EMP_IMGES SET STATUS = 0 WHERE ID = :ID`,
      { ID: parseInt(id) },
      { autoCommit: true }
    );
    return result.rowsAffected;
  } finally {
    await conn.close();
  }
};

