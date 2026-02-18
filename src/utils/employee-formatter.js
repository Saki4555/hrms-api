export const formatEmployee = (row) => {
  if (!row) return null;

  return {
    employee: {
      PERSON_ID: row.PERSON_ID,
      EMP_NO: row.EMP_NO,
      TITLE: row.TITLE,
      FIRST_NAME: row.FIRST_NAME,
      LAST_NAME: row.LAST_NAME,
      FATHERS_NAME: row.FATHERS_NAME,
      FATHERS_NAME_B: row.FATHERS_NAME_B,
      MOTHERS_NAME: row.MOTHERS_NAME,
      MOTHERS_NAME_B: row.MOTHERS_NAME_B,
      GENDER: row.GENDER,
      DATE_OF_BIRTH: row.DATE_OF_BIRTH,
      NID: row.NID,
      BIRTH_REG_NO: row.BIRTH_REG_NO,
      TOWN_OF_BIRTH: row.TOWN_OF_BIRTH,
      REGION_OF_BIRTH: row.REGION_OF_BIRTH,
      COUNTRY_OF_BIRTH: row.COUNTRY_OF_BIRTH,
      MARRITIAL_STATUS: row.MARRITIAL_STATUS,
      NATIONALITY: row.NATIONALITY,
      JOIN_DATE: row.JOIN_DATE,
      PERSON_TYPE_ID: row.PERSON_TYPE_ID,
      REG_DISABILITY: row.REG_DISABILITY,
      EFFECTIVE_START_DATE: row.EFFECTIVE_START_DATE,
      EFFECTIVEEND_DATE: row.EFFECTIVEEND_DATE,
      CREATION_DATE: row.CREATION_DATE,
      LAST_UPDATE_DATE: row.LAST_UPDATE_DATE,
      LAST_UPDATE_BY: row.LAST_UPDATE_BY,
      STATUS: row.STATUS
    },

    personType: {
      PERSON_TYPE: row.PERSON_TYPE
    },

    address: {
      ADDRESS1: row.ADDRESS1,
      ADDRESS1_B: row.ADDRESS1_B,
      COUNTRY: row.COUNTRY,
      REGION: row.REGION,
      DISTRICT: row.DISTRICT,
      UPAZILLA: row.UPAZILLA,
      UNIONS: row.UNIONS,
      AREA: row.AREA
    },

    assignment: {
      COMPANY_ID: row.COMPANY_ID,
      OU_ID: row.OU_ID,
      ORG_ID: row.ORG_ID,
      POSITION_ID: row.POSITION_ID,
      GRADE_ID: row.GRADE_ID
    }
  };
};
