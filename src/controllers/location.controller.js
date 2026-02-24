import {
  getCountries,
  getRegionsByCountry,
  getDistrictsByRegion,
  getUpazillasByDistrict,
} from "../services/location.service.js";

export const fetchCountries = async (req, res) => {
  try {
    const data = await getCountries();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const fetchRegions = async (req, res) => {
  try {
    const data = await getRegionsByCountry(req.params.countryId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const fetchDistricts = async (req, res) => {
  try {
    const data = await getDistrictsByRegion(req.params.regionId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const fetchUpazillas = async (req, res) => {
  try {
    const data = await getUpazillasByDistrict(req.params.districtId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};