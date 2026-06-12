import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import apiRoutes from "./routes/api.js";
import { dbOps } from "./models/db.js";
import { syncToGoogleSheets } from "./controllers/contactController.js";
import { getWebhookUrlSync } from "./controllers/settingsController.js";

// Load configuration
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: "*", // allow all origins for easy client interface, configure as needed for production
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Sheets-Webhook"]
}));
app.use(express.json());

// Routes
app.use("/api", apiRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    mode: dbOps.isFirebase() ? "Firebase Live" : "Local Demo DB" 
  });
});

// Root route
app.get("/", (req, res) => {
  res.send("VyaparSetu CRM Server is running.");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// --- Background Job: Auto-Retry Failed Google Sheets Syncs ---
// Runs every 15 minutes (or edit cron expression to match requirements)
cron.schedule("*/15 * * * *", async () => {
  console.log("CRON: Checking for failed Google Sheets syncs...");
  const webhookUrl = getWebhookUrlSync();

  if (!webhookUrl) {
    console.log("CRON: Skipping sync. Webhook URL is not configured.");
    return;
  }

  try {
    const contacts = await dbOps.getContacts();
    const failedContacts = contacts.filter(c => c.syncStatus === "failed");

    if (failedContacts.length === 0) {
      console.log("CRON: No failed contacts to sync.");
      return;
    }

    console.log(`CRON: Found ${failedContacts.length} contacts failed to sync. Starting retries...`);
    
    for (const contact of failedContacts) {
      try {
        const success = await syncToGoogleSheets(webhookUrl, contact);
        if (success) {
          await dbOps.updateContact(contact.id, { syncStatus: "synced" });
          console.log(`CRON: Successfully synced contact ${contact.name} (${contact.id})`);
        }
      } catch (err) {
        console.error(`CRON: Failed to sync contact ${contact.name} (${contact.id}):`, err.message);
      }
    }
  } catch (err) {
    console.error("CRON: Error in auto-retry cron task:", err.message);
  }
});
