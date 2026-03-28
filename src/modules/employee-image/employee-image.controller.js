import * as imageService from "./employee-image.service.js";

/* POST — upload image for an employee */
export const upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }
    const result = await imageService.uploadImage(req.params.personId, req.file.buffer);
    res.status(201).json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* GET — latest active image by person ID */
export const getByPersonId = async (req, res) => {
  try {
    const row = await imageService.getImageByPersonId(req.params.personId);
    if (!row) return res.status(404).json({ error: "No image found" });

    res.set("Content-Type", "image/jpeg");
    res.send(row.IMAGE);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* GET — image by record ID */
export const getById = async (req, res) => {
  try {
    const row = await imageService.getImageById(req.params.id);
    if (!row) return res.status(404).json({ error: "Image not found" });

    res.set("Content-Type", "image/jpeg");
    res.send(row.IMAGE);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* PUT — replace image for an employee */
export const update = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }
    const affected = await imageService.updateImage(req.params.personId, req.file.buffer);
    if (!affected) return res.status(404).json({ error: "No active image found for this employee" });

    res.json({ success: true, message: "Image updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* DELETE — soft delete by record ID */
export const remove = async (req, res) => {
  try {
    const affected = await imageService.deleteImage(req.params.id);
    if (!affected) return res.status(404).json({ error: "Image not found" });

    res.json({ success: true, message: "Image deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};