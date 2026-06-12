import React, { useState, useEffect } from "react";
import { pythonAPI } from "../services/api";
import { Bar } from "react-chartjs-2";
import { MapPin, Sparkles, Award, AlertCircle, RefreshCw } from "lucide-react";

export default function VillageAnalytics({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pythonAPI.getVillages();
      setData(res);
    } catch (err) {
      setError("Failed to fetch village analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
        <div className="spinner spinner-primary"></div>
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Loading village analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="form-card" style={{ padding: '20px', textAlign: 'center' }}>
        <AlertCircle size={32} style={{ color: 'var(--btn-danger)', marginBottom: '8px' }} />
        <p style={{ color: 'var(--text-muted)' }}>{error || "No data available."}</p>
        <button className="btn btn-outline" style={{ marginTop: '12px' }} onClick={fetchData}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const distribution = data.distribution || {};
  const labels = Object.keys(distribution);
  const counts = Object.values(distribution);

  const barData = {
    labels: labels,
    datasets: [{
      label: 'Contacts',
      data: counts,
      backgroundColor: 'rgba(26, 115, 232, 0.8)',
      borderColor: 'var(--primary)',
      borderWidth: 1,
      borderRadius: 4
    }]
  };

  const topVillageName = data.top_10 && data.top_10.length > 0 ? data.top_10[0].village : "N/A";
  const topVillageCount = data.top_10 && data.top_10.length > 0 ? data.top_10[0].count : 0;

  return (
    <div>
      {/* 3 Metric Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(26, 115, 232, 0.1)', color: 'var(--primary)' }}>
            <MapPin size={22} />
          </div>
          <div className="stat-details">
            <h3>Unique Villages</h3>
            <p>{labels.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(24, 128, 56, 0.1)', color: 'var(--btn-success)' }}>
            <Award size={22} />
          </div>
          <div className="stat-details">
            <h3>Dense Hub</h3>
            <p style={{ fontSize: '18px', marginTop: '6px' }}>{topVillageName}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(242, 153, 0, 0.1)', color: 'var(--btn-warning)' }}>
            <Sparkles size={22} />
          </div>
          <div className="stat-details">
            <h3>Hub Contacts</h3>
            <p>{topVillageCount}</p>
          </div>
        </div>
      </div>

      {/* Bar chart representation */}
      <div className="form-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          Village Contribution Distribution (Bar Chart)
        </h3>
        <div style={{ minHeight: '300px' }}>
          <Bar 
            data={barData} 
            options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }} 
          />
        </div>
      </div>

      {/* Table details */}
      <div className="form-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          Village Contribution Metrics
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 8px' }}>Village Name</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total Contacts</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Contribution Percentage</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((lbl, idx) => {
                const pct = data.percentages[lbl] || 0.0;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: '600' }}>{lbl}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{counts[idx]}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', color: 'var(--primary)' }}>
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
