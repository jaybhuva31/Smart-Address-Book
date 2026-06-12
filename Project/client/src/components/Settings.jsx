import React, { useState, useEffect } from "react";
import { Save, Key, Database, RefreshCw, FileText, Download, Shield } from "lucide-react";
import { authAPI, settingsAPI, pythonAPI } from "../services/api";

export default function Settings({ showToast, contacts, cities, onRefreshData }) {
  // Credentials change state
  const [adminUsername, setAdminUsername] = useState("admin");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Webhook URLs state
  const [sheetWebhook, setSheetWebhook] = useState("");
  const [sheetViewLink, setSheetViewLink] = useState("");
  
  // Backup file list state (FastAPI)
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    // Load config on mount
    const loadSettings = async () => {
      try {
        const config = await settingsAPI.get();
        setSheetWebhook(config.sheetsWebhook || "");
        setSheetViewLink(config.sheetsViewLink || "");
        
        // Also save webhook in localstorage for interceptor fallback
        if (config.sheetsWebhook) {
          localStorage.setItem("crm_sheets_webhook", config.sheetsWebhook);
        }
        if (config.sheetsViewLink) {
          localStorage.setItem("crm_sheets_view_link", config.sheetsViewLink);
        }
      } catch (err) {
        showToast("Failed to load settings!", "error");
      }
    };
    loadSettings();
  }, []);

  // Update Credentials
  const handleUpdateCreds = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("New password and confirm password do not match!", "error");
      return;
    }

    try {
      await authAPI.changePassword(currentPassword, newPassword);
      showToast("Admin password updated successfully!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      showToast("Error updating password: " + (err.response?.data?.message || err.message), "error");
    }
  };

  // Save sheets settings
  const handleSaveSheets = async (e) => {
    e.preventDefault();
    try {
      await settingsAPI.update({
        sheetsWebhook: sheetWebhook.trim(),
        sheetsViewLink: sheetViewLink.trim()
      });
      localStorage.setItem("crm_sheets_webhook", sheetWebhook.trim());
      localStorage.setItem("crm_sheets_view_link", sheetViewLink.trim());
      showToast("Google Sheets connection saved!", "success");
    } catch (err) {
      showToast("Error saving settings: " + err.message, "error");
    }
  };

  // Trigger Python Automated Backup
  const handleBackupDownload = async () => {
    setBackupLoading(true);
    try {
      // 1. Trigger Python Backup service
      const res = await pythonAPI.runBackup(contacts, cities);
      showToast(res.message, "success");

      // 2. Also download JSON file to browser as secondary copy
      const backupData = {
        contacts,
        cities,
        exportDate: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CRM_LocalBackup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast("FastAPI backup failed. Downloading local copy to browser...", "warning");
      
      // Fallback local backup if FastAPI is down
      const backupData = {
        contacts,
        cities,
        exportDate: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CRM_LocalBackup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Change Password Section */}
      <div className="settings-section">
        <h2>
          <Key size={18} style={{ marginRight: '8px', verticalAlign: 'middle', display: 'inline' }} />
          Change Admin Password
        </h2>
        <form onSubmit={handleUpdateCreds}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={adminUsername}
              disabled
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Current Password *</label>
            <input
              type="password"
              className="form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Enter current password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password *</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter new password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password *</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Update Password
            </button>
          </div>
        </form>
      </div>

      {/* Google Sheets API Integration Webhook */}
      <div className="settings-section">
        <h2>
          <FileText size={18} style={{ marginRight: '8px', verticalAlign: 'middle', display: 'inline' }} />
          Google Sheet Connection Settings
        </h2>
        <form onSubmit={handleSaveSheets}>
          <div className="form-group">
            <label className="form-label">Apps Script Webhook URL</label>
            <input
              type="url"
              className="form-input"
              value={sheetWebhook}
              onChange={(e) => setSheetWebhook(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Spreadsheet View Link</label>
            <input
              type="url"
              className="form-input"
              value={sheetViewLink}
              onChange={(e) => setSheetViewLink(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Save Settings
            </button>
          </div>
        </form>
      </div>

      {/* Auto Backup / Export Backup */}
      <div className="settings-section">
        <h2>
          <Download size={18} style={{ marginRight: '8px', verticalAlign: 'middle', display: 'inline' }} />
          Local & Cloud Data Backups
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Back up all your database records (contacts and villages) directly to your local machine and the Python FastAPI server's secure backups storage folder. The resulting JSON file can be used to restore the system database in the future.
        </p>
        <button 
          type="button" 
          className="btn btn-success" 
          onClick={handleBackupDownload}
          disabled={backupLoading}
        >
          <Download size={16} /> 
          {backupLoading ? "Backing up..." : "Download Data Backup (.json)"}
        </button>
      </div>
      
      {/* Security note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: 'rgba(26, 115, 232, 0.05)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <Shield size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span>This is an admin-only system. For secure configuration, please place the Firebase key file at <code>firebase/serviceAccountKey.json</code> to secure admin database queries.</span>
      </div>
    </div>
  );
}
