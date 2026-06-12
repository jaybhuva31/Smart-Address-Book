import React, { useState, useEffect } from "react";
import { pythonAPI } from "../services/api";
import { AlertTriangle, UserCheck, Trash2, Edit, AlertCircle, RefreshCw } from "lucide-react";

export default function DuplicateAnalysis({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pythonAPI.getDuplicates();
      setData(res);
    } catch (err) {
      setError("Failed to fetch duplicate contacts analysis.");
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
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Detecting potential duplicates in database...</p>
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

  const duplicates = data.duplicates || [];

  return (
    <div>
      {/* Risk banner */}
      <div className="form-card" style={{ padding: '24px', marginBottom: '24px', borderLeft: '5px solid ' + (data.risk_level === 'High' ? 'var(--btn-danger)' : (duplicates.length > 0 ? 'var(--btn-warning)' : 'var(--btn-success)')) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} style={{ color: data.risk_level === 'High' ? 'var(--btn-danger)' : 'var(--btn-warning)' }} />
              Database Duplicate Risk Level: {data.risk_level}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              We scanned names (case-insensitive) and mobile numbers to identify duplicate clusters.
            </p>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', textAlign: 'center' }}>{data.duplicate_count}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Duplicate Clusters Detected</div>
          </div>
        </div>
      </div>

      {/* Duplicate clusters report lists */}
      {duplicates.length === 0 ? (
        <div className="form-card" style={{ padding: '40px', textAlign: 'center' }}>
          <UserCheck size={48} style={{ color: 'var(--btn-success)', marginBottom: '16px' }} />
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>Clean Database!</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            No phone number or identical name duplicates were found.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {duplicates.map((dup, index) => (
            <div key={index} className="form-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '14px' }}>
                <div>
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    backgroundColor: dup.risk === 'High' ? 'rgba(219, 48, 37, 0.1)' : 'rgba(242, 153, 0, 0.1)',
                    color: dup.risk === 'High' ? 'var(--btn-danger)' : 'var(--btn-warning)',
                    fontWeight: '600',
                    marginRight: '8px'
                  }}>
                    {dup.risk} Risk
                  </span>
                  <strong style={{ fontSize: '14px' }}>{dup.type}</strong>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dup.reason}</span>
              </div>
              
              {/* List of contacts in this duplicate cluster */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dup.contacts.map((c, cidx) => (
                  <div key={cidx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--bg-page)', borderRadius: '4px', fontSize: '13px' }}>
                    <div>
                      <strong style={{ marginRight: '16px' }}>{c.name}</strong>
                      <span style={{ color: 'var(--text-muted)', marginRight: '16px' }}>Mobile: {c.mobile}</span>
                      <span style={{ color: 'var(--text-muted)' }}>Village: {c.village || '-'}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      ID: {c.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
