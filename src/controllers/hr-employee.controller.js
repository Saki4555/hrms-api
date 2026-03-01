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
    const result = await createEmployee(req.body);
    res.status(201).json({
      message: "Employee Created Successfully",
      ...result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Employee Create Failed",
      error: err.message
    });
  }
};


/* UPDATE */
export const updateEmployeeHandler = async (req, res) => {
  try {
    const { personId } = req.params;
    await updateEmployee(personId, req.body);
    res.json({ message: "HR_EMPLOYEE updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* SOFT DELETE */
export const deleteEmployeeHandler = async (req, res) => {
  try {
    const { personId } = req.params;
    await softDeleteEmployee(personId);
    res.json({ message: "HR_EMPLOYEE soft deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* GET LIST — pagination + search + filter + sort

   Query params:
   ┌────────────┬──────────────────────────────────────────────────────────────────┐
   │ page       │ page number                              (default: 1)            │
   │ limit      │ rows per page                            (default: 10)           │
   │ search     │ FIRST_NAME / LAST_NAME / EMP_NO / NID                            │
   │ sortBy     │ column to sort  (default: LAST_ACTIVITY)                         │
   │            │   LAST_ACTIVITY → updated/created employee comes first           │
   │            │   FIRST_NAME, LAST_NAME, EMP_NO, JOIN_DATE,                      │
   │            │   DATE_OF_BIRTH, CREATION_DATE, LAST_UPDATE_DATE, NID            │
   │ sortOrder  │ ASC | DESC                               (default: DESC)         │
   │ personType │ filter by PERSON_TYPE_ID                 (exact ID)              │
   │ gender     │ filter by GENDER                         (M | F)                 │
   │ companyId  │ filter by COMPANY_ID                     (exact ID)              │
   │ positionId │ filter by POSITION_ID                    (exact ID)              │
   │ countryId  │ filter by COUNTRY_LIST.COUNTRY_ID        (exact ID)              │
   └────────────┴──────────────────────────────────────────────────────────────────┘

   Examples:
   GET /api/employees?page=1&limit=10
   GET /api/employees?search=john
   GET /api/employees?gender=M&companyId=3
   GET /api/employees?personType=2&countryId=18
   GET /api/employees?search=ahmed&sortBy=FIRST_NAME&sortOrder=ASC
   GET /api/employees?page=2&limit=20&gender=F&companyId=1&positionId=5&countryId=18
*/
export const getEmployeeHandeler = async (req, res) => {
  try {
    const {
      page       = 1,
      limit      = 10,
      search     = "",
      sortBy     = "LAST_ACTIVITY",  // updated/created employee floats to top
      sortOrder  = "DESC",
      personType = "",
      gender     = "",
      companyId  = "",
      positionId       = "",
      countryId        = "",
    } = req.query;

    const result = await getEmployeeList({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      personType,
      gender,
      companyId,
      positionId,
      countryId,
    });

    res.json({
      ...result.pagination,
      data: result.data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* GET BY ID */
export const getEmployeeByIdController = async (req, res) => {
  try {
    const { personId } = req.params;
    const data = await getEmployeeById(personId);

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    res.json(...data);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};