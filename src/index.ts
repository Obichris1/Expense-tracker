import * as dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import routes from "./routes";

import { serve } from "inngest/express";
import { inngest } from "./inngest";
import { functions } from "./inngest/functions";

dotenv.config();

// =========================
// ENVIRONMENT SETUP
// =========================
const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || 3000;

const CLIENT_URL =
  NODE_ENV === "production"
    ? process.env.CLIENT_URL
    : "http://localhost:3001";

// =========================
// ERROR HANDLERS
// =========================
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

// =========================
// APP SETUP
// =========================
const app = express();

app.use(cookieParser());

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

// =========================
// ROUTES
// =========================
app.use("/api-v1", routes);
app.use("/api/inngest", serve({ client: inngest, functions }));

// =========================
// HEALTH CHECK (GOOD FOR PROD)
// =========================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    environment: NODE_ENV,
  });
});

// =========================
// 404 HANDLER
// =========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`CORS enabled for: ${CLIENT_URL}`);
});