import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_DB_PATH = path.join(__dirname, "..", "local_db.json");
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "..", "..", "firebase", "serviceAccountKey.json");

let db = null;
let isFirebaseConnected = false;

// Attempt to initialize Firebase Admin SDK
try {
  let serviceAccount = null;
  
  if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    const raw = fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8");
    serviceAccount = JSON.parse(raw);
    console.log("Firebase Service Account key found at:", SERVICE_ACCOUNT_PATH);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    isFirebaseConnected = true;
    console.log("Firebase Admin SDK successfully connected to Firestore.");
  } else {
    console.log("No Firebase Service Account key found. Starting in Local Demo Mode.");
  }
} catch (err) {
  console.error("Firebase Admin SDK failed to initialize:", err.message);
  console.log("Falling back to Local Demo Mode.");
}

// Helpers for Local JSON Database
const readLocalDb = () => {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const initialDb = {
      contacts: [],
      cities: [
        { id: "1", villageName: "Ahmedabad", createdAt: new Date().toISOString() },
        { id: "2", villageName: "Surat", createdAt: new Date().toISOString() },
        { id: "3", villageName: "Rajkot", createdAt: new Date().toISOString() },
        { id: "4", villageName: "Vadodara", createdAt: new Date().toISOString() },
        { id: "5", villageName: "Bhavnagar", createdAt: new Date().toISOString() },
        { id: "6", villageName: "Jamnagar", createdAt: new Date().toISOString() },
        { id: "7", villageName: "Junagadh", createdAt: new Date().toISOString() }
      ],
      admins: [
        {
          id: "1",
          username: "admin",
          // passwordHash for admin123 generated using bcrypt
          passwordHash: "$2a$10$Jh3zvgRTFDJ/x1p6Li6XoulghtfcwopnU2cAr/BnRUCB7BV.jlICi",
          createdAt: new Date().toISOString()
        }
      ]
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initialDb, null, 2), "utf8");
    return initialDb;
  }
  return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf8"));
};

const writeLocalDb = (data) => {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf8");
};

// Database CRUD Operations Adapter
export const dbOps = {
  isFirebase: () => isFirebaseConnected,

  // --- CITIES / VILLAGES ---
  getCities: async () => {
    if (isFirebaseConnected && db) {
      const snapshot = await db.collection("cities").get();
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list.sort((a, b) => (a.villageName || "").localeCompare(b.villageName || "", "en"));
    }
    const local = readLocalDb();
    return local.cities.sort((a, b) => (a.villageName || "").localeCompare(b.villageName || "", "en"));
  },

  addCity: async (villageName) => {
    const newCity = {
      villageName,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConnected && db) {
      const docRef = await db.collection("cities").add(newCity);
      return { id: docRef.id, ...newCity };
    }

    const local = readLocalDb();
    const city = { id: Date.now().toString(), ...newCity };
    local.cities.push(city);
    writeLocalDb(local);
    return city;
  },

  deleteCity: async (id) => {
    if (isFirebaseConnected && db) {
      await db.collection("cities").doc(id).delete();
      return id;
    }
    const local = readLocalDb();
    local.cities = local.cities.filter(c => c.id !== id);
    writeLocalDb(local);
    return id;
  },

  // --- CONTACTS ---
  getContacts: async () => {
    if (isFirebaseConnected && db) {
      const snapshot = await db.collection("contacts").get();
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    }
    const local = readLocalDb();
    return local.contacts;
  },

  addContact: async (contactData) => {
    const contact = {
      ...contactData,
      createdAt: contactData.createdAt || new Date().toISOString(),
      syncStatus: contactData.syncStatus || "pending"
    };

    if (isFirebaseConnected && db) {
      const docRef = await db.collection("contacts").add(contact);
      return { id: docRef.id, ...contact };
    }

    const local = readLocalDb();
    const newContact = { id: Date.now().toString(), ...contact };
    local.contacts.push(newContact);
    writeLocalDb(local);
    return newContact;
  },

  updateContact: async (id, contactData) => {
    if (isFirebaseConnected && db) {
      await db.collection("contacts").doc(id).update(contactData);
      const docSnap = await db.collection("contacts").doc(id).get();
      return { id, ...docSnap.data() };
    }

    const local = readLocalDb();
    const idx = local.contacts.findIndex(c => c.id === id);
    if (idx !== -1) {
      local.contacts[idx] = { ...local.contacts[idx], ...contactData };
      writeLocalDb(local);
      return local.contacts[idx];
    }
    throw new Error("Contact not found");
  },

  deleteContact: async (id) => {
    if (isFirebaseConnected && db) {
      await db.collection("contacts").doc(id).delete();
      return id;
    }
    const local = readLocalDb();
    local.contacts = local.contacts.filter(c => c.id !== id);
    writeLocalDb(local);
    return id;
  },

  // --- ADMIN AUTHENTICATION ---
  getAdminUser: async (username) => {
    if (isFirebaseConnected && db) {
      const snapshot = await db.collection("admins").where("username", "==", username).limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      // Initialize default admin user if the database has no admins at all
      const allAdmins = await db.collection("admins").limit(1).get();
      if (allAdmins.empty && username === "admin") {
        const defaultAdmin = {
          username: "admin",
          // Default: admin123
          passwordHash: "$2a$10$Jh3zvgRTFDJ/x1p6Li6XoulghtfcwopnU2cAr/BnRUCB7BV.jlICi",
          createdAt: new Date().toISOString()
        };
        const docRef = await db.collection("admins").add(defaultAdmin);
        return { id: docRef.id, ...defaultAdmin };
      }
      return null;
    }

    const local = readLocalDb();
    return local.admins.find(a => a.username === username) || null;
  },

  updateAdminPassword: async (id, passwordHash) => {
    if (isFirebaseConnected && db) {
      await db.collection("admins").doc(id).update({ passwordHash });
      return true;
    }
    const local = readLocalDb();
    const idx = local.admins.findIndex(a => a.id === id);
    if (idx !== -1) {
      local.admins[idx].passwordHash = passwordHash;
      writeLocalDb(local);
      return true;
    }
    throw new Error("Admin not found");
  }
};
