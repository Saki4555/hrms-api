import {
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
  getEmployeeList,
  getEmployeeById
} from "../services/hr-employee.service.js";

/* CREATE */
export const createEmployeeHandler = async (req, res) => {
  try {
   const data =  await createEmployee(req.body);
 console.log("data",data)
    res.status(201).json({
      message: "HR_EMPLOYEE created successfully"
     
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* UPDATE */
export const updateEmployeeHandler = async (req, res) => {
  try {
    const { personId } = req.params;

    await updateEmployee(personId, req.body);

    res.json({
      message: "HR_EMPLOYEE updated successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* SOFT DELETE */
export const deleteEmployeeHandler = async (req, res) => {
  try {
    const { personId } = req.params;

    await softDeleteEmployee(personId);

    res.json({
      message: "HR_EMPLOYEE soft deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* GET ACTIVE IDS */
export const getEmployeeHandeler = async (req, res) => {
  try {
    const data = await getEmployeeList();

    res.json({
      count: data.length,
      data: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// controllers/hrEmployee.controller.js


export const getEmployeeByIdController = async (req, res) => {
  try {
    const { personId } = req.params;

    const data = await getEmployeeById(personId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


