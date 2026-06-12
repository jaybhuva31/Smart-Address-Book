import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_PATH = path.join(__dirname, "..", "settings.json");

export const getSettings = (req, res) => {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return res.status(200).json({
        success: true,
        data: { sheetsWebhook: "", sheetsViewLink: "" }
      });
    }
    const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
    return res.status(200).json({
      success: true,
      data: {
        sheetsWebhook: data.sheetsWebhook || "",
        sheetsViewLink: data.sheetsViewLink || ""
      }
    });
  } catch (err) {
    console.error("Get settings error:", err);
    return res.status(500).json({ success: false, message: "Error loading settings" });
  }
};

export const updateSettings = (req, res) => {
  const { sheetsWebhook, sheetsViewLink } = req.body;

  try {
    const settings = {
      sheetsWebhook: (sheetsWebhook || "").trim(),
      sheetsViewLink: (sheetsViewLink || "").trim(),
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8");
    return res.status(200).json({ success: true, message: "Settings updated successfully!" });
  } catch (err) {
    console.error("Update settings error:", err);
    return res.status(500).json({ success: false, message: "Error updating settings" });
  }
};

// Helper for cron task to get webhook URL
export const getWebhookUrlSync = () => {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
      return data.sheetsWebhook || "";
    }
  } catch (e) {
    console.error("Error reading webhook URL in cron task:", e);
  }
  return "";
};
