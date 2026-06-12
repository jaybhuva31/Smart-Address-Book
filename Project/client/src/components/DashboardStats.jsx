import React, { useState, useEffect } from "react";
import { Users, Calendar, MapPin, Grid, Radio, AlertCircle, RefreshCw } from "lucide-react";
import { CATEGORY_MAP } from "./ContactForm";
import { pythonAPI } from "../services/api";

export default function DashboardStats({ contacts, cities, isFirebase, showToast }) {
  const [pythonAnalytics, setPythonAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Total Contacts
  const totalContacts = contacts.length;

  // Today's Contacts
  const todayStr = new Date().toDateString();
  const todaysContacts = contacts.filter(c => {
    if (!c.createdAt) return false;
    return new Date(c.createdAt).toDateString() === todayStr;
  }).length;

  // Village Wise Counts
  const villageCounts = {};
  contacts.forEach(c => {
    const v = c.village || "Unknown";
    villageCounts[v] = (villageCounts[v] || 0) + 1;
  });
  const sortedVillages = Object.entries(villageCounts)
    .sort((a, b) => b[1] - a[1]);

  // Category Wise Counts (iterating over the categories array)
  const categoryCounts = {};
  contacts.forEach(c => {
    const cats = c.categories || [];
    if (cats.length === 0) {
      categoryCounts["Unassigned"] = (categoryCounts["Unassigned"] || 0) + 1;
    } else {
      cats.forEach(catId => {
        const label = CATEGORY_MAP.find(m => m.id === catId)?.label || catId;
        categoryCounts[label] = (categoryCounts[label] || 0) + 1;
      });
    }
  });
  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1]);

  // Recent Contacts Widget (Last 5 contacts)
  const recentContacts = [...contacts]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  // Fetch FastAPI analytics
  const loadPythonAnalytics = async () => {
    if (contacts.length === 0) return;
    setAnalyticsLoading(true);
    try {
      const data = await pythonAPI.getAnalytics(contacts);
      setPythonAnalytics(data);
    } catch (e) {
      console.warn("FastAPI service not reachable at localhost:8000 for analytics summary.", e.message);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadPythonAnalytics();
  }, [contacts]);

  return (
    <div>
      {/* 4 Main Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(26, 115, 232, 0.1)', color: 'var(--primary)' }}>
            <Users size={22} />
          </div>
          <div className="stat-details">
            <h3>Total Contacts</h3>
            <p>{totalContacts}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(24, 128, 56, 0.1)', color: 'var(--btn-success)' }}>
            <Calendar size={22} />
          </div>
          <div className="stat-details">
            <h3>Today's Additions</h3>
            <p>{todaysContacts}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(242, 153, 0, 0.1)', color: 'var(--btn-warning)' }}>
            <MapPin size={22} />
          </div>
          <div className="stat-details">
            <h3>Total Villages</h3>
            <p>{cities.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ 
            backgroundColor: isFirebase ? 'rgba(24, 128, 56, 0.1)' : 'rgba(219, 48, 37, 0.1)', 
            color: isFirebase ? 'var(--btn-success)' : 'var(--btn-danger)' 
          }}>
            <Radio size={22} />
          </div>
          <div className="stat-details">
            <h3>Database Status</h3>
            <p style={{ fontSize: '15px', marginTop: '6px' }}>
              {isFirebase ? "Firebase Live" : "Demo Mode (Local)"}
            </p>
          </div>
        </div>
      </div>

      {/* FastAPI Advanced Analytics Panel */}
      {pythonAnalytics && (
        <div className="form-card" style={{ padding: '20px', marginBottom: '24px', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={18} style={{ color: 'var(--primary)', animation: 'pulse 2s infinite' }} />
            FastAPI Advanced Analytics (Python Service Live)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '13px' }}>
            <div><strong>Top Village:</strong> {pythonAnalytics.top_village || "N/A"}</div>
            <div><strong>Top Category:</strong> {pythonAnalytics.top_category || "N/A"}</div>
            <div><strong>Total Analyzed:</strong> {pythonAnalytics.total_contacts} Records</div>
          </div>
        </div>
      )}

      {/* Grid for Village and Category breakdowns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }} className="crm-layout-breakdowns">
        {/* Village Counts Card */}
        <div className="form-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} style={{ color: 'var(--primary)' }} />
            Contacts by Village
          </h3>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {sortedVillages.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No data available</p>
            ) : (
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 0', fontWeight: '600' }}>Village Name</th>
                    <th style={{ padding: '6px 0', fontWeight: '600', textAlign: 'right' }}>Contacts Count</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVillages.map(([village, count]) => (
                    <tr key={village} style={{ borderBottom: '1px dotted var(--border-color)' }}>
                      <td style={{ padding: '8px 0' }}>{village}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Category Counts Card */}
        <div className="form-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Grid size={18} style={{ color: 'var(--primary)' }} />
            Contacts by Category
          </h3>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {sortedCategories.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No data available</p>
            ) : (
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 0', fontWeight: '600' }}>Category</th>
                    <th style={{ padding: '6px 0', fontWeight: '600', textAlign: 'right' }}>Contacts Count</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.map(([category, count]) => (
                    <tr key={category} style={{ borderBottom: '1px dotted var(--border-color)' }}>
                      <td style={{ padding: '8px 0' }}>{category}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Recent Contacts Widget */}
      <div className="form-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} style={{ color: 'var(--primary)' }} />
          Recently Added Contacts
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 4px', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '8px 4px', fontWeight: '600' }}>Village</th>
                <th style={{ padding: '8px 4px', fontWeight: '600' }}>Mobile</th>
                <th style={{ padding: '8px 4px', fontWeight: '600' }}>Date</th>
                <th style={{ padding: '8px 4px', fontWeight: '600', textAlign: 'center' }}>Sync</th>
              </tr>
            </thead>
            <tbody>
              {recentContacts.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No contacts available</td>
                </tr>
              ) : (
                recentContacts.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 4px', fontWeight: '600' }}>{c.name}</td>
                    <td style={{ padding: '10px 4px' }}>{c.village || "-"}</td>
                    <td style={{ padding: '10px 4px' }}>{c.mobile}</td>
                    <td style={{ padding: '10px 4px' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US") : "-"}</td>
                    <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '2px 6px', 
                        borderRadius: '8px', 
                        backgroundColor: c.syncStatus === 'synced' ? 'rgba(24, 128, 56, 0.1)' : (c.syncStatus === 'pending' ? 'rgba(242, 153, 0, 0.1)' : 'rgba(217, 48, 37, 0.1)'),
                        color: c.syncStatus === 'synced' ? 'var(--btn-success)' : (c.syncStatus === 'pending' ? 'var(--btn-warning)' : 'var(--btn-danger)')
                      }}>
                        {c.syncStatus === 'synced' ? 'Synced' : (c.syncStatus === 'pending' ? 'Pending' : 'Failed')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .crm-layout-breakdowns {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
