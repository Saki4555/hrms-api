import { getConnection } from "../config/db.js";
// import oracledb from "oracledb";

export const getCountries = async () => {
  const conn = await getConnection();
  const result = await conn.execute(
    `SELECT COUNTRY_ID, COUNTRY_NAME
       FROM COUNTRY_LIST 
      ORDER BY COUNTRY_NAME`,
    [], { outFormat: 4002 }
  );
  await conn.close();
  return result.rows;
};

export const getRegionsByCountry = async (countryId) => {
  const conn = await getConnection();
  const result = await conn.execute(
    `SELECT REGION_ID, REGION_NAME 
       FROM REGION_LIST 
      WHERE COUNTRY_ID = :COUNTRY_ID 
      ORDER BY REGION_NAME`,
    { COUNTRY_ID: Number(countryId) },
    { outFormat: 4002 }
  );
  await conn.close();
  return result.rows;
};

export const getDistrictsByRegion = async (regionId) => {
  const conn = await getConnection();
  const result = await conn.execute(
    `SELECT DISTRICT_ID, DISTRICT_NAME 
       FROM DISTRICT_LIST 
      WHERE REGION_ID = :REGION_ID 
      ORDER BY DISTRICT_NAME`,
    { REGION_ID: Number(regionId) },
    {  outFormat: 4002 }
  );
  await conn.close();
  return result.rows;
};

export const getUpazillasByDistrict = async (districtId) => {
  const conn = await getConnection();
  const result = await conn.execute(
    `SELECT UPAZILLA_ID, UPAZILLA_NAME 
       FROM UPAZILLA_LIST 
      WHERE DISTRICT_ID = :DISTRICT_ID 
      ORDER BY UPAZILLA_NAME`,
    { DISTRICT_ID: Number(districtId) },
    {  outFormat: 4002 }
  );
  await conn.close();
  return result.rows;
};