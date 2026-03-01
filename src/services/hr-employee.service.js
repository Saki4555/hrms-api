import { getConnection } from "../config/db.js";
import oracledb from "oracledb";
import { formatEmployee } from "../utils/employee-formatter.js";

/* ─────────────────────────────────────────
   CREATE EMPLOYEE
───────────────────────────────────────── */
export const createEmployee = async (data) => {
  const conn = await getConnection();

  try {
    const { employee, address, assignment } = data;
        console.log(data)
    // 1️⃣ Employee Insert
    const empResult = await conn.execute(`
      INSERT INTO HR_EMPLOYEE (
        EMP_NO, TITLE, FIRST_NAME, LAST_NAME,
        FATHERS_NAME, FATHERS_NAME_B, MOTHERS_NAME, MOTHERS_NAME_B,
        GENDER, DATE_OF_BIRTH, NID, BIRTH_REG_NO, TOWN_OF_BIRTH,
        REGION_OF_BIRTH, COUNTRY_OF_BIRTH, MARRITIAL_STATUS,
        NATIONALITY, JOIN_DATE, PERSON_TYPE_ID, REG_DISABILITY,
        EFFECTIVE_START_DATE, EFFECTIVEEND_DATE, STATUS, CREATION_DATE
      ) VALUES (
        :EMP_NO, :TITLE, :FIRST_NAME, :LAST_NAME,
        :FATHERS_NAME, :FATHERS_NAME_B, :MOTHERS_NAME, :MOTHERS_NAME_B,
        :GENDER, TO_DATE(:DATE_OF_BIRTH,'YYYY-MM-DD'), :NID, :BIRTH_REG_NO, :TOWN_OF_BIRTH,
        :REGION_OF_BIRTH, :COUNTRY_OF_BIRTH, :MARRITIAL_STATUS,
        :NATIONALITY, TO_DATE(:JOIN_DATE,'YYYY-MM-DD'), :PERSON_TYPE_ID, :REG_DISABILITY,
        TO_DATE(:EFFECTIVE_START_DATE,'YYYY-MM-DD'), TO_DATE(:EFFECTIVEEND_DATE,'YYYY-MM-DD'),
        1, SYSTIMESTAMP
      )
      RETURNING PERSON_ID INTO :PERSON_ID
    `, {
      EMP_NO:               employee.EMP_NO,
      TITLE:                employee.TITLE              ?? null,
      FIRST_NAME:           employee.FIRST_NAME,
      LAST_NAME:            employee.LAST_NAME          ?? null,
      FATHERS_NAME:         employee.FATHERS_NAME       ?? null,
      FATHERS_NAME_B:       employee.FATHERS_NAME_B     ?? null,
      MOTHERS_NAME:         employee.MOTHERS_NAME       ?? null,
      MOTHERS_NAME_B:       employee.MOTHERS_NAME_B     ?? null,
      GENDER:               employee.GENDER             ?? null,
      DATE_OF_BIRTH:        employee.DATE_OF_BIRTH,
      NID:                  employee.NID                ?? null,
      BIRTH_REG_NO:         employee.BIRTH_REG_NO       ?? null,
      TOWN_OF_BIRTH:        employee.TOWN_OF_BIRTH      ?? null,
      REGION_OF_BIRTH:      employee.REGION_OF_BIRTH    ?? null,
      COUNTRY_OF_BIRTH:     employee.COUNTRY_OF_BIRTH   ?? null,
      MARRITIAL_STATUS:     employee.MARRITIAL_STATUS   ?? null,
      NATIONALITY:          employee.NATIONALITY        ?? null,
      JOIN_DATE:            employee.JOIN_DATE,
      PERSON_TYPE_ID:       employee.PERSON_TYPE_ID     ?? null,
      REG_DISABILITY:       employee.REG_DISABILITY     ?? null,
      EFFECTIVE_START_DATE: employee.EFFECTIVE_START_DATE,
      EFFECTIVEEND_DATE:    employee.EFFECTIVEEND_DATE,
      PERSON_ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    });

    const personId = empResult.outBinds.PERSON_ID[0];

    // 2️⃣ Address Insert (present + permanent)
    const addressTypes = [
      { typeId: 1, addr: address.present },
      { typeId: 2, addr: address.permanent },
    ];

    for (const { typeId, addr } of addressTypes) {
      await conn.execute(`
        INSERT INTO HR_EMP_ADDRESS (
          PERSON_ID, EMP_NO, ADDRESS_TYPE_ID, ADDRESS1, ADDRESS1_B,
          COUNTRY, REGION, DISTRICT, UPAZILLA, UNIONS, AREA,
          EFFECTIVE_START_DATE, EFFECTIVEEND_DATE, STATUS, CREATION_DATE
        ) VALUES (
          :PERSON_ID, :EMP_NO, :ADDRESS_TYPE_ID, :ADDRESS1, :ADDRESS1_B,
          :COUNTRY, :REGION, :DISTRICT, :UPAZILLA, :UNIONS, :AREA,
          TO_DATE(:EFFECTIVE_START_DATE, 'YYYY-MM-DD'),
          TO_DATE(:EFFECTIVEEND_DATE, 'YYYY-MM-DD'),
          1, SYSTIMESTAMP
        )
      `, {
        PERSON_ID:            personId,
        EMP_NO:               employee.EMP_NO,
        ADDRESS_TYPE_ID:      typeId,
        ADDRESS1:             addr.ADDRESS1             ?? null,
        ADDRESS1_B:           addr.ADDRESS1_B           ?? null,
        COUNTRY:              addr.COUNTRY              ?? null,
        REGION:               addr.REGION               ?? null,
        DISTRICT:             addr.DISTRICT             ?? null,
        UPAZILLA:             addr.UPAZILLA             ?? null,
        UNIONS:               addr.UNIONS               ?? null,
        AREA:                 addr.AREA                 ?? null,
        EFFECTIVE_START_DATE: addr.EFFECTIVE_START_DATE ?? employee.EFFECTIVE_START_DATE,
        EFFECTIVEEND_DATE:    addr.EFFECTIVEEND_DATE    ?? employee.EFFECTIVEEND_DATE,
      });
    }

    // 3️⃣ Assignment Insert
    await conn.execute(`
      INSERT INTO HR_EMP_ASSIGNMENT (
        PERSON_ID, COMPANY_ID, OU_ID, ORG_ID,
        POSITION_ID, PAYROLL_ID, GRADE_ID,
        EFFECTIVE_START_DATE, EFFECTIVE_END_DATE, STATUS
      ) VALUES (
        :PERSON_ID, :COMPANY_ID, :OU_ID, :ORG_ID,
        :POSITION_ID, :PAYROLL_ID, :GRADE_ID,
        TO_DATE(:EFFECTIVE_START_DATE,'YYYY-MM-DD'),
        TO_DATE(:EFFECTIVE_END_DATE,'YYYY-MM-DD'),
        1
      )
    `, {
      PERSON_ID:            personId,
      COMPANY_ID:           assignment.COMPANY_ID,
      OU_ID:                assignment.OU_ID,
      ORG_ID:               assignment.ORG_ID,
      POSITION_ID:          assignment.POSITION_ID,
      PAYROLL_ID:           assignment.PAYROLL_ID       ?? null,
      GRADE_ID:             assignment.GRADE_ID,
      EFFECTIVE_START_DATE: assignment.EFFECTIVE_START_DATE,
      EFFECTIVE_END_DATE:   assignment.EFFECTIVE_END_DATE,
    });

    // 4️⃣ Increment ACTUAL_COUNT in HR_ORG_POSITION
    const countUpdateResult = await conn.execute(`
      UPDATE HCM.HR_ORG_POSITION
         SET ACTUAL_COUNT = NVL(ACTUAL_COUNT, 0) + 1
       WHERE ID = :ID AND STATUS = 1
    `, { ID: assignment.POSITION_ID });

    if (countUpdateResult.rowsAffected === 0) {
      throw new Error(
        `ACTUAL_COUNT increment failed: no active HR_ORG_POSITION found with ID ${assignment.POSITION_ID}. ` +
        `Please verify the POSITION_ID is correct and the position is active (STATUS = 1).`
      );
    }

    await conn.commit();
    return { success: true, PERSON_ID: personId };

  } catch (err) {
    await conn.rollback();
    console.error("Transaction Failed:", err);
    throw err;
  } finally {
    await conn.close();
  }
};


/* ─────────────────────────────────────────
   UPDATE EMPLOYEE
───────────────────────────────────────── */
export const updateEmployee = async (personId, data) => {
  const conn = await getConnection();

  try {
    const { employee, address, assignment } = data;

    // 1️⃣ Employee Update
    await conn.execute(`
      UPDATE HR_EMPLOYEE
         SET EMP_NO               = :EMP_NO,
             TITLE                = :TITLE,
             FIRST_NAME           = :FIRST_NAME,
             LAST_NAME            = :LAST_NAME,
             FATHERS_NAME         = :FATHERS_NAME,
             FATHERS_NAME_B       = :FATHERS_NAME_B,
             MOTHERS_NAME         = :MOTHERS_NAME,
             MOTHERS_NAME_B       = :MOTHERS_NAME_B,
             GENDER               = :GENDER,
             DATE_OF_BIRTH        = TO_DATE(:DATE_OF_BIRTH, 'YYYY-MM-DD'),
             NID                  = :NID,
             BIRTH_REG_NO         = :BIRTH_REG_NO,
             TOWN_OF_BIRTH        = :TOWN_OF_BIRTH,
             REGION_OF_BIRTH      = :REGION_OF_BIRTH,
             COUNTRY_OF_BIRTH     = :COUNTRY_OF_BIRTH,
             MARRITIAL_STATUS     = :MARRITIAL_STATUS,
             NATIONALITY          = :NATIONALITY,
             JOIN_DATE            = TO_DATE(:JOIN_DATE, 'YYYY-MM-DD'),
             PERSON_TYPE_ID       = :PERSON_TYPE_ID,
             REG_DISABILITY       = :REG_DISABILITY,
             EFFECTIVE_START_DATE = TO_DATE(:EFFECTIVE_START_DATE, 'YYYY-MM-DD'),
             EFFECTIVEEND_DATE    = TO_DATE(:EFFECTIVEEND_DATE, 'YYYY-MM-DD'),
             LAST_UPDATE_DATE     = SYSDATE,
             LAST_UPDATE_BY       = :LAST_UPDATE_BY
       WHERE PERSON_ID = :PERSON_ID
    `, {
      PERSON_ID:            personId,
      EMP_NO:               employee.EMP_NO,
      TITLE:                employee.TITLE              ?? null,
      FIRST_NAME:           employee.FIRST_NAME,
      LAST_NAME:            employee.LAST_NAME          ?? null,
      FATHERS_NAME:         employee.FATHERS_NAME       ?? null,
      FATHERS_NAME_B:       employee.FATHERS_NAME_B     ?? null,
      MOTHERS_NAME:         employee.MOTHERS_NAME       ?? null,
      MOTHERS_NAME_B:       employee.MOTHERS_NAME_B     ?? null,
      GENDER:               employee.GENDER             ?? null,
      DATE_OF_BIRTH:        employee.DATE_OF_BIRTH      ?? null,
      NID:                  employee.NID                ?? null,
      BIRTH_REG_NO:         employee.BIRTH_REG_NO       ?? null,
      TOWN_OF_BIRTH:        employee.TOWN_OF_BIRTH      ?? null,
      REGION_OF_BIRTH:      employee.REGION_OF_BIRTH    ?? null,
      COUNTRY_OF_BIRTH:     employee.COUNTRY_OF_BIRTH   ?? null,
      MARRITIAL_STATUS:     employee.MARRITIAL_STATUS   ?? null,
      NATIONALITY:          employee.NATIONALITY        ?? null,
      JOIN_DATE:            employee.JOIN_DATE,
      PERSON_TYPE_ID:       employee.PERSON_TYPE_ID     ?? null,
      REG_DISABILITY:       employee.REG_DISABILITY     ?? null,
      EFFECTIVE_START_DATE: employee.EFFECTIVE_START_DATE,
      EFFECTIVEEND_DATE:    employee.EFFECTIVEEND_DATE,
      LAST_UPDATE_BY:       employee.LAST_UPDATE_BY     ?? null,
    });

    // 2️⃣ Address Update
    const addressTypes = [
      { typeId: 1, addr: address.present },
      { typeId: 2, addr: address.permanent },
    ];

    for (const { typeId, addr } of addressTypes) {
      await conn.execute(`
        UPDATE HR_EMP_ADDRESS
           SET ADDRESS1             = :ADDRESS1,
               ADDRESS1_B           = :ADDRESS1_B,
               COUNTRY              = :COUNTRY,
               REGION               = :REGION,
               DISTRICT             = :DISTRICT,
               UPAZILLA             = :UPAZILLA,
               UNIONS               = :UNIONS,
               AREA                 = :AREA,
               EFFECTIVE_START_DATE = TO_DATE(:EFFECTIVE_START_DATE, 'YYYY-MM-DD'),
               EFFECTIVEEND_DATE    = TO_DATE(:EFFECTIVEEND_DATE, 'YYYY-MM-DD'),
               LAST_UPDATE_DATE     = SYSDATE
         WHERE PERSON_ID = :PERSON_ID AND ADDRESS_TYPE_ID = :ADDRESS_TYPE_ID
      `, {
        PERSON_ID:            personId,
        ADDRESS_TYPE_ID:      typeId,
        ADDRESS1:             addr.ADDRESS1             ?? null,
        ADDRESS1_B:           addr.ADDRESS1_B           ?? null,
        COUNTRY:              addr.COUNTRY              ?? null,
        REGION:               addr.REGION               ?? null,
        DISTRICT:             addr.DISTRICT             ?? null,
        UPAZILLA:             addr.UPAZILLA             ?? null,
        UNIONS:               addr.UNIONS               ?? null,
        AREA:                 addr.AREA                 ?? null,
        EFFECTIVE_START_DATE: addr.EFFECTIVE_START_DATE ?? employee.EFFECTIVE_START_DATE,
        EFFECTIVEEND_DATE:    addr.EFFECTIVEEND_DATE    ?? employee.EFFECTIVEEND_DATE,
      });
    }

    // 3️⃣ Handle ACTUAL_COUNT adjustment if POSITION_ID changed
    const oldAssignResult = await conn.execute(`
      SELECT POSITION_ID
        FROM HR_EMP_ASSIGNMENT
       WHERE PERSON_ID = :PERSON_ID AND STATUS = 1
    `, { PERSON_ID: personId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    const oldPositionId = oldAssignResult.rows[0]?.POSITION_ID ?? null;
    const newPositionId = assignment.POSITION_ID ?? null;

    if (newPositionId && oldPositionId !== newPositionId) {
      if (oldPositionId) {
        await conn.execute(`
          UPDATE HCM.HR_ORG_POSITION
             SET ACTUAL_COUNT = GREATEST(NVL(ACTUAL_COUNT, 0) - 1, 0)
           WHERE ID = :ID AND STATUS = 1
        `, { ID: oldPositionId });
      }

      const countUpdateResult = await conn.execute(`
        UPDATE HCM.HR_ORG_POSITION
           SET ACTUAL_COUNT = NVL(ACTUAL_COUNT, 0) + 1
         WHERE ID = :ID AND STATUS = 1
      `, { ID: newPositionId });

      if (countUpdateResult.rowsAffected === 0) {
        throw new Error(
          `ACTUAL_COUNT increment failed: no active HR_ORG_POSITION found with ID ${newPositionId}. ` +
          `Please verify the POSITION_ID is correct and the position is active (STATUS = 1).`
        );
      }
    }

    // 4️⃣ Assignment Update
    await conn.execute(`
      UPDATE HR_EMP_ASSIGNMENT
         SET COMPANY_ID           = :COMPANY_ID,
             OU_ID                = :OU_ID,
             ORG_ID               = :ORG_ID,
             POSITION_ID          = :POSITION_ID,
             PAYROLL_ID           = :PAYROLL_ID,
             GRADE_ID             = :GRADE_ID,
             EFFECTIVE_START_DATE = TO_DATE(:EFFECTIVE_START_DATE, 'YYYY-MM-DD'),
             EFFECTIVE_END_DATE   = TO_DATE(:EFFECTIVE_END_DATE, 'YYYY-MM-DD')
       WHERE PERSON_ID = :PERSON_ID
    `, {
      PERSON_ID:            personId,
      COMPANY_ID:           assignment.COMPANY_ID       ?? null,
      OU_ID:                assignment.OU_ID            ?? null,
      ORG_ID:               assignment.ORG_ID           ?? null,
      POSITION_ID:          assignment.POSITION_ID      ?? null,
      PAYROLL_ID:           assignment.PAYROLL_ID       ?? null,
      GRADE_ID:             assignment.GRADE_ID         ?? null,
      EFFECTIVE_START_DATE: assignment.EFFECTIVE_START_DATE,
      EFFECTIVE_END_DATE:   assignment.EFFECTIVE_END_DATE,
    });

    await conn.commit();
    return { success: true, PERSON_ID: personId };

  } catch (err) {
    await conn.rollback();
    console.error("Update Failed:", err.message);
    throw err;
  } finally {
    await conn.close();
  }
};


/* ─────────────────────────────────────────
   SOFT DELETE
───────────────────────────────────────── */
export const softDeleteEmployee = async (personId) => {
  const conn = await getConnection();

  try {
    const assignRow = await conn.execute(`
      SELECT POSITION_ID
        FROM HR_EMP_ASSIGNMENT
       WHERE PERSON_ID = :PERSON_ID AND STATUS = 1
    `, { PERSON_ID: personId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    const orgPositionId = assignRow.rows[0]?.POSITION_ID ?? null;

    await conn.execute(`
      UPDATE HR_EMPLOYEE
         SET STATUS = 0, LAST_UPDATE_DATE = SYSDATE
       WHERE PERSON_ID = :PERSON_ID
    `, { PERSON_ID: personId });

    await conn.execute(`
      UPDATE HR_EMP_ADDRESS
         SET STATUS = 0, LAST_UPDATE_DATE = SYSDATE
       WHERE PERSON_ID = :PERSON_ID
    `, { PERSON_ID: personId });

    await conn.execute(`
      UPDATE HR_EMP_ASSIGNMENT
         SET STATUS = 0
       WHERE PERSON_ID = :PERSON_ID
    `, { PERSON_ID: personId });

    if (orgPositionId) {
      await conn.execute(`
        UPDATE HCM.HR_ORG_POSITION
           SET ACTUAL_COUNT = GREATEST(NVL(ACTUAL_COUNT, 0) - 1, 0)
         WHERE ID = :ID AND STATUS = 1
      `, { ID: orgPositionId });
    }

    await conn.commit();
    return { success: true, PERSON_ID: personId };

  } catch (err) {
    await conn.rollback();
    console.error("Delete Failed:", err.message);
    throw err;
  } finally {
    await conn.close();
  }
};


/* ─────────────────────────────────────────
   GET EMPLOYEE LIST
   Supports: pagination + search + sort

   Params:
     page      - page number (default: 1)
     limit     - rows per page (default: 10)
     search    - searches EMP_NO, FIRST_NAME, LAST_NAME, NID (optional)
     sortBy    - column name           (default: LAST_ACTIVITY = newest of created/updated)
     sortOrder - ASC or DESC (default: DESC)
───────────────────────────────────────── */
/* ─────────────────────────────────────────
   GET EMPLOYEE LIST
   Supports: pagination + search + filter + sort

   Query Params:
     page        - page number           (default: 1)
     limit       - rows per page         (default: 10)
     search      - FIRST_NAME / LAST_NAME / EMP_NO / NID
     sortBy      - column name           (default: LAST_ACTIVITY = newest of created/updated)
     sortOrder   - ASC | DESC            (default: DESC)
     personType  - e.PERSON_TYPE_ID      (exact ID)
     gender      - e.GENDER              (M | F)
     companyId   - s.COMPANY_ID          (exact ID)
     positionId  - HR_POSITION.POSITION_ID  (master position in hr_position table)
     countryId   - COUNTRY_LIST.COUNTRY_ID  (present address country ID)
───────────────────────────────────────── */
export const getEmployeeList = async ({
  page       = 1,
  limit      = 10,
  search     = "",
  sortBy     = "LAST_ACTIVITY",   // LAST_ACTIVITY = GREATEST(CREATION_DATE, LAST_UPDATE_DATE)
  sortOrder  = "DESC",
  personType = "",
  gender     = "",
  companyId  = "",
  positionId = "",          // HR_POSITION.POSITION_ID (master position in hr_position)
  countryId        = "",
} = {}) => {
  const conn = await getConnection();

  // ── Sanitize pagination ──────────────────────────────────────────
  const pageNum   = Math.max(1, parseInt(page,  10) || 1);
  const limitNum  = Math.max(1, parseInt(limit, 10) || 10);
  const rownumMin = (pageNum - 1) * limitNum + 1;
  const rownumMax = pageNum * limitNum;

  // ── Sanitize sort (whitelist prevents SQL injection) ─────────────
  const ALLOWED_SORT_COLUMNS = [
    "EMP_NO", "FIRST_NAME", "LAST_NAME", "JOIN_DATE",
    "DATE_OF_BIRTH", "CREATION_DATE", "LAST_UPDATE_DATE", "NID", "LAST_ACTIVITY",
  ];
  const rawSortBy     = sortBy.toUpperCase();
  const safeSortBy    = ALLOWED_SORT_COLUMNS.includes(rawSortBy) ? rawSortBy : "LAST_ACTIVITY";
  const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  // LAST_ACTIVITY = GREATEST(CREATION_DATE, LAST_UPDATE_DATE)
  // This ensures updated employees always float to the top
  const orderByClause = safeSortBy === "LAST_ACTIVITY"
    ? `GREATEST(NVL(e.CREATION_DATE, DATE '1900-01-01'), NVL(e.LAST_UPDATE_DATE, DATE '1900-01-01')) ${safeSortOrder} NULLS LAST`
    : `e.${safeSortBy} ${safeSortOrder} NULLS LAST`;

  // ── Build dynamic WHERE + bind params ────────────────────────────
  const conditions = [];
  const bindParams = {};

  // 🔍 Search: FIRST_NAME, LAST_NAME, EMP_NO, NID
  if (search && search.trim()) {
    conditions.push(`(
         UPPER(e.EMP_NO)     LIKE UPPER(:SEARCH)
      OR UPPER(e.FIRST_NAME) LIKE UPPER(:SEARCH)
      OR UPPER(e.LAST_NAME)  LIKE UPPER(:SEARCH)
      OR UPPER(e.NID)        LIKE UPPER(:SEARCH)
    )`);
    bindParams.SEARCH = `%${search.trim()}%`;
  }

  // 🔽 Filter: Person Type ID
  if (personType !== "" && personType != null) {
    conditions.push(`e.PERSON_TYPE_ID = :PERSON_TYPE_ID`);
    bindParams.PERSON_TYPE_ID = parseInt(personType, 10);
  }

  // 🔽 Filter: Gender (M / F)
  if (gender && gender.trim()) {
    conditions.push(`UPPER(e.GENDER) = UPPER(:GENDER)`);
    bindParams.GENDER = gender.trim();
  }

  // 🔽 Filter: Company ID
  if (companyId !== "" && companyId != null) {
    conditions.push(`s.COMPANY_ID = :COMPANY_ID`);
    bindParams.COMPANY_ID = parseInt(companyId, 10);
  }

  // 🔽 Filter: Position ID — HR_POSITION.POSITION_ID (master position table)
  //    p = HR_POSITION alias (joined via op → p)
  if (positionId !== "" && positionId != null) {
    conditions.push(`op.POSITION_ID = :POSITION_ID`);
    bindParams.POSITION_ID = parseInt(positionId, 10);
  }

  // 🔽 Filter: Country ID (COUNTRY_LIST.COUNTRY_ID — present address)
  if (countryId !== "" && countryId != null) {
    conditions.push(`pa.COUNTRY IN (SELECT COUNTRY_NAME FROM HCM.COUNTRY_LIST WHERE COUNTRY_ID = :COUNTRY_ID)`);
    bindParams.COUNTRY_ID = parseInt(countryId, 10);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join("\n      AND ")}`
    : "";

  try {
    // 1️⃣ Total count (all filters applied)
    const countResult = await conn.execute(
      `SELECT COUNT(*) AS TOTAL
         FROM hr_employee e
         LEFT JOIN hr_emp_address    pa ON e.PERSON_ID = pa.PERSON_ID AND pa.ADDRESS_TYPE_ID = 1
         LEFT JOIN hr_emp_assignment s  ON e.PERSON_ID = s.PERSON_ID
         LEFT JOIN hcm.hr_org_position op ON s.POSITION_ID = op.ID
         LEFT JOIN hr_position         p  ON op.POSITION_ID = p.POSITION_ID
         ${whereClause}`,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const total = countResult.rows[0].TOTAL;

    // 2️⃣ Paginated + filtered + sorted data
    //    Oracle ROWNUM triple-subquery:
    //    innermost → filter + sort, middle → cap at rownumMax, outer → slice from rownumMin
    const result = await conn.execute(`
      SELECT * FROM (
        SELECT ROWNUM AS RN, sq.* FROM (

          SELECT
            e.PERSON_ID, e.EMP_NO, e.TITLE, e.FIRST_NAME, e.LAST_NAME,
            e.FATHERS_NAME, e.FATHERS_NAME_B, e.MOTHERS_NAME, e.MOTHERS_NAME_B,
            e.GENDER, e.DATE_OF_BIRTH, e.NID, e.BIRTH_REG_NO,
            e.TOWN_OF_BIRTH, e.REGION_OF_BIRTH, e.COUNTRY_OF_BIRTH,
            e.MARRITIAL_STATUS, e.NATIONALITY, e.JOIN_DATE,
            e.PERSON_TYPE_ID, e.REG_DISABILITY,
            e.EFFECTIVE_START_DATE AS EMP_EFFECTIVE_START_DATE,
            e.EFFECTIVEEND_DATE    AS EMP_EFFECTIVEEND_DATE,
            e.STATUS               AS EMP_STATUS,
            e.CREATION_DATE, e.LAST_UPDATE_DATE, e.LAST_UPDATE_BY,
            pt.PERSON_TYPE,
            pa.ADDRESS1    AS PRESENT_ADDRESS1,
            pa.ADDRESS1_B  AS PRESENT_ADDRESS1_B,
            pa.COUNTRY     AS PRESENT_COUNTRY,
            pa.REGION      AS PRESENT_REGION,
            pa.DISTRICT    AS PRESENT_DISTRICT,
            pa.UPAZILLA    AS PRESENT_UPAZILLA,
            pa.UNIONS      AS PRESENT_UNIONS,
            pa.AREA        AS PRESENT_AREA,
            pa.EFFECTIVE_START_DATE AS PRESENT_EFFECTIVE_START_DATE,
            pa.EFFECTIVEEND_DATE    AS PRESENT_EFFECTIVEEND_DATE,
            cl_pa.COUNTRY_ID   AS PRESENT_COUNTRY_ID,
            rl_pa.REGION_ID    AS PRESENT_REGION_ID,
            dl_pa.DISTRICT_ID  AS PRESENT_DISTRICT_ID,
            ul_pa.UPAZILLA_ID  AS PRESENT_UPAZILLA_ID,
            pma.ADDRESS1    AS PERMANENT_ADDRESS1,
            pma.ADDRESS1_B  AS PERMANENT_ADDRESS1_B,
            pma.COUNTRY     AS PERMANENT_COUNTRY,
            pma.REGION      AS PERMANENT_REGION,
            pma.DISTRICT    AS PERMANENT_DISTRICT,
            pma.UPAZILLA    AS PERMANENT_UPAZILLA,
            pma.UNIONS      AS PERMANENT_UNIONS,
            pma.AREA        AS PERMANENT_AREA,
            pma.EFFECTIVE_START_DATE AS PERMANENT_EFFECTIVE_START_DATE,
            pma.EFFECTIVEEND_DATE    AS PERMANENT_EFFECTIVEEND_DATE,
            cl_pma.COUNTRY_ID  AS PERMANENT_COUNTRY_ID,
            rl_pma.REGION_ID   AS PERMANENT_REGION_ID,
            dl_pma.DISTRICT_ID AS PERMANENT_DISTRICT_ID,
            ul_pma.UPAZILLA_ID AS PERMANENT_UPAZILLA_ID,
            s.ASSIGNMENT_ID, s.COMPANY_ID, s.OU_ID, s.ORG_ID,
            s.POSITION_ID,   s.PAYROLL_ID, s.GRADE_ID,
            s.EFFECTIVE_START_DATE AS ASSIGN_EFFECTIVE_START_DATE,
            s.EFFECTIVE_END_DATE   AS ASSIGN_EFFECTIVE_END_DATE,
            c.COMPANY_NAME,
            c.ADDRESS        AS COMPANY_ADDRESS,
            o.NAME           AS ORG_NAME,
            g.GRADE          AS GRADE_NAME,
            op.POSITION_ID   AS MASTER_POSITION_ID,
            p.TITLE          AS POSITION_TITLE,
            p.LEVELS         AS POSITION_LEVEL

          FROM hr_employee e
          LEFT JOIN hr_person_type pt      ON e.PERSON_TYPE_ID  = pt.PERSON_TYPE_ID
          LEFT JOIN hr_emp_address pa      ON e.PERSON_ID = pa.PERSON_ID  AND pa.ADDRESS_TYPE_ID  = 1
          LEFT JOIN hr_emp_address pma     ON e.PERSON_ID = pma.PERSON_ID AND pma.ADDRESS_TYPE_ID = 2
          LEFT JOIN hr_emp_assignment s    ON e.PERSON_ID = s.PERSON_ID
          LEFT JOIN hr_company c           ON s.COMPANY_ID = c.COMPANY_ID
          LEFT JOIN hr_org o               ON s.ORG_ID     = o.ID
          LEFT JOIN hr_grade g             ON s.GRADE_ID   = g.ID
          LEFT JOIN hcm.hr_org_position op ON s.POSITION_ID = op.ID
          LEFT JOIN hr_position p          ON op.POSITION_ID = p.POSITION_ID
          LEFT JOIN HCM.COUNTRY_LIST  cl_pa  ON pa.COUNTRY  = cl_pa.COUNTRY_NAME
          LEFT JOIN HCM.REGION_LIST   rl_pa  ON pa.REGION   = rl_pa.REGION_NAME   AND rl_pa.COUNTRY_ID  = cl_pa.COUNTRY_ID
          LEFT JOIN HCM.DISTRICT_LIST dl_pa  ON pa.DISTRICT = dl_pa.DISTRICT_NAME  AND dl_pa.REGION_ID   = rl_pa.REGION_ID
          LEFT JOIN HCM.UPAZILLA_LIST ul_pa  ON pa.UPAZILLA = ul_pa.UPAZILLA_NAME  AND ul_pa.DISTRICT_ID = dl_pa.DISTRICT_ID
          LEFT JOIN HCM.COUNTRY_LIST  cl_pma ON pma.COUNTRY  = cl_pma.COUNTRY_NAME
          LEFT JOIN HCM.REGION_LIST   rl_pma ON pma.REGION   = rl_pma.REGION_NAME  AND rl_pma.COUNTRY_ID  = cl_pma.COUNTRY_ID
          LEFT JOIN HCM.DISTRICT_LIST dl_pma ON pma.DISTRICT = dl_pma.DISTRICT_NAME AND dl_pma.REGION_ID   = rl_pma.REGION_ID
          LEFT JOIN HCM.UPAZILLA_LIST ul_pma ON pma.UPAZILLA = ul_pma.UPAZILLA_NAME AND ul_pma.DISTRICT_ID = dl_pma.DISTRICT_ID

          ${whereClause}

          ORDER BY ${orderByClause}

        ) sq WHERE ROWNUM <= ${rownumMax}
      ) WHERE RN >= ${rownumMin}
    `, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return {
      data: result.rows.map(formatEmployee),
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };

  } finally {
    await conn.close();
  }
};


/* ─────────────────────────────────────────
   GET EMPLOYEE BY ID
───────────────────────────────────────── */
export const getEmployeeById = async (personId) => {
  const conn = await getConnection();

  const result = await conn.execute(`
    SELECT
      e.PERSON_ID, e.EMP_NO, e.TITLE, e.FIRST_NAME, e.LAST_NAME,
      e.FATHERS_NAME, e.FATHERS_NAME_B, e.MOTHERS_NAME, e.MOTHERS_NAME_B,
      e.GENDER, e.DATE_OF_BIRTH, e.NID, e.BIRTH_REG_NO,
      e.TOWN_OF_BIRTH, e.REGION_OF_BIRTH, e.COUNTRY_OF_BIRTH,
      e.MARRITIAL_STATUS, e.NATIONALITY, e.JOIN_DATE,
      e.PERSON_TYPE_ID, e.REG_DISABILITY,
      e.EFFECTIVE_START_DATE AS EMP_EFFECTIVE_START_DATE,
      e.EFFECTIVEEND_DATE    AS EMP_EFFECTIVEEND_DATE,
      e.STATUS               AS EMP_STATUS,
      e.CREATION_DATE, e.LAST_UPDATE_DATE, e.LAST_UPDATE_BY,

      pt.PERSON_TYPE,

      pa.ADDRESS1    AS PRESENT_ADDRESS1,
      pa.ADDRESS1_B  AS PRESENT_ADDRESS1_B,
      pa.COUNTRY     AS PRESENT_COUNTRY,
      pa.REGION      AS PRESENT_REGION,
      pa.DISTRICT    AS PRESENT_DISTRICT,
      pa.UPAZILLA    AS PRESENT_UPAZILLA,
      pa.UNIONS      AS PRESENT_UNIONS,
      pa.AREA        AS PRESENT_AREA,
      pa.EFFECTIVE_START_DATE AS PRESENT_EFFECTIVE_START_DATE,
      pa.EFFECTIVEEND_DATE    AS PRESENT_EFFECTIVEEND_DATE,

      cl_pa.COUNTRY_ID   AS PRESENT_COUNTRY_ID,
      rl_pa.REGION_ID    AS PRESENT_REGION_ID,
      dl_pa.DISTRICT_ID  AS PRESENT_DISTRICT_ID,
      ul_pa.UPAZILLA_ID  AS PRESENT_UPAZILLA_ID,

      pma.ADDRESS1    AS PERMANENT_ADDRESS1,
      pma.ADDRESS1_B  AS PERMANENT_ADDRESS1_B,
      pma.COUNTRY     AS PERMANENT_COUNTRY,
      pma.REGION      AS PERMANENT_REGION,
      pma.DISTRICT    AS PERMANENT_DISTRICT,
      pma.UPAZILLA    AS PERMANENT_UPAZILLA,
      pma.UNIONS      AS PERMANENT_UNIONS,
      pma.AREA        AS PERMANENT_AREA,
      pma.EFFECTIVE_START_DATE AS PERMANENT_EFFECTIVE_START_DATE,
      pma.EFFECTIVEEND_DATE    AS PERMANENT_EFFECTIVEEND_DATE,

      cl_pma.COUNTRY_ID  AS PERMANENT_COUNTRY_ID,
      rl_pma.REGION_ID   AS PERMANENT_REGION_ID,
      dl_pma.DISTRICT_ID AS PERMANENT_DISTRICT_ID,
      ul_pma.UPAZILLA_ID AS PERMANENT_UPAZILLA_ID,

      s.ASSIGNMENT_ID, s.COMPANY_ID, s.OU_ID, s.ORG_ID,
      s.POSITION_ID,   s.PAYROLL_ID, s.GRADE_ID,
      s.EFFECTIVE_START_DATE AS ASSIGN_EFFECTIVE_START_DATE,
      s.EFFECTIVE_END_DATE   AS ASSIGN_EFFECTIVE_END_DATE,

      c.COMPANY_NAME,
      c.ADDRESS        AS COMPANY_ADDRESS,
      o.NAME           AS ORG_NAME,
      g.GRADE          AS GRADE_NAME,
      op.POSITION_ID   AS MASTER_POSITION_ID,
      p.TITLE          AS POSITION_TITLE,
      p.LEVELS         AS POSITION_LEVEL

    FROM hr_employee e
    LEFT JOIN hr_person_type pt      ON e.PERSON_TYPE_ID  = pt.PERSON_TYPE_ID
    LEFT JOIN hr_emp_address pa      ON e.PERSON_ID = pa.PERSON_ID  AND pa.ADDRESS_TYPE_ID  = 1
    LEFT JOIN hr_emp_address pma     ON e.PERSON_ID = pma.PERSON_ID AND pma.ADDRESS_TYPE_ID = 2
    LEFT JOIN hr_emp_assignment s    ON e.PERSON_ID = s.PERSON_ID
    LEFT JOIN hr_company c           ON s.COMPANY_ID = c.COMPANY_ID
    LEFT JOIN hr_org o               ON s.ORG_ID     = o.ID
    LEFT JOIN hr_grade g             ON s.GRADE_ID   = g.ID
    LEFT JOIN hcm.hr_org_position op ON s.POSITION_ID = op.ID
    LEFT JOIN hr_position p          ON op.POSITION_ID = p.POSITION_ID

    LEFT JOIN HCM.COUNTRY_LIST  cl_pa  ON pa.COUNTRY  = cl_pa.COUNTRY_NAME
    LEFT JOIN HCM.REGION_LIST   rl_pa  ON pa.REGION   = rl_pa.REGION_NAME   AND rl_pa.COUNTRY_ID  = cl_pa.COUNTRY_ID
    LEFT JOIN HCM.DISTRICT_LIST dl_pa  ON pa.DISTRICT = dl_pa.DISTRICT_NAME  AND dl_pa.REGION_ID   = rl_pa.REGION_ID
    LEFT JOIN HCM.UPAZILLA_LIST ul_pa  ON pa.UPAZILLA = ul_pa.UPAZILLA_NAME  AND ul_pa.DISTRICT_ID = dl_pa.DISTRICT_ID

    LEFT JOIN HCM.COUNTRY_LIST  cl_pma ON pma.COUNTRY  = cl_pma.COUNTRY_NAME
    LEFT JOIN HCM.REGION_LIST   rl_pma ON pma.REGION   = rl_pma.REGION_NAME  AND rl_pma.COUNTRY_ID  = cl_pma.COUNTRY_ID
    LEFT JOIN HCM.DISTRICT_LIST dl_pma ON pma.DISTRICT = dl_pma.DISTRICT_NAME AND dl_pma.REGION_ID   = rl_pma.REGION_ID
    LEFT JOIN HCM.UPAZILLA_LIST ul_pma ON pma.UPAZILLA = ul_pma.UPAZILLA_NAME AND ul_pma.DISTRICT_ID = dl_pma.DISTRICT_ID

   WHERE e.PERSON_ID = :id
    ORDER BY
      GREATEST(
        NVL(e.CREATION_DATE,    DATE '1900-01-01'),
        NVL(e.LAST_UPDATE_DATE, DATE '1900-01-01')
      ) DESC NULLS LAST
  `, [personId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

  await conn.close();
  return result.rows.map(formatEmployee);
};