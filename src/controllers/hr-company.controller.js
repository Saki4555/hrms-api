
import * as companyService from "../services/hr-company.service.js";

/* CREATE */
export const create = async (req, res) => {
  try {
    await companyService.createCompany(req.body);
    res.status(201).json({ message: "Company created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* UPDATE */
export const update = async (req, res) => {
  try {
    await companyService.updateCompany(req.params.id, req.body);
    res.json({ message: "Company updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* DELETE (SOFT) */
export const remove = async (req, res) => {
  try {
    await companyService.deleteCompany(req.params.id);
    res.json({ message: "Company deleted (soft) successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* GET ALL */
export const getAll = async (req, res) => {
  try {
    const data = await companyService.getAllCompanies();
    res.json({success: true, count: data.length, data:data});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* GET ONE */
export const getOne = async (req, res) => {
  try {
    const data = await companyService.getCompanyById(req.params.id);

    if (!data)
      return res.status(404).json({ message: "Company not found" });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};