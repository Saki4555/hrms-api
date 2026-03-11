import * as service from "../services/att-log.service.js";
import { verifyToken } from "../utils/auth.js";


export const create = async (req, res) => {
  try {

    verifyToken(req);

    await service.createAttLog(req.body);

    res.json({ message: "Inserted Successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* GET ALL WITH PAGINATION */
export const getAll = async (req, res) => {

  try {

    verifyToken(req);

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const data = await service.getAllAttLogs(page, limit);

    res.json({
      page,
      limit,
      data
    });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};


/* GET SINGLE */
export const getSingle = async (req, res) => {

  try {

    verifyToken(req);

    const data = await service.getSingleAttLog(req.params.empno);

    res.json(data);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};


export const update = async (req, res) => {

  try {

    verifyToken(req);

    await service.updateAttLog(req.params.empno, req.body);

    res.json({ message: "Updated Successfully" });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};


export const remove = async (req, res) => {

  try {

    verifyToken(req);

    await service.deleteAttLog(req.params.empno);

    res.json({ message: "Deleted Successfully" });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};