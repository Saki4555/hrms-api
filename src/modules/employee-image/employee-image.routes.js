import express from "express";
import multer from "multer";
import * as imageController from "./employee-image.controller.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

router.post("/:personId",        upload.single("image"), imageController.upload);
router.get("/person/:personId",                          imageController.getByPersonId);
router.get("/:id",                                       imageController.getById);
router.put("/:personId",         upload.single("image"), imageController.update);
router.delete("/:id",                                    imageController.remove);

export default router;