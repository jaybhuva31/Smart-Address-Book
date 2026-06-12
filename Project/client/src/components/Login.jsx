import React, { useState } from "react";
import { Lock, User } from "lucide-react";

export default function Login({ onLogin, errorMsg, isLoading }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    onLogin(username, password);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '20px'
    }}>
      <div className="form-card" style={{ width: '100%', maxWidth: '380px', padding: '30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'rgba(26, 115, 232, 0.1)',
            color: 'var(--primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-main)' }}>Admin Login</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Smart Address Book Management System with Data Analytics</p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(217, 48, 37, 0.1)',
            border: '1px solid rgba(217, 48, 37, 0.2)',
            color: 'var(--btn-danger)',
            fontSize: '13px',
            borderRadius: '4px',
            marginBottom: '16px',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <User size={16} />
              </span>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '36px' }}
                placeholder="Enter Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={16} />
              </span>
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '36px' }}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', borderRadius: '4px', fontWeight: '600' }}
            disabled={isLoading}
          >
            {isLoading ? <div className="spinner"></div> : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
