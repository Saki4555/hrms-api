import * as regionService from "../services/region.service.js";


/* CREATE */
export const create = async (req, res) => {
  try {
    await regionService.createRegion(req.body);
    res.status(201).json({
      success: true,
      message: "Region Created Successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* GET ALL */
export const getAll = async (req, res) => {
  try {
    const data = await regionService.getAllRegions();
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
    const data = await regionService.getRegionById(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Region Not Found"
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
    const affected = await regionService.updateRegion(
      req.params.id,
      req.body
    );

    if (!affected) {
      return res.status(404).json({
        success: false,
        message: "Region Not Found"
      });
    }

    res.json({
      success: true,
      message: "Region Updated Successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};