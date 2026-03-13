import * as contractService from "../services/hr-contract.service.js";


export const createContract = async (req, res) => {

  try {

    const result = await contractService.createContract(req.body);

    res.json(result);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};


export const getAllContracts = async (req, res) => {

  try {

    const data = await contractService.getAllContracts();

    res.json({ message: true, count: data.length, data});

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};


export const getContractById = async (req, res) => {

  try {

    const data = await contractService.getContractById(req.params.id);

    res.json(data);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};


export const updateContract = async (req, res) => {

  try {

    const result = await contractService.updateContract(
      req.params.id,
      req.body
    );

    res.json(result);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};


export const deleteContract = async (req, res) => {

  try {

    const result = await contractService.deleteContract(req.params.id);

    res.json(result);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};