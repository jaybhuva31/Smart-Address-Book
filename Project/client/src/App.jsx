import React, { useState, useEffect } from "react";
import { authAPI, contactsAPI, villagesAPI, settingsAPI } from "./services/api";
import Login from "./components/Login";
import ContactForm from "./components/ContactForm";
import ReportTable from "./components/ReportTable";
import DashboardStats from "./components/DashboardStats";
import Settings from "./components/Settings";

// Analytics Sub-pages
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import CategoryAnalytics from "./pages/CategoryAnalytics";
import VillageAnalytics from "./pages/VillageAnalytics";
import GrowthAnalytics from "./pages/GrowthAnalytics";
import DataQuality from "./pages/DataQuality";
import DuplicateAnalysis from "./pages/DuplicateAnalysis";

import { 
  LogOut, 
  Settings as SettingsIcon, 
  Plus, 
  BarChart3, 
  FileText, 
  Sun, 
  Moon,
  Database,
  Wifi,
  WifiOff,
  TrendingUp
} from "lucide-react";

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("crm_auth") === "true" && !!sessionStorage.getItem("crm_token");
  });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Active View State: 'dashboard' | 'form' | 'report' | 'settings' | 'analytics'
  const [activeView, setActiveView] = useState("form");
  const [activeCategory, setActiveCategory] = useState("All");

  // Analytics Sub-view state
  const [analyticsSubView, setAnalyticsSubView] = useState("overview");

  // Database States
  const [contacts, setContacts] = useState([]);
  const [cities, setCities] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [isFirebase, setIsFirebase] = useState(false);

  // Edit contact state
  const [editingContact, setEditingContact] = useState(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("crm_theme") === "dark";
  });

  // Online / Offline Status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Toasts Notifications State
  const [toasts, setToasts] = useState([]);

  // Toast Helper
  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Sync online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("You are online! (Internet Connected)", "success");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("You are offline! Data will be saved locally.", "error");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Theme apply
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("crm_theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("crm_theme", "light");
    }
  }, [isDarkMode]);

  // Load contacts and cities upon auth success
  const loadData = async () => {
    if (!isAuthenticated) return;
    setDataLoading(true);
    try {
      // 1. Fetch server health to determine connection type
      const response = await fetch("http://localhost:5000/health").catch(() => null);
      if (response && response.ok) {
        const health = await response.json();
        setIsFirebase(health.mode.includes("Firebase"));
      }

      // 2. Fetch contacts and villages from Express Backend
      const [fetchedContacts, fetchedCities] = await Promise.all([
        contactsAPI.getAll(),
        villagesAPI.getAll()
      ]);
      setContacts(fetchedContacts);
      setCities(fetchedCities);
    } catch (err) {
      showToast("Error loading data: " + err.message, "error");
      
      // Fallback localstorage read for offline compatibility
      const cachedContacts = localStorage.getItem("crm_local_contacts");
      const cachedCities = localStorage.getItem("crm_local_cities");
      if (cachedContacts) setContacts(JSON.parse(cachedContacts));
      if (cachedCities) setCities(JSON.parse(cachedCities));
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  // Cache data in localstorage for offline access
  useEffect(() => {
    if (contacts.length > 0) {
      localStorage.setItem("crm_local_contacts", JSON.stringify(contacts));
    }
  }, [contacts]);

  useEffect(() => {
    if (cities.length > 0) {
      localStorage.setItem("crm_local_cities", JSON.stringify(cities));
    }
  }, [cities]);

  // Handle Login
  const handleLogin = async (username, password) => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await authAPI.login(username, password);
      if (res.success) {
        sessionStorage.setItem("crm_auth", "true");
        sessionStorage.setItem("crm_token", res.token);
        setIsAuthenticated(true);
        showToast("Login successful! Welcome.", "success");
      } else {
        setAuthError("Invalid username or password!");
        showToast("Invalid username or password!", "error");
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      setAuthError("Login failed: " + errMsg);
      showToast("Login failed: " + errMsg, "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    sessionStorage.removeItem("crm_auth");
    sessionStorage.removeItem("crm_token");
    setIsAuthenticated(false);
    showToast("Logged out successfully!", "success");
  };

  // Handle Add City / Village
  const handleAddCity = async (cityName) => {
    const exists = cities.some(c => (c.villageName || "").toLowerCase() === cityName.toLowerCase());
    if (exists) {
      throw new Error("This village is already in the list!");
    }

    const res = await villagesAPI.create(cityName);
    if (res.success) {
      setCities((prev) => [...prev, res.data].sort((a, b) => (a.villageName || "").localeCompare(b.villageName || "", 'en')));
      showToast(`Village "${cityName}" added successfully!`, "success");
      return res.data;
    }
    throw new Error(res.message);
  };

  // Handle Save Contact (Add or Update)
  const handleSaveContact = async (contactData) => {
    setDataLoading(true);
    try {
      if (editingContact) {
        // Edit flow
        const res = await contactsAPI.update(editingContact.id, contactData);
        if (res.success) {
          setContacts((prev) => prev.map((c) => (c.id === editingContact.id ? res.data : c)));
          showToast("Contact updated successfully!", "success");
          setEditingContact(null);
          setActiveView("report"); // Redirect to table report view after edit
        }
      } else {
        // Add flow
        const res = await contactsAPI.create(contactData);
        if (res.success) {
          setContacts((prev) => [...prev, res.data]);
          
          if (res.syncStatus === "synced") {
            showToast("Contact added and synced with Google Sheets!", "success");
          } else {
            showToast("Contact added, but Google Sheets sync failed! (Saved in Database)", "error");
          }
        }
      }
    } catch (err) {
      showToast("Error saving contact: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setDataLoading(false);
    }
  };

  // Handle Delete Contact
  const handleDeleteContact = async (id) => {
    setDataLoading(true);
    try {
      await contactsAPI.delete(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      showToast("Contact deleted successfully!", "success");
    } catch (err) {
      showToast("Error deleting contact: " + err.message, "error");
    } finally {
      setDataLoading(false);
    }
  };

  // Trigger editing contact from report page
  const handleEditTrigger = (contact) => {
    setEditingContact(contact);
    setActiveView("form");
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingContact(null);
    setActiveView("report");
  };

  // Settings spreadsheet URL helper
  const googleSheetsViewUrl = localStorage.getItem("crm_sheets_view_link") || "";

  // Loader spinner helper
  const renderLoading = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="spinner spinner-primary"></div>
      <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>Loading information, please wait...</p>
    </div>
  );

  return (
    <div>
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div>{toast.message}</div>
          </div>
        ))}
      </div>

      {!isAuthenticated ? (
        // Unauthenticated Login view
        <div>
          {/* Header */}
          <div className="header-bar" style={{ justifyContent: 'center' }}>
            <h1 className="header-title">Smart Address Book CRM</h1>
          </div>
          {/* Login Card */}
          <Login 
            onLogin={handleLogin} 
            errorMsg={authError} 
            isLoading={authLoading} 
          />
        </div>
      ) : (
        // Authenticated admin view
        <div>
          {/* Header Bar */}
          <div className="header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Database size={20} />
              <h1 className="header-title" style={{ cursor: 'pointer' }} onClick={() => { setActiveView("dashboard"); setEditingContact(null); }}>
                Smart Address Book
              </h1>
              {/* Online indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '12px', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: isOnline ? 'rgba(255,255,255,0.2)' : 'rgba(217, 48, 37, 0.2)' }}>
                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                <span>{isOnline ? "Online" : "Offline"}</span>
              </div>
            </div>

            <div className="header-actions">
              {/* Dark Mode switch */}
              <button 
                className="btn btn-outline" 
                style={{ padding: '8px', color: 'var(--header-text)', borderColor: 'rgba(255,255,255,0.3)' }}
                onClick={() => setIsDarkMode(!isDarkMode)}
                title="Toggle Dark / Light Mode"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Navigation Actions */}
              <button 
                className={`btn ${activeView === "dashboard" ? "btn-success" : "btn-outline"}`}
                style={{ color: activeView === "dashboard" ? "white" : "var(--header-text)", borderColor: 'rgba(255,255,255,0.3)' }}
                onClick={() => { setActiveView("dashboard"); setEditingContact(null); }}
              >
                <BarChart3 size={16} /> Summary
              </button>

              <button 
                className={`btn ${activeView === "analytics" ? "btn-success" : "btn-outline"}`}
                style={{ color: activeView === "analytics" ? "white" : "var(--header-text)", borderColor: 'rgba(255,255,255,0.3)' }}
                onClick={() => { setActiveView("analytics"); setEditingContact(null); }}
              >
                <TrendingUp size={16} /> Data Analytics
              </button>

              <button 
                className={`btn ${activeView === "form" && !editingContact ? "btn-success" : "btn-outline"}`}
                style={{ color: activeView === "form" && !editingContact ? "white" : "var(--header-text)", borderColor: 'rgba(255,255,255,0.3)' }}
                onClick={() => { setActiveView("form"); setEditingContact(null); }}
              >
                <Plus size={16} /> Add Contact
              </button>

              <button 
                className={`btn ${activeView === "report" ? "btn-success" : "btn-outline"}`}
                style={{ color: activeView === "report" ? "white" : "var(--header-text)", borderColor: 'rgba(255,255,255,0.3)' }}
                onClick={() => { setActiveView("report"); setActiveCategory("All"); setEditingContact(null); }}
              >
                <FileText size={16} /> Reports
              </button>

              <button 
                className={`btn ${activeView === "settings" ? "btn-success" : "btn-outline"}`}
                style={{ color: activeView === "settings" ? "white" : "var(--header-text)", borderColor: 'rgba(255,255,255,0.3)' }}
                onClick={() => { setActiveView("settings"); setEditingContact(null); }}
              >
                <SettingsIcon size={16} /> Settings
              </button>

              <button 
                className="btn btn-danger"
                style={{ padding: '8px 12px' }}
                onClick={handleLogout}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div style={{ padding: '24px 0' }}>
            {dataLoading && contacts.length === 0 ? (
              renderLoading()
            ) : (
              <>
                {activeView === "dashboard" && (
                  <div style={{ padding: '0 24px', maxWidth: '1400px', margin: '0 auto' }}>
                    <DashboardStats 
                      contacts={contacts} 
                      cities={cities} 
                      isFirebase={isFirebase} 
                      showToast={showToast}
                    />
                  </div>
                )}

                {activeView === "analytics" && (
                  <div style={{ padding: '0 24px', maxWidth: '1400px', margin: '0 auto' }}>
                    {/* Sub navigation tabs for Analytics Section */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      borderBottom: '1px solid var(--border-color)', 
                      marginBottom: '20px', 
                      paddingBottom: '8px', 
                      overflowX: 'auto',
                      whiteSpace: 'nowrap'
                    }}>
                      <button 
                        className={`btn ${analyticsSubView === "overview" ? "btn-primary" : "btn-outline"}`} 
                        onClick={() => setAnalyticsSubView("overview")}
                      >
                        Overview Dashboard
                      </button>
                      <button 
                        className={`btn ${analyticsSubView === "categories" ? "btn-primary" : "btn-outline"}`} 
                        onClick={() => setAnalyticsSubView("categories")}
                      >
                        Category Analysis
                      </button>
                      <button 
                        className={`btn ${analyticsSubView === "villages" ? "btn-primary" : "btn-outline"}`} 
                        onClick={() => setAnalyticsSubView("villages")}
                      >
                        Village Analysis
                      </button>
                      <button 
                        className={`btn ${analyticsSubView === "growth" ? "btn-primary" : "btn-outline"}`} 
                        onClick={() => setAnalyticsSubView("growth")}
                      >
                        Growth Trends
                      </button>
                      <button 
                        className={`btn ${analyticsSubView === "quality" ? "btn-primary" : "btn-outline"}`} 
                        onClick={() => setAnalyticsSubView("quality")}
                      >
                        Data Quality
                      </button>
                      <button 
                        className={`btn ${analyticsSubView === "duplicates" ? "btn-primary" : "btn-outline"}`} 
                        onClick={() => setAnalyticsSubView("duplicates")}
                      >
                        Duplicate Analysis
                      </button>
                    </div>
                    
                    {/* Analytics Page Components */}
                    {analyticsSubView === "overview" && <AnalyticsDashboard showToast={showToast} />}
                    {analyticsSubView === "categories" && <CategoryAnalytics showToast={showToast} />}
                    {analyticsSubView === "villages" && <VillageAnalytics showToast={showToast} />}
                    {analyticsSubView === "growth" && <GrowthAnalytics showToast={showToast} />}
                    {analyticsSubView === "quality" && <DataQuality showToast={showToast} />}
                    {analyticsSubView === "duplicates" && <DuplicateAnalysis showToast={showToast} />}
                  </div>
                )}

                {activeView === "form" && (
                  <ContactForm
                    cities={cities}
                    onAddCity={handleAddCity}
                    onSaveContact={handleSaveContact}
                    editContact={editingContact}
                    onCancelEdit={handleCancelEdit}
                    onViewAll={() => {
                      setActiveView("report");
                      setActiveCategory("All");
                    }}
                    onViewCategory={(category) => {
                      setActiveView("report");
                      setActiveCategory(category);
                    }}
                  />
                )}

                {activeView === "report" && (
                  <div style={{ padding: '0 24px', maxWidth: '1400px', margin: '0 auto' }}>
                    <ReportTable
                      contacts={contacts}
                      onEditContact={handleEditTrigger}
                      onDeleteContact={handleDeleteContact}
                      onAddDataView={() => setActiveView("form")}
                      activeCategory={activeCategory}
                      setActiveCategory={setActiveCategory}
                      googleSheetsViewUrl={googleSheetsViewUrl}
                      onRefreshData={loadData}
                      showToast={showToast}
                    />
                  </div>
                )}

                {activeView === "settings" && (
                  <div style={{ padding: '0 24px' }}>
                    <Settings
                      showToast={showToast}
                      contacts={contacts}
                      cities={cities}
                      onRefreshData={loadData}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
