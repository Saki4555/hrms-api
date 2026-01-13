import express from "express";
import { config } from "dotenv";
import cors from "cors";
import { connectDB, disconnectDB } from "./config/db.js";
import authRoute from "./routes/auth.route.js";

config();

const app = express();
const PORT = process.env.PORT || 4000;

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

// Connect to database
connectDB();

// Middleware - BEFORE routes
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
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

// Start server AFTER everything is set up
const server = app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});

// Error handlers remain the same
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
  console.log("SIGTERM received, shutting down gracefully");
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});