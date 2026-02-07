import express from "express";
import { config } from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import twilio from "twilio";

import { connectDB, disconnectDB } from "./config/db.js";
import authRoute from "./routes/auth.route.js";

import hrOrgRoute from "./routes/hrOrg.route.js"
import hrOrgPositionRoute from "./routes/hr-org-position.route.js";
import employeeRoute from "./routes/hr-employee.route.js";

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
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

// Connect DB - Oracle connection will now be used
await connectDB();

// Middleware
app.use(cors(corsOptions));
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