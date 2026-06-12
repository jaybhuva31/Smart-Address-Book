import React, { useState, useEffect } from "react";
import { pythonAPI } from "../services/api";
import { Line } from "react-chartjs-2";
import { TrendingUp, Calendar, ArrowUpRight, AlertCircle, RefreshCw } from "lucide-react";

export default function GrowthAnalytics({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pythonAPI.getMonthlyTrends();
      setData(res);
    } catch (err) {
      setError("Failed to fetch growth analytics data.");
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
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Loading growth analytics...</p>
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

  const timeline = data.timeline || [];
  const labels = timeline.map(t => t.month);
  const additions = timeline.map(t => t.count);
  const cumulative = timeline.map(t => t.cumulative);

  // Line Chart Data (Additions vs Cumulative)
  const lineChartData = {
    labels: labels,
    datasets: [
      {
        label: 'Monthly New Additions',
        data: additions,
        borderColor: 'rgba(26, 115, 232, 1)',
        backgroundColor: 'rgba(26, 115, 232, 0.2)',
        fill: false,
        tension: 0.3,
        borderWidth: 2
      },
      {
        label: 'Cumulative Contacts',
        data: cumulative,
        borderColor: 'rgba(24, 128, 56, 1)',
        backgroundColor: 'rgba(24, 128, 56, 0.15)',
        fill: true,
        tension: 0.3,
        borderWidth: 2
      }
    ]
  };

  const latestGrowth = data.growth_percentage || 0.0;

  return (
    <div>
      {/* 2 Metric Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(24, 128, 56, 0.1)', color: 'var(--btn-success)' }}>
            <ArrowUpRight size={22} />
          </div>
          <div className="stat-details">
            <h3>Latest Monthly Growth</h3>
            <p style={{ color: latestGrowth >= 0 ? 'var(--btn-success)' : 'var(--btn-danger)' }}>
              {latestGrowth >= 0 ? `+${latestGrowth}%` : `${latestGrowth}%`}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(26, 115, 232, 0.1)', color: 'var(--primary)' }}>
            <Calendar size={22} />
          </div>
          <div className="stat-details">
            <h3>Active Time Span</h3>
            <p style={{ fontSize: '18px', marginTop: '6px' }}>{labels.length} Months</p>
          </div>
        </div>
      </div>

      {/* Visualizations chart */}
      <div className="form-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          Monthly Registration Growth Patterns
        </h3>
        <div style={{ minHeight: '300px' }}>
          <Line 
            data={lineChartData} 
            options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              scales: { y: { beginAtZero: true } }
            }} 
          />
        </div>
      </div>

      {/* Table grid */}
      <div className="form-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          Detailed Growth History Logs
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 8px' }}>Month (YYYY-MM)</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>New Additions Count</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Cumulative Contacts Total</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Month-over-Month Growth Rate</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: '600' }}>{t.month}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{t.count}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{t.cumulative}</td>
                  <td style={{ 
                    padding: '10px 8px', 
                    textAlign: 'right', 
                    fontWeight: '600', 
                    color: t.growth_rate >= 0 ? 'var(--btn-success)' : 'var(--btn-danger)' 
                  }}>
                    {t.growth_rate >= 0 ? `+${t.growth_rate}%` : `${t.growth_rate}%`}
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
