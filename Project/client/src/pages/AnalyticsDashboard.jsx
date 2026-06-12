import React, { useState, useEffect } from "react";
import { pythonAPI } from "../services/api";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { 
  Users, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  Download, 
  RefreshCw,
  TrendingUp,
  Percent
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsDashboard({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States for API datasets
  const [overview, setOverview] = useState(null);
  const [categories, setCategories] = useState(null);
  const [villages, setVillages] = useState(null);
  const [trends, setTrends] = useState(null);
  const [recent, setRecent] = useState([]);
  const [quality, setQuality] = useState(null);
  const [duplicates, setDuplicates] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        overviewRes,
        categoriesRes,
        villagesRes,
        trendsRes,
        recentRes,
        qualityRes,
        duplicatesRes
      ] = await Promise.all([
        pythonAPI.getOverview(),
        pythonAPI.getCategories(),
        pythonAPI.getVillages(),
        pythonAPI.getMonthlyTrends(),
        pythonAPI.getRecentContacts(),
        pythonAPI.getDataQuality(),
        pythonAPI.getDuplicates()
      ]);

      setOverview(overviewRes);
      setCategories(categoriesRes);
      setVillages(villagesRes);
      setTrends(trendsRes);
      setRecent(recentRes);
      setQuality(qualityRes);
      setDuplicates(duplicatesRes);
    } catch (err) {
      console.error("Error loading FastAPI Analytics:", err);
      setError("Failed to reach Python FastAPI Analytics service on port 8000. Please ensure it is running.");
      showToast("FastAPI Analytics server is offline", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner spinner-primary"></div>
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Calculating data analytics, please wait...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form-card" style={{ padding: '30px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
        <AlertTriangle size={48} style={{ color: 'var(--btn-danger)', marginBottom: '16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>FastAPI Analytics Service Offline</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>{error}</p>
        <button className="btn btn-primary" onClick={fetchAnalytics}>
          <RefreshCw size={16} /> Retry Connection
        </button>
      </div>
    );
  }

  // --- CHART BUILDERS ---

  // 1. Category Chart
  const categoryLabels = Object.keys(categories?.distribution || {});
  const categoryCounts = Object.values(categories?.distribution || {});
  const categoryChartData = {
    labels: categoryLabels,
    datasets: [{
      label: 'Categories count',
      data: categoryCounts,
      backgroundColor: [
        'rgba(26, 115, 232, 0.7)',
        'rgba(24, 128, 56, 0.7)',
        'rgba(242, 153, 0, 0.7)',
        'rgba(219, 48, 37, 0.7)',
        'rgba(161, 63, 224, 0.7)',
        'rgba(0, 172, 193, 0.7)',
        'rgba(240, 98, 146, 0.7)',
        'rgba(141, 110, 99, 0.7)'
      ],
      borderWidth: 1
    }]
  };

  // 2. Village Chart
  const topVillages = villages?.top_10 || [];
  const villageLabels = topVillages.map(v => v.village);
  const villageCounts = topVillages.map(v => v.count);
  const villageChartData = {
    labels: villageLabels,
    datasets: [{
      label: 'Contacts per Village',
      data: villageCounts,
      backgroundColor: 'rgba(26, 115, 232, 0.8)',
      borderColor: 'var(--primary)',
      borderWidth: 1,
      borderRadius: 4
    }]
  };

  // 3. Growth Chart
  const trendTimeline = trends?.timeline || [];
  const trendLabels = trendTimeline.map(t => t.month);
  const trendCount = trendTimeline.map(t => t.count);
  const trendCumulative = trendTimeline.map(t => t.cumulative);
  const trendsChartData = {
    labels: trendLabels,
    datasets: [
      {
        type: 'line',
        label: 'Cumulative Contacts',
        data: trendCumulative,
        borderColor: 'rgba(24, 128, 56, 1)',
        backgroundColor: 'rgba(24, 128, 56, 0.1)',
        yAxisID: 'y1',
        fill: true,
        tension: 0.3
      },
      {
        type: 'bar',
        label: 'New Contacts',
        data: trendCount,
        backgroundColor: 'rgba(26, 115, 232, 0.6)',
        borderColor: 'rgba(26, 115, 232, 1)',
        borderWidth: 1,
        yAxisID: 'y',
        borderRadius: 4
      }
    ]
  };

  // 4. Quality Chart
  const qualityScore = quality?.completeness_score || 0.0;
  const qualityChartData = {
    labels: ['Completed', 'Missing'],
    datasets: [{
      data: [qualityScore, 100 - qualityScore],
      backgroundColor: ['rgba(24, 128, 56, 0.8)', 'rgba(219, 48, 37, 0.1)'],
      borderWidth: 0,
      hoverOffset: 0
    }]
  };

  return (
    <div>
      {/* Top Banner Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Smart Analytics Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Manage Contacts Intelligently. Discover Insights Instantly.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" onClick={() => window.open(pythonAPI.getExportExcelUrl(), "_blank")}>
            <Download size={15} /> Export Excel
          </button>
          <button className="btn btn-outline" onClick={() => window.open(pythonAPI.getExportCSVUrl(), "_blank")}>
            <Download size={15} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={fetchAnalytics}>
            <RefreshCw size={15} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(26, 115, 232, 0.1)', color: 'var(--primary)' }}>
            <Users size={22} />
          </div>
          <div className="stat-details">
            <h3>Total Contacts</h3>
            <p>{overview?.total_contacts}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(24, 128, 56, 0.1)', color: 'var(--btn-success)' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-details">
            <h3>Active Contacts</h3>
            <p>{overview?.active_contacts}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(242, 153, 0, 0.1)', color: 'var(--btn-warning)' }}>
            <Calendar size={22} />
          </div>
          <div className="stat-details">
            <h3>Added Today/Week</h3>
            <p>{overview?.added_today} / {overview?.added_week}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(161, 63, 224, 0.1)', color: '#a13fe0' }}>
            <MapPin size={22} />
          </div>
          <div className="stat-details">
            <h3>Avg/Village</h3>
            <p>{overview?.avg_contacts_per_village}</p>
          </div>
        </div>
      </div>

      {/* Row 2: Category Pie & Village Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', marginBottom: '24px' }} className="crm-layout-breakdowns">
        <div className="form-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            Category Distribution
          </h3>
          <div style={{ flex: 1, maxHeight: '280px', display: 'flex', justifyContent: 'center' }}>
            <Doughnut 
              data={categoryChartData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } 
              }} 
            />
          </div>
        </div>

        <div className="form-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            Top 10 Village Densities
          </h3>
          <div style={{ flex: 1, minHeight: '280px' }}>
            <Bar 
              data={villageChartData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Row 3: Monthly Growth Trends */}
      <div className="form-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          Monthly Contact Growth Trends
        </h3>
        <div style={{ minHeight: '300px' }}>
          <Line 
            data={trendsChartData} 
            options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              scales: { 
                y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'New Additions' } },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Total Cumulative' } }
              }
            }} 
          />
        </div>
      </div>

      {/* Row 4: Data Quality Radial Card & Duplicate Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '20px', marginBottom: '24px' }} className="crm-layout-breakdowns">
        <div className="form-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', width: '100%' }}>
            Data Completeness Audit
          </h3>
          <div style={{ position: 'relative', width: '180px', height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--btn-success)' }}>{qualityScore}%</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Quality Score</div>
            </div>
            <Doughnut
              data={qualityChartData}
              options={{
                cutout: '80%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                responsive: true,
                maintainAspectRatio: false
              }}
            />
          </div>
          <div style={{ width: '100%', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Compares completeness of names, mobiles, villages, categories, and addresses.
          </div>
        </div>

        <div className="form-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
            <span>Duplicate Risk Detection</span>
            <span style={{ 
              fontSize: '11px', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              backgroundColor: duplicates?.risk_level === 'High' ? 'rgba(219, 48, 37, 0.1)' : 'rgba(24, 128, 56, 0.1)',
              color: duplicates?.risk_level === 'High' ? 'var(--btn-danger)' : 'var(--btn-success)',
              fontWeight: '600'
            }}>
              {duplicates?.risk_level} Risk
            </span>
          </h3>
          
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {duplicates?.duplicates.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>No potential duplicates detected in database.</p>
            ) : (
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '6px' }}>Type</th>
                    <th style={{ padding: '6px' }}>Reason</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicates?.duplicates.slice(0, 4).map((dup, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px dotted var(--border-color)' }}>
                      <td style={{ padding: '8px 6px', fontWeight: '600' }}>{dup.type}</td>
                      <td style={{ padding: '8px 6px' }}>{dup.reason}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <span style={{ 
                          fontSize: '10px', 
                          padding: '2px 6px', 
                          borderRadius: '8px', 
                          backgroundColor: dup.risk === 'High' ? 'rgba(219, 48, 37, 0.1)' : 'rgba(242, 153, 0, 0.1)',
                          color: dup.risk === 'High' ? 'var(--btn-danger)' : 'var(--btn-warning)',
                          fontWeight: '600'
                        }}>
                          {dup.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Row 5: Recent Contacts Table */}
      <div className="form-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          Recent Activity Analytics
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 4px' }}>Name</th>
                <th style={{ padding: '8px 4px' }}>Village</th>
                <th style={{ padding: '8px 4px' }}>Mobile</th>
                <th style={{ padding: '8px 4px' }}>Date Added</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No contacts available</td>
                </tr>
              ) : (
                recent.slice(0, 5).map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 4px', fontWeight: '600' }}>{c.name}</td>
                    <td style={{ padding: '10px 4px' }}>{c.village || "-"}</td>
                    <td style={{ padding: '10px 4px' }}>{c.mobile}</td>
                    <td style={{ padding: '10px 4px' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US") : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
