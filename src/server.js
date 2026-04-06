import express from "express";
import { config } from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import twilio from "twilio";
import cookieParser from "cookie-parser";

import { connectDB, disconnectDB } from "./config/db.js";
import authRoute from "./routes/auth.route.js";

import hrOrgRoute from "./routes/hrOrg.route.js"
import hrOrgPositionRoute from "./routes/hr-org-position.route.js";
import employeeRoute from "./routes/hr-employee.route.js";
import hrPersonTypeRoutes from "./routes/hr-person-type.route.js";
import hrOrgTypeRoutes from "./routes/hr-org-type.route.js";
import locationRoutes from "./routes/hr-location.route.js";
import positionRoutes from "./routes/hr-position.route.js";


import hrGradeRoutes from "./routes/hr-grade.route.js";
import companyRoutes from "./routes/hr-company.routes.js";
import countryRoutes from "./routes/country.routes.js";
import districtRoutes from "./routes/district.routes.js";
import regionRoutes from "./routes/region.routes.js";
import upazillaRoutes from "./routes/upazilla.routes.js";
import location  from "./routes/location.routes.js";
import holidayRoutes from "./routes/hr-holiday-calender.routes.js";
import holidayTypeRoutes from "./routes/hr-holiday-type.routes.js";
import attLogRoutes from "./routes/att-log.routes.js";
import shiftRoutes from "./routes/hr-shift-routes.js";
import contractRoutes from "./routes/hr-contract.routes.js";
import employeeLiteRoutes from "./modules/hr-employee-lite/routes.js";
import empImageRoutes from "./modules/employee-image/employee-image.routes.js";

import leaveTypeRoutes from "./modules/leave-type/leave-type.routes.js";

import leaveRoutes from "./routes/hr-leave-request.routes.js";

import userManagementRoutes from "./modules/user-management/user-management.routes.js";


import attendanceRoutes from "./modules/attendacne/attendance.routes.js";
import { startAttendanceScheduler } from "./modules/attendacne/attendance.scheduler.js";




import supervisorRoutes     from "./modules/employee-supervisor/employee-supervisor.routes.js";
import notificationRoutes   from "./modules/employee-notification/employee-notification.routes.js";

import inventoriesRoutes     from './modules/inventory/inventory.route.js';
import itemRoutes     from './modules/item/item.route.js';
import itemStockRoutes     from './modules/item-stock/item-stock.route.js';
import storeRoutes     from './modules/store/store.route.js';
import uomRoutes from "./modules/inv_uom/inv-uom.route.js";

import reqMasterRouter from './modules/requisition/req-master.route.js';
import reqDetailRouter from './modules/requisition/req-detail.route.js';
import requisitionRoutes from './modules/requisition-management/requisition.route.js';


import { v2 as cloudinary } from "cloudinary";

config();

/* ===========================
   CLOUDINARY CONFIG
=========================== */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ===========================
   APP SETUP
=========================== */
const app = express();
const PORT = process.env.PORT || 4000;

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://192.168.1.137:5173",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};



// Connect DB - Oracle connection will now be used
await connectDB();

// Middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));


/* ===========================
   TWILIO SETUP
=========================== */
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken || !whatsappFrom) {
  console.error("❌ Missing Twilio credentials");
  process.exit(1);
}

const twilioClient = twilio(accountSid, authToken);

/* ===========================
   SEND WHATSAPP WITH PDF
=========================== */
app.post("/api/send-whatsapp", async (req, res) => {
  console.log("📨 Received WhatsApp request");

  try {
    const { to, employeeName, month, pdfBase64 } = req.body;

    // Validation
    if (!to || !employeeName || !month || !pdfBase64) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!to.startsWith("+")) {
      return res.status(400).json({
        error: "Phone number must start with + and country code",
      });
    }

    console.log(`📱 To: ${to}`);
    console.log(`👤 Employee: ${employeeName}`);

    /* ===========================
       UPLOAD PDF TO CLOUDINARY
    =========================== */
    const uploadResult = await cloudinary.uploader.upload(
      `data:application/pdf;base64,${pdfBase64}`,
      {
        folder: "salary-slips",
        resource_type: "raw", // REQUIRED for PDFs
        public_id: `salary-slip-${Date.now()}`,
      }
    );

    const publicUrl = uploadResult.secure_url;

    console.log("📄 PDF uploaded:", publicUrl);

    /* ===========================
       SEND WHATSAPP MESSAGE
    =========================== */
    const message = await twilioClient.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${to}`,
      body: `Hello ${employeeName},

Your salary slip for ${month} is ready. Please find the attached PDF document.

Best regards,
Pacific Quality Control Centre Ltd. - PQC`,
      mediaUrl: [publicUrl],
    });

    console.log("✅ Message sent:", message.sid);

    return res.status(200).json({
      success: true,
      messageSid: message.sid,
      message: `Salary slip sent successfully to ${to}`,
    });
  } catch (error) {
    console.error("❌ Error:", error);

    // Twilio-specific errors
    if (error.code === 21211) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    if (error.code === 21408) {
      return res.status(400).json({
        error:
          'This number must join the WhatsApp sandbox first. Send "join <sandbox-keyword>" to the Twilio WhatsApp number.',
      });
    }

    if (error.code === 21620) {
      return res.status(400).json({
        error: "Invalid media URL. PDF could not be attached.",
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to send WhatsApp message",
    });
  }
});

/* ===========================
   ROUTES
=========================== */
app.use("/api/v1/auth", authRoute);

app.get("/message", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to HRMS API",
  });
});

app.get("/api/v1/test/check", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Test",
  });
});


app.use("/api/hr-org", hrOrgRoute);
app.use("/api/hr-org-position", hrOrgPositionRoute);
app.use("/api/hr-employee", employeeRoute);
app.use("/api/hr-person-type", hrPersonTypeRoutes);
app.use("/api/hr-org-type", hrOrgTypeRoutes);
app.use("/api/hr-location", locationRoutes);
app.use("/api/hr-position", positionRoutes);
app.use("/api/hr-grade", hrGradeRoutes);
app.use("/api/hr-company", companyRoutes);
app.use("/api/country", countryRoutes);
app.use("/api/district", districtRoutes);
app.use("/api/region", regionRoutes);
app.use("/api/upazilla", upazillaRoutes);
app.use("/api/locations", location);
app.use("/api/holiday", holidayRoutes);
app.use("/api/holiday-type", holidayTypeRoutes);
app.use("/api", attLogRoutes);
app.use("/api/hr-shift", shiftRoutes);
app.use("/api/hr-contract", contractRoutes);
app.use("/api/hr-employee-lite", employeeLiteRoutes);
app.use("/api/emp-images", empImageRoutes);

app.use("/api/leave-types", leaveTypeRoutes);

app.use("/api/leave-request", leaveRoutes);


app.use("/api/users", userManagementRoutes);

app.use("/api/supervisors",    supervisorRoutes);
app.use("/api/notifications",  notificationRoutes);

app.use("/api/inventory",  inventoriesRoutes);
app.use("/api/item",  itemRoutes);
app.use("/api/item-stock",  itemStockRoutes);

app.use("/api/stores", storeRoutes);
app.use("/api/inv-uom", uomRoutes);


app.use('/api/reqmaster', reqMasterRouter);
app.use('/api/reqdetail', reqDetailRouter);
app.use('/api/requisitions', requisitionRoutes);


app.use("/api/attendance", attendanceRoutes);


startAttendanceScheduler();

/* ===========================
   SERVER
=========================== */
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("📱 WhatsApp Salary Slip Service Started");
});

/* ===========================
   ERROR HANDLERS
=========================== */
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(async () => {
    await disconnectDB();
    process.exit(1);
  });
});

process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception:", err);
  await disconnectDB();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received");
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});