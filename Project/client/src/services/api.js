import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Automatically inject JWT Token and Sheets Webhook URL headers
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("crm_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    
    const webhook = localStorage.getItem("crm_sheets_webhook");
    if (webhook) {
      config.headers["X-Sheets-Webhook"] = webhook;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (username, password) => {
    const response = await api.post("/auth/login", { username, password });
    return response.data;
  },
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post("/auth/change-password", { currentPassword, newPassword });
    return response.data;
  }
};

export const contactsAPI = {
  getAll: async () => {
    const response = await api.get("/contacts");
    return response.data.data;
  },
  create: async (contactData) => {
    const response = await api.post("/contacts", contactData);
    return response.data;
  },
  update: async (id, contactData) => {
    const response = await api.put(`/contacts/${id}`, contactData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/contacts/${id}`);
    return response.data;
  },
  retrySync: async () => {
    const response = await api.post("/contacts/retry-sync");
    return response.data;
  },
  testConnection: async (webhookUrl) => {
    const response = await api.post("/contacts/test-connection", { webhookUrl });
    return response.data;
  }
};

export const villagesAPI = {
  getAll: async () => {
    const response = await api.get("/villages");
    return response.data.data;
  },
  create: async (villageName) => {
    const response = await api.post("/villages", { villageName });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/villages/${id}`);
    return response.data;
  }
};

export const settingsAPI = {
  get: async () => {
    const response = await api.get("/settings");
    return response.data.data;
  },
  update: async (settingsData) => {
    const response = await api.post("/settings", settingsData);
    return response.data;
  }
};

// Python Services Connection (FastAPI Analytics Microservice)
const PYTHON_API_BASE_URL = "http://localhost:8000";

const pythonApi = axios.create({
  baseURL: PYTHON_API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Automatically inject JWT Token to FastAPI requests
pythonApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("crm_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const pythonAPI = {
  // Legacy reports and backup support (backward compatibility)
  getAnalytics: async (contacts) => {
    const response = await pythonApi.post("/api/python/analytics/summary", { contacts });
    return response.data;
  },
  downloadPDF: async (contacts, categoryName) => {
    const response = await pythonApi.post("/api/python/reports/pdf", { 
      contacts, 
      category_name: categoryName 
    }, { responseType: 'blob' });
    return response.data;
  },
  runBackup: async (contacts, cities) => {
    const response = await pythonApi.post("/api/python/backup/run", { contacts, cities });
    return response.data;
  },
  
  // New dashboard REST APIs
  getOverview: async () => {
    const response = await pythonApi.get("/analytics/overview");
    return response.data;
  },
  getCategories: async () => {
    const response = await pythonApi.get("/analytics/categories");
    return response.data;
  },
  getVillages: async () => {
    const response = await pythonApi.get("/analytics/villages");
    return response.data;
  },
  getMonthlyTrends: async () => {
    const response = await pythonApi.get("/analytics/monthly-trends");
    return response.data;
  },
  getRecentContacts: async () => {
    const response = await pythonApi.get("/analytics/recent-contacts");
    return response.data;
  },
  getDataQuality: async () => {
    const response = await pythonApi.get("/analytics/data-quality");
    return response.data;
  },
  getDuplicates: async () => {
    const response = await pythonApi.get("/analytics/duplicates");
    return response.data;
  },
  getSegments: async () => {
    const response = await pythonApi.get("/analytics/segments");
    return response.data;
  },
  getExportCSVUrl: () => `${PYTHON_API_BASE_URL}/analytics/export/csv`,
  getExportExcelUrl: () => `${PYTHON_API_BASE_URL}/analytics/export/excel`
};

export default api;
