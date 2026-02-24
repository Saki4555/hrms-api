import * as countryService from "../services/country.service.js";


/* CREATE */
export const create = async (req, res) => {
  try {
    await countryService.createCountry(req.body);
    res.status(201).json({
      success: true,
      message: "Country Created Successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* GET ALL */
export const getAll = async (req, res) => {
  try {
    const data = await countryService.getAllCountries();
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
    const affected = await countryService.updateCountry(
      req.params.id,
      req.body
    );

    if (!affected) {
      return res.status(404).json({
        success: false,
        message: "Country Not Found"
      });
    }

    res.json({
      success: true,
      message: "Country Updated Successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};