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
    // POSITION_ID in HR_EMP_ASSIGNMENT refers to HR_ORG_POSITION.ID
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
         WHERE EMP_NO = :EMP_NO AND ADDRESS_TYPE_ID = :ADDRESS_TYPE_ID
      `, {
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

    // 3️⃣ Handle ACTUAL_COUNT adjustment if POSITION_ID changed
    // Fetch the current (old) POSITION_ID from the assignment
    const oldAssignResult = await conn.execute(`
      SELECT POSITION_ID
        FROM HR_EMP_ASSIGNMENT
       WHERE PERSON_ID = :PERSON_ID AND STATUS = 1
    `, { PERSON_ID: personId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    const oldPositionId = oldAssignResult.rows[0]?.POSITION_ID ?? null;
    const newPositionId = assignment.POSITION_ID ?? null;

    if (newPositionId && oldPositionId !== newPositionId) {
      // Decrement old position's ACTUAL_COUNT (if old position exists)
      if (oldPositionId) {
        await conn.execute(`
          UPDATE HCM.HR_ORG_POSITION
             SET ACTUAL_COUNT = GREATEST(NVL(ACTUAL_COUNT, 0) - 1, 0)
           WHERE ID = :ID AND STATUS = 1
        `, { ID: oldPositionId });
      }

      // Increment new position's ACTUAL_COUNT
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
    // 1️⃣ Get POSITION_ID (= HR_ORG_POSITION.ID) before deactivating
    const assignRow = await conn.execute(`
      SELECT POSITION_ID
        FROM HR_EMP_ASSIGNMENT
       WHERE PERSON_ID = :PERSON_ID AND STATUS = 1
    `, { PERSON_ID: personId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    const orgPositionId = assignRow.rows[0]?.POSITION_ID ?? null;

    // 2️⃣ Soft delete Employee
    await conn.execute(`
      UPDATE HR_EMPLOYEE
         SET STATUS = 0, LAST_UPDATE_DATE = SYSDATE
       WHERE PERSON_ID = :PERSON_ID
    `, { PERSON_ID: personId });

    // 3️⃣ Soft delete Address
    await conn.execute(`
      UPDATE HR_EMP_ADDRESS
         SET STATUS = 0, LAST_UPDATE_DATE = SYSDATE
       WHERE PERSON_ID = :PERSON_ID
    `, { PERSON_ID: personId });

    // 4️⃣ Soft delete Assignment
    await conn.execute(`
      UPDATE HR_EMP_ASSIGNMENT
         SET STATUS = 0
       WHERE PERSON_ID = :PERSON_ID
    `, { PERSON_ID: personId });

    // 5️⃣ Decrement ACTUAL_COUNT in HR_ORG_POSITION
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
   GET ALL EMPLOYEES
───────────────────────────────────────── */
export const getEmployeeList = async () => {
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
    LEFT JOIN hr_person_type pt   ON e.PERSON_TYPE_ID   = pt.PERSON_TYPE_ID
    LEFT JOIN hr_emp_address pa   ON e.EMP_NO = pa.EMP_NO  AND pa.ADDRESS_TYPE_ID = 1
    LEFT JOIN hr_emp_address pma  ON e.EMP_NO = pma.EMP_NO AND pma.ADDRESS_TYPE_ID = 2
    LEFT JOIN hr_emp_assignment s ON e.PERSON_ID         = s.PERSON_ID
    LEFT JOIN hr_company c        ON s.COMPANY_ID        = c.COMPANY_ID
    LEFT JOIN hr_org o            ON s.ORG_ID            = o.ID
    LEFT JOIN hr_grade g          ON s.GRADE_ID          = g.ID
    LEFT JOIN hcm.hr_org_position op ON s.POSITION_ID   = op.ID
    LEFT JOIN hr_position p       ON op.POSITION_ID      = p.POSITION_ID
    ORDER BY e.PERSON_ID
  `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

  await conn.close();
  return result.rows.map(formatEmployee);
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
    LEFT JOIN hr_person_type pt   ON e.PERSON_TYPE_ID   = pt.PERSON_TYPE_ID
    LEFT JOIN hr_emp_address pa   ON e.EMP_NO = pa.EMP_NO  AND pa.ADDRESS_TYPE_ID = 1
    LEFT JOIN hr_emp_address pma  ON e.EMP_NO = pma.EMP_NO AND pma.ADDRESS_TYPE_ID = 2
    LEFT JOIN hr_emp_assignment s ON e.PERSON_ID         = s.PERSON_ID
    LEFT JOIN hr_company c        ON s.COMPANY_ID        = c.COMPANY_ID
    LEFT JOIN hr_org o            ON s.ORG_ID            = o.ID
    LEFT JOIN hr_grade g          ON s.GRADE_ID          = g.ID
    LEFT JOIN hcm.hr_org_position op ON s.POSITION_ID   = op.ID
    LEFT JOIN hr_position p       ON op.POSITION_ID      = p.POSITION_ID
    WHERE e.PERSON_ID = :id
  `, [personId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

  await conn.close();
  if (!result.rows || result.rows.length === 0) return null;
  return formatEmployee(result.rows[0]);
};