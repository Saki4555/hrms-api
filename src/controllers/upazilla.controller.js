import * as upazillaService from "../services/upazilla.service.js";


/* CREATE */
export const create = async (req, res) => {
  try {
    await upazillaService.createUpazilla(req.body);
    res.status(201).json({
      success: true,
      message: "Upazilla Created Successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* GET ALL */
export const getAll = async (req, res) => {
  try {
    const data = await upazillaService.getAllUpazillas();
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
    const data = await upazillaService.getUpazillaById(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Upazilla Not Found"
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
    const affected = await upazillaService.updateUpazilla(
      req.params.id,
      req.body
    );

    if (!affected) {
      return res.status(404).json({
        success: false,
        message: "Upazilla Not Found"
      });
    }

    res.json({
      success: true,
      message: "Upazilla Updated Successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};