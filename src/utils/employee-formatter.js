export const formatEmployee = (row) => {
  if (!row) return null;

  return {
    PERSON_ID:            row.PERSON_ID,
    EMP_NO:               row.EMP_NO,
    TITLE:                row.TITLE,
    FIRST_NAME:           row.FIRST_NAME,
    LAST_NAME:            row.LAST_NAME,
    GENDER:               row.GENDER,
    DATE_OF_BIRTH:        row.DATE_OF_BIRTH,
    JOIN_DATE:            row.JOIN_DATE,
    NATIONALITY:          row.NATIONALITY,
    NID:                  row.NID,
    BIRTH_REG_NO:         row.BIRTH_REG_NO,
    COUNTRY_OF_BIRTH:     row.COUNTRY_OF_BIRTH,
    REGION_OF_BIRTH:      row.REGION_OF_BIRTH,
    TOWN_OF_BIRTH:        row.TOWN_OF_BIRTH,
    MARRITIAL_STATUS:     row.MARRITIAL_STATUS,
    REG_DISABILITY:       row.REG_DISABILITY,
    FATHERS_NAME:         row.FATHERS_NAME,
    FATHERS_NAME_B:       row.FATHERS_NAME_B,
    MOTHERS_NAME:         row.MOTHERS_NAME,
    MOTHERS_NAME_B:       row.MOTHERS_NAME_B,
    PERSON_TYPE_ID:       row.PERSON_TYPE_ID,
    EFFECTIVE_START_DATE: row.EMP_EFFECTIVE_START_DATE,
    EFFECTIVEEND_DATE:    row.EMP_EFFECTIVEEND_DATE,
    STATUS:               row.EMP_STATUS,
    CREATION_DATE:        row.CREATION_DATE,
    LAST_UPDATE_BY:       row.LAST_UPDATE_BY,
    LAST_UPDATE_DATE:     row.LAST_UPDATE_DATE,

    presentAddress: {
      ADDRESS_TYPE_ID:   1,
      ADDRESS_TYPE_NAME: "Present",
      ADDRESS1:          row.PRESENT_ADDRESS1,
      ADDRESS1_B:        row.PRESENT_ADDRESS1_B,
      AREA:              row.PRESENT_AREA,
      UPAZILLA:          row.PRESENT_UPAZILLA,
      UNIONS:            row.PRESENT_UNIONS,
      DISTRICT:          row.PRESENT_DISTRICT,
      REGION:            row.PRESENT_REGION,
      COUNTRY:           row.PRESENT_COUNTRY,
      EFFECTIVE_START_DATE: row.PRESENT_EFFECTIVE_START_DATE,
      EFFECTIVEEND_DATE:    row.PRESENT_EFFECTIVEEND_DATE,
    },

    permanentAddress: {
      ADDRESS_TYPE_ID:   2,
      ADDRESS_TYPE_NAME: "Permanent",
      ADDRESS1:          row.PERMANENT_ADDRESS1,
      ADDRESS1_B:        row.PERMANENT_ADDRESS1_B,
      AREA:              row.PERMANENT_AREA,
      UPAZILLA:          row.PERMANENT_UPAZILLA,
      UNIONS:            row.PERMANENT_UNIONS,
      DISTRICT:          row.PERMANENT_DISTRICT,
      REGION:            row.PERMANENT_REGION,
      COUNTRY:           row.PERMANENT_COUNTRY,
      EFFECTIVE_START_DATE: row.PERMANENT_EFFECTIVE_START_DATE,
      EFFECTIVEEND_DATE:    row.PERMANENT_EFFECTIVEEND_DATE,
    },

    assignment: {
      ASSIGNMENT_ID:   row.ASSIGNMENT_ID,
      COMPANY_ID:      row.COMPANY_ID,
      COMPANY_NAME:    row.COMPANY_NAME,      // ✅ HR_COMPANY থেকে
      COMPANY_ADDRESS: row.COMPANY_ADDRESS,   // ✅ HR_COMPANY থেকে
      OU_ID:           row.OU_ID,
      ORG_ID:          row.ORG_ID,
      ORG_NAME:        row.ORG_NAME,        // ✅ HR_ORG থেকে
      POSITION_ID:     row.POSITION_ID,
      POSITION_TITLE:  row.POSITION_TITLE,  // ✅ HR_POSITION থেকে
      POSITION_LEVEL:  row.POSITION_LEVEL,  // ✅ HR_POSITION থেকে
      PAYROLL_ID:      row.PAYROLL_ID,
      GRADE_ID:        row.GRADE_ID,
      GRADE_NAME:      row.GRADE_NAME,      // ✅ HR_GRADE থেকে
      EFFECTIVE_START_DATE: row.ASSIGN_EFFECTIVE_START_DATE,
      EFFECTIVE_END_DATE:   row.ASSIGN_EFFECTIVE_END_DATE,
    },

    personType: {
      PERSON_TYPE_ID: row.PERSON_TYPE_ID,
      PERSON_TYPE:    row.PERSON_TYPE,
    }
  };
};