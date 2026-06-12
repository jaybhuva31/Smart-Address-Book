import React, { useState, useEffect } from "react";
import { pythonAPI } from "../services/api";
import { Doughnut } from "react-chartjs-2";
import { ShieldAlert, Award, FileWarning, AlertCircle, RefreshCw, CheckCircle } from "lucide-react";

export default function DataQuality({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [recentContacts, setRecentContacts] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, contactsRes] = await Promise.all([
        pythonAPI.getDataQuality(),
        pythonAPI.getRecentContacts()
      ]);
      setData(res);
      setRecentContacts(contactsRes);
    } catch (err) {
      setError("Failed to fetch data quality analytics.");
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
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Running database quality audits...</p>
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

  const score = data.completeness_score || 0.0;
  const missingPcts = data.missing_percentages || {};

  // Find contacts with missing details
  const incompleteContacts = recentContacts.filter(c => {
    return !c.name || !c.mobile || !c.village || !c.address || !c.categories || c.categories.length === 0;
  });

  const doughnutData = {
    labels: ['Complete Data', 'Missing Data'],
    datasets: [{
      data: [score, 100 - score],
      backgroundColor: ['rgba(24, 128, 56, 0.8)', 'rgba(219, 48, 37, 0.1)'],
      borderWidth: 0,
      hoverOffset: 0
    }]
  };

  return (
    <div>
      {/* Visualizations row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', marginBottom: '24px' }} className="crm-layout-breakdowns">
        
        {/* Radial Completeness Score */}
        <div className="form-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', width: '100%' }}>
            Database Completeness Score
          </h3>
          <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px 0' }}>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: score >= 85 ? 'var(--btn-success)' : 'var(--btn-warning)' }}>{score}%</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Completeness</div>
            </div>
            <Doughnut
              data={doughnutData}
              options={{
                cutout: '80%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                responsive: true,
                maintainAspectRatio: false
              }}
            />
          </div>
          <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
            {score >= 90 ? "Excellent database health! Almost all fields are complete." : "Moderate health. Consider filling out missing details."}
          </div>
        </div>

        {/* Field-level missing percentages */}
        <div className="form-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            Field-Level Missing Data Percentages
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
            {Object.entries(missingPcts).map(([field, pct]) => {
              const completeness = 100 - pct;
              return (
                <div key={field}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    <span style={{ textTransform: 'capitalize' }}>{field} Field</span>
                    <span style={{ color: pct > 10 ? 'var(--btn-danger)' : 'var(--text-muted)' }}>
                      {pct}% Missing ({completeness}% Complete)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${completeness}%`, 
                      height: '100%', 
                      backgroundColor: completeness >= 90 ? 'var(--btn-success)' : (completeness >= 65 ? 'var(--btn-warning)' : 'var(--btn-danger)'),
                      borderRadius: '4px',
                      transition: 'width 0.5s ease-in-out'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Incomplete Records List */}
      <div className="form-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} style={{ color: 'var(--btn-warning)' }} />
          Incomplete Contacts Audit Log (Recent records requiring updates)
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          {incompleteContacts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <CheckCircle size={16} style={{ color: 'var(--btn-success)' }} /> All recent contacts are 100% complete!
            </p>
          ) : (
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Name</th>
                  <th style={{ padding: '10px 8px' }}>Mobile</th>
                  <th style={{ padding: '10px 8px' }}>Missing Fields Details</th>
                </tr>
              </thead>
              <tbody>
                {incompleteContacts.map((c, idx) => {
                  const missing = [];
                  if (!c.name) missing.push("Name");
                  if (!c.mobile) missing.push("Mobile");
                  if (!c.village) missing.push("Village");
                  if (!c.address) missing.push("Address");
                  if (!c.categories || c.categories.length === 0) missing.push("Category");
                  
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: '600' }}>{c.name || "N/A"}</td>
                      <td style={{ padding: '10px 8px' }}>{c.mobile || "N/A"}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: 'rgba(219, 48, 37, 0.1)', 
                          color: 'var(--btn-danger)',
                          fontWeight: '600'
                        }}>
                          Missing: {missing.join(", ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
