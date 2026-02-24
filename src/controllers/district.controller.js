import * as districtService from "../services/district.service.js";


/* CREATE */
export const create = async (req, res) => {
  try {
    await districtService.createDistrict(req.body);
    res.status(201).json({
      success: true,
      message: "District Created Successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* GET ALL */
export const getAll = async (req, res) => {
  try {
    const data = await districtService.getAllDistricts();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* GET SINGLE */
export const getSingle = async (req, res) => {
  try {
    const data = await districtService.getDistrictById(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "District Not Found"
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* UPDATE */
export const update = async (req, res) => {
  try {
    const affected = await districtService.updateDistrict(
      req.params.id,
      req.body
    );

    if (!affected) {
      return res.status(404).json({
        success: false,
        message: "District Not Found"
      });
    }

    res.json({
      success: true,
      message: "District Updated Successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};