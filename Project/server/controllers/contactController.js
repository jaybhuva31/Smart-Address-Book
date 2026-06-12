import axios from "axios";
import { dbOps } from "../models/db.js";

// Helper to format IST date/time
const getISTDateTime = () => {
  const now = new Date();
  
  // Format Date: DD/MM/YYYY
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  // Format Time: HH:MM:SS AM/PM
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;

  return { dateStr, timeStr };
};

// Sync helper
export const syncToGoogleSheets = async (webhookUrl, contact) => {
  if (!webhookUrl) return false;

  const { dateStr, timeStr } = getISTDateTime();

  const payload = {
    date: dateStr,
    time: timeStr,
    mobile: contact.mobile || "",
    whatsapp: contact.whatsapp || "",
    name: contact.name || "",
    village: contact.village || "",
    address: contact.address || "",
    notes: contact.notes || "",
    categories: contact.categories || [],
    category: (contact.categories || []).join(", ") // for backwards compatibility
  };

  try {
    const response = await axios.post(webhookUrl, payload, {
      timeout: 10000,
      headers: {
        "Content-Type": "application/json"
      }
    });
    return response.status === 200 || response.status === 201;
  } catch (err) {
    console.error("Google Sheet webhook error:", err.message);
    throw err;
  }
};

// Get Settings helper
const getSettings = async () => {
  if (dbOps.isFirebase()) {
    try {
      const snap = await dbOps.getAdminUser("settings_doc"); // fallback mock config
      if (snap) return snap;
    } catch (e) {}
  }
  // Local Settings fallback from local storage wrapper
  try {
    const local = await dbOps.getAdminUser("admin"); // look at local_db structure or configs
    return {
      sheetsWebhook: local?.sheetsWebhook || "",
      sheetsViewLink: local?.sheetsViewLink || ""
    };
  } catch (e) {
    return { sheetsWebhook: "", sheetsViewLink: "" };
  }
};

// --- API METHODS ---

export const getContacts = async (req, res) => {
  try {
    const list = await dbOps.getContacts();
    return res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    console.error("Fetch contacts error:", err);
    return res.status(500).json({ success: false, message: "Error fetching contacts" });
  }
};

export const addContact = async (req, res) => {
  const { name, mobile, whatsapp, village, address, notes, categories } = req.body;
  const webhookUrl = req.headers["x-sheets-webhook"] || "";

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "Name is required" });
  }
  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ success: false, message: "Mobile number is required" });
  }
  if (!/^\d{10}$/.test(mobile.trim())) {
    return res.status(400).json({ success: false, message: "Mobile number must be 10 digits" });
  }

  try {
    // Check duplicate phone numbers
    const allContacts = await dbOps.getContacts();
    const isDuplicate = allContacts.some(c => c.mobile === mobile.trim());
    if (isDuplicate) {
      return res.status(409).json({ success: false, message: "A contact with this mobile number is already registered" });
    }

    const contactData = {
      name: name.trim(),
      mobile: mobile.trim(),
      whatsapp: whatsapp ? whatsapp.trim() : mobile.trim(),
      village: village || "",
      address: address || "",
      notes: notes || "",
      categories: categories || ["General"],
      createdAt: new Date().toISOString(),
      syncStatus: "pending"
    };

    // Save in Database (initial status remains 'pending' until a sync attempt is made)
    let contact = await dbOps.addContact(contactData);
    let syncSuccess = false;
    let syncErrorMsg = "";

    // Sync to Sheets only if webhook URL is provided. If no webhook is configured,
    // leave the record as 'pending' (not yet attempted).
    if (webhookUrl) {
      try {
        await syncToGoogleSheets(webhookUrl, contact);
        contact = await dbOps.updateContact(contact.id, { syncStatus: "synced" });
        syncSuccess = true;
      } catch (err) {
        contact = await dbOps.updateContact(contact.id, { syncStatus: "failed" });
        syncErrorMsg = err.message;
      }
    } else {
      // No webhook configured; do not mark as failed — leave as pending.
      syncErrorMsg = "Google Sheets Webhook URL not configured. Sync not attempted.";
    }

    return res.status(201).json({
      success: true,
      message: syncSuccess ? "Contact added successfully!" : "Contact added successfully (sheets sync pending or failed).",
      syncStatus: contact.syncStatus,
      syncError: syncErrorMsg,
      data: contact
    });

  } catch (err) {
    console.error("Add contact error:", err);
    return res.status(500).json({ success: false, message: "Error saving contact: " + err.message });
  }
};

export const updateContact = async (req, res) => {
  const { id } = req.params;
  const { name, mobile, whatsapp, village, address, notes, categories } = req.body;
  const webhookUrl = req.headers["x-sheets-webhook"] || "";

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "Name is required" });
  }
  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ success: false, message: "Mobile is required" });
  }

  try {
    // Check duplicate phone numbers (excluding self)
    const allContacts = await dbOps.getContacts();
    const isDuplicate = allContacts.some(c => c.mobile === mobile.trim() && c.id !== id);
    if (isDuplicate) {
      return res.status(409).json({ success: false, message: "A contact with this mobile number is already registered" });
    }

    const updateData = {
      name: name.trim(),
      mobile: mobile.trim(),
      whatsapp: whatsapp ? whatsapp.trim() : mobile.trim(),
      village: village || "",
      address: address || "",
      notes: notes || "",
      categories: categories || ["General"],
      syncStatus: "pending"
    };

    let updatedContact = await dbOps.updateContact(id, updateData);
    let syncSuccess = false;

    // Attempt sync only if webhook present. Otherwise keep status as 'pending'.
    if (webhookUrl) {
      try {
        await syncToGoogleSheets(webhookUrl, updatedContact);
        updatedContact = await dbOps.updateContact(id, { syncStatus: "synced" });
        syncSuccess = true;
      } catch (err) {
        updatedContact = await dbOps.updateContact(id, { syncStatus: "failed" });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Contact updated successfully!",
      syncStatus: updatedContact.syncStatus,
      data: updatedContact
    });

  } catch (err) {
    console.error("Update contact error:", err);
    return res.status(500).json({ success: false, message: "Error updating contact" });
  }
};

export const deleteContact = async (req, res) => {
  const { id } = req.params;

  try {
    await dbOps.deleteContact(id);
    return res.status(200).json({ success: true, message: "Contact deleted successfully!", id });
  } catch (err) {
    console.error("Delete contact error:", err);
    return res.status(500).json({ success: false, message: "Error deleting contact" });
  }
};

// Retry failed syncs
export const retryFailedSyncs = async (req, res) => {
  const webhookUrl = req.headers["x-sheets-webhook"] || "";

  if (!webhookUrl) {
    return res.status(400).json({ success: false, message: "Google Sheets Webhook URL not configured." });
  }

  try {
    const allContacts = await dbOps.getContacts();
    // Retry for any contact that is not already marked as 'synced' (includes 'pending' and 'failed')
    const contactsToRetry = allContacts.filter(c => c.syncStatus !== "synced");

    if (contactsToRetry.length === 0) {
      return res.status(200).json({ success: true, message: "No pending syncs left", synced: 0, failed: 0 });
    }

    let successCount = 0;
    let failCount = 0;

    for (const contact of contactsToRetry) {
      try {
        await syncToGoogleSheets(webhookUrl, contact);
        await dbOps.updateContact(contact.id, { syncStatus: "synced" });
        successCount++;
      } catch (e) {
        await dbOps.updateContact(contact.id, { syncStatus: "failed" });
        failCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Sync completed",
      synced: successCount,
      failed: failCount
    });

  } catch (err) {
    console.error("Retry syncs error:", err);
    return res.status(500).json({ success: false, message: "Error retrying syncs" });
  }
};

// Connection Test
export const testSheetsConnection = async (req, res) => {
  const { webhookUrl } = req.body;

  if (!webhookUrl) {
    return res.status(400).json({ success: false, message: "Webhook URL is required" });
  }

  try {
    const testPayload = {
      date: new Date().toLocaleDateString("en-US"),
      time: new Date().toLocaleTimeString(),
      name: "TEST CONNECTION",
      mobile: "0000000000",
      whatsapp: "0000000000",
      village: "TEST VILLAGE",
      address: "TEST ADDRESS",
      notes: "System Connection Test",
      categories: ["General"],
      category: "General"
    };

    const response = await axios.post(webhookUrl, testPayload, { timeout: 8000 });
    if (response.status === 200 || response.status === 201) {
      return res.status(200).json({ success: true, message: "Connection successful! Google Sheets is working properly." });
    }
    return res.status(400).json({ success: false, message: `Google Sheets returned response code: ${response.status}` });
  } catch (err) {
    return res.status(400).json({ success: false, message: `Connection failed: ${err.message}` });
  }
};
