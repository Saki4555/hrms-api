import { Router } from "express";
import {
  getAll,
  getOne,
  create,
  update,
  approveOne,
  approveAll,
} from "../requisition-master/requisition-master.controller.js";

const router = Router();

router.get("/",                                         getAll);
router.get("/:tid",                                     getOne);
router.post("/",                                        create);
router.put("/:tid",                                     update);
router.patch("/:masterTid/details/:detailTid/approve",  approveOne);
router.patch("/:masterTid/approve-all",                 approveAll);

export default router;