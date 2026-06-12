import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  getDoc 
} from "firebase/firestore";

// Helper to load firebase configuration from localStorage
export const getSavedFirebaseConfig = () => {
  try {
    const config = localStorage.getItem("crm_firebase_config");
    return config ? JSON.parse(config) : null;
  } catch (e) {
    console.error("Error reading Firebase config from localStorage:", e);
    return null;
  }
};

// Save config to localStorage
export const saveFirebaseConfig = (config) => {
  if (!config) {
    localStorage.removeItem("crm_firebase_config");
  } else {
    localStorage.setItem("crm_firebase_config", JSON.stringify(config));
  }
};

// Initialize Firebase if config exists
let app = null;
let db = null;
let isFirebaseConnected = false;

const config = getSavedFirebaseConfig();
if (config && config.apiKey && config.projectId) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApps()[0];
    }
    db = getFirestore(app);
    isFirebaseConnected = true;
    console.log("Firebase initialized successfully.");
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
}

export { isFirebaseConnected, db };

// Fallback Local Database in case Firebase is not connected (Demo Mode)
const getLocalData = (key, defaultData = []) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultData;
  } catch (e) {
    return defaultData;
  }
};

const setLocalData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Database CRUD Operations Wrapper (Firebase/LocalStorage Adapter)
export const dbOperations = {
  // Check if connected
  isConnected: () => isFirebaseConnected,

  // --- CITIES / VILLAGES ---
  getCities: async () => {
    if (isFirebaseConnected && db) {
      try {
        const querySnapshot = await getDocs(collection(db, "cities"));
        const citiesList = [];
        querySnapshot.forEach((doc) => {
          citiesList.push({ id: doc.id, ...doc.data() });
        });
        return citiesList.sort((a, b) => a.name.localeCompare(b.name, 'en'));
      } catch (err) {
        console.error("Firestore getCities error, falling back to local:", err);
      }
    }
    // Fallback
    const localCities = getLocalData("crm_local_cities", [
      { id: "1", name: "Ahmedabad" },
      { id: "2", name: "Surat" },
      { id: "3", name: "Rajkot" },
      { id: "4", name: "Vadodara" },
      { id: "5", name: "Bhavnagar" },
      { id: "6", name: "Jamnagar" },
      { id: "7", name: "Junagadh" }
    ]);
    return localCities.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  },

  addCity: async (cityName) => {
    const newCity = {
      name: cityName,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConnected && db) {
      try {
        const docRef = await addDoc(collection(db, "cities"), newCity);
        return { id: docRef.id, ...newCity };
      } catch (err) {
        console.error("Firestore addCity error, falling back to local:", err);
      }
    }

    // Fallback
    const localCities = getLocalData("crm_local_cities", []);
    const city = { id: Date.now().toString(), ...newCity };
    localCities.push(city);
    setLocalData("crm_local_cities", localCities);
    return city;
  },

  // --- CONTACTS ---
  getContacts: async () => {
    if (isFirebaseConnected && db) {
      try {
        const querySnapshot = await getDocs(collection(db, "contacts"));
        const contactsList = [];
        querySnapshot.forEach((doc) => {
          contactsList.push({ id: doc.id, ...doc.data() });
        });
        return contactsList;
      } catch (err) {
        console.error("Firestore getContacts error, falling back to local:", err);
      }
    }
    // Fallback
    return getLocalData("crm_local_contacts", []);
  },

  addContact: async (contactData) => {
    const contact = {
      ...contactData,
      createdAt: contactData.createdAt || new Date().toISOString()
    };

    if (isFirebaseConnected && db) {
      try {
        const docRef = await addDoc(collection(db, "contacts"), contact);
        return { id: docRef.id, ...contact };
      } catch (err) {
        console.error("Firestore addContact error, falling back to local:", err);
      }
    }

    // Fallback
    const localContacts = getLocalData("crm_local_contacts", []);
    const newContact = { id: Date.now().toString(), ...contact };
    localContacts.push(newContact);
    setLocalData("crm_local_contacts", localContacts);
    return newContact;
  },

  updateContact: async (id, contactData) => {
    if (isFirebaseConnected && db) {
      try {
        const docRef = doc(db, "contacts", id);
        await updateDoc(docRef, contactData);
        return { id, ...contactData };
      } catch (err) {
        console.error("Firestore updateContact error, falling back to local:", err);
      }
    }

    // Fallback
    const localContacts = getLocalData("crm_local_contacts", []);
    const index = localContacts.findIndex(c => c.id === id);
    if (index !== -1) {
      localContacts[index] = { ...localContacts[index], ...contactData };
      setLocalData("crm_local_contacts", localContacts);
      return localContacts[index];
    }
    throw new Error("Contact not found for update");
  },

  deleteContact: async (id) => {
    if (isFirebaseConnected && db) {
      try {
        const docRef = doc(db, "contacts", id);
        await deleteDoc(docRef);
        return id;
      } catch (err) {
        console.error("Firestore deleteContact error, falling back to local:", err);
      }
    }

    // Fallback
    const localContacts = getLocalData("crm_local_contacts", []);
    const filtered = localContacts.filter(c => c.id !== id);
    setLocalData("crm_local_contacts", filtered);
    return id;
  },

  // --- ADMIN AUTHENTICATION ---
  getAdminCredentials: async () => {
    if (isFirebaseConnected && db) {
      try {
        const docRef = doc(db, "admin", "credentials");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data();
        } else {
          // If Firestore is empty, initialize default credentials
          const defaultCreds = { username: "admin", password: "admin123" };
          await setDoc(docRef, defaultCreds);
          return defaultCreds;
        }
      } catch (err) {
        console.error("Firestore getAdminCredentials error, falling back to local:", err);
      }
    }

    // Fallback to local storage credentials
    return getLocalData("crm_local_admin_creds", { username: "admin", password: "admin123" });
  },

  updateAdminCredentials: async (username, password) => {
    const creds = { username, password };
    if (isFirebaseConnected && db) {
      try {
        const docRef = doc(db, "admin", "credentials");
        await setDoc(docRef, creds);
        return true;
      } catch (err) {
        console.error("Firestore updateAdminCredentials error, falling back to local:", err);
      }
    }

    // Fallback
    setLocalData("crm_local_admin_creds", creds);
    return true;
  }
};
