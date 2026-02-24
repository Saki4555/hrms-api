import express from "express";
import * as controller from "../controllers/location.controller.js";


const router = express.Router();

router.get("/countries",               controller.fetchCountries);
router.get("/region/:countryId",      controller.fetchRegions);
router.get("/district/:regionId",     controller.fetchDistricts);
router.get("/upazilla/:districtId",   controller.fetchUpazillas);

export default router;