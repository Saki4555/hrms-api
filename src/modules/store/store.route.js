import express from "express";
import {
  createStore,
  getAllStores,
  getStoreById,
  updateStore,
  deleteStore,
} from "../store/store.controller.js";

const router = express.Router();

router.post("/", createStore);
router.get("/", getAllStores);
router.get("/:id", getStoreById);
router.put("/:id", updateStore);
router.delete("/:id", deleteStore);

export default router;
