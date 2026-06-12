import React, { useState, useEffect } from "react";
import { pythonAPI } from "../services/api";
import { Pie, Bar } from "react-chartjs-2";
import { Grid, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

export default function CategoryAnalytics({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pythonAPI.getCategories();
      setData(res);
    } catch (err) {
      setError("Failed to fetch category analytics data.");
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
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Loading category analytics...</p>
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

  const labels = Object.keys(data.distribution);
  const counts = Object.values(data.distribution);
  const percentages = Object.values(data.percentages);

  const colors = [
    'rgba(26, 115, 232, 0.75)',
    'rgba(24, 128, 56, 0.75)',
    'rgba(242, 153, 0, 0.75)',
    'rgba(219, 48, 37, 0.75)',
    'rgba(161, 63, 224, 0.75)',
    'rgba(0, 172, 193, 0.75)',
    'rgba(240, 98, 146, 0.75)',
    'rgba(141, 110, 99, 0.75)',
    'rgba(92, 107, 115, 0.75)',
    'rgba(216, 27, 96, 0.75)',
    'rgba(57, 73, 171, 0.75)',
    'rgba(0, 150, 136, 0.75)'
  ];

  // Pie chart data
  const pieData = {
    labels: labels,
    datasets: [{
      data: counts,
      backgroundColor: colors,
      borderWidth: 1
    }]
  };

  // Horizontal bar data
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

  return (
    <div>
      {/* 3 Metric Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(26, 115, 232, 0.1)', color: 'var(--primary)' }}>
            <Grid size={22} />
          </div>
          <div className="stat-details">
            <h3>Unique Categories</h3>
            <p>{labels.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(24, 128, 56, 0.1)', color: 'var(--btn-success)' }}>
            <Sparkles size={22} />
          </div>
          <div className="stat-details">
            <h3>Most Common</h3>
            <p style={{ fontSize: '18px', marginTop: '6px' }}>{data.most_common}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(242, 153, 0, 0.1)', color: 'var(--btn-warning)' }}>
            <AlertCircle size={22} />
          </div>
          <div className="stat-details">
            <h3>Least Used</h3>
            <p style={{ fontSize: '18px', marginTop: '6px' }}>{data.least_common}</p>
          </div>
        </div>
      </div>

      {/* Visualizations row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }} className="crm-layout-breakdowns">
        <div className="form-card" style={{ padding: '20px', minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            Category Shares (Pie representation)
          </h3>
          <div style={{ flex: 1, maxHeight: '280px', display: 'flex', justifyContent: 'center' }}>
            <Pie 
              data={pieData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } }
              }} 
            />
          </div>
        </div>

        <div className="form-card" style={{ padding: '20px', minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            Category Frequency (Horizontal Bar representation)
          </h3>
          <div style={{ flex: 1, minHeight: '280px' }}>
            <Bar 
              data={barData} 
              options={{ 
                indexAxis: 'y',
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Detailed statistics table */}
      <div className="form-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          Detailed Category Distribution Table
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 8px' }}>Category Name</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Frequency Count</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Distribution Percentage</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((lbl, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: '600' }}>{lbl}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{counts[idx]}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', color: 'var(--primary)' }}>
                    {percentages[idx]}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
