import express from "express";
import { login, changePassword } from "../controllers/authController.js";
import { 
  getContacts, 
  addContact, 
  updateContact, 
  deleteContact, 
  retryFailedSyncs, 
  testSheetsConnection 
} from "../controllers/contactController.js";
import { getVillages, addVillage, deleteVillage } from "../controllers/villageController.js";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- Auth Routes ---
router.post("/auth/login", login);
router.post("/auth/change-password", protect, changePassword);

// --- Contacts Routes ---
router.get("/contacts", protect, getContacts);
router.post("/contacts", protect, addContact);
router.put("/contacts/:id", protect, updateContact);
router.delete("/contacts/:id", protect, deleteContact);
router.post("/contacts/retry-sync", protect, retryFailedSyncs);
router.post("/contacts/test-connection", protect, testSheetsConnection);

// --- Villages Routes ---
router.get("/villages", protect, getVillages);
router.post("/villages", protect, addVillage);
router.delete("/villages/:id", protect, deleteVillage);

// --- Settings Routes ---
router.get("/settings", protect, getSettings);
router.post("/settings", protect, updateSettings);

export default router;
