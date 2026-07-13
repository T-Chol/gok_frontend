'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'; // Replace with your actual FastAPI endpoint
function CaptivePortalContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'request' | 'login'>('request');
  
  // Extracted MikroTik Environment Parameters
  const [mac, setMac] = useState('');
  const [ip, setIp] = useState('');
  const [dst, setDst] = useState('');
  const [loginTarget, setLoginTarget] = useState('http://10.50.0.1/login'); // Fallback to our Hotspot gateway IP

  // Form State Values
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // UI Status Tracking
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Dynamically grab the parameters appended by your MikroTik login.html redirection
    const urlMac = searchParams.get('mac');
    const urlIp = searchParams.get('ip');
    const urlDst = searchParams.get('link-orig');
    const urlLoginOnly = searchParams.get('link-login-only');

    if (urlMac) setMac(urlMac);
    if (urlIp) setIp(urlIp);
    if (urlDst) setDst(urlDst);
    if (urlLoginOnly) setLoginTarget(urlLoginOnly);
  }, [searchParams]);

  // Handle Step 1: Request Access (Sends data to FastAPI cloud engine)
  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/portal/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          mac_address: mac || '00:00:00:00:00:00' // Fallback if testing directly in browser
        })
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Request submitted successfully! Please wait a moment for your Login credentials to arrive via SMS.'
        });
        setPhoneNumber('');
      } else {
        const errorData = await response.json();
        setMessage({
          type: 'error',
          text: `Submission rejected: ${errorData.detail || 'Unknown server error'}`
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Network connection failure. Unable to reach verification servers.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Gok Anyuak Wi-Fi</h2>
        
        {/* Debug Info Footer for Network Diagnostics */}
        <div style={styles.debugBox}>
          <div><strong>IP:</strong> {ip || 'Detecting...'}</div>
          <div><strong>MAC:</strong> {mac || 'Detecting...'}</div>
        </div>

        {/* Dynamic Tab Navigation */}
        <div style={styles.tabs}>
          <div 
            style={{ ...styles.tab, ...(activeTab === 'request' ? styles.activeTab : {}) }} 
            onClick={() => { setActiveTab('request'); setMessage(null); }}
          >
            Request Access
          </div>
          <div 
            style={{ ...styles.tab, ...(activeTab === 'login' ? styles.activeTab : {}) }} 
            onClick={() => { setActiveTab('login'); setMessage(null); }}
          >
            Have Password
          </div>
        </div>

        {/* Global Feedback Notifications */}
        {message && (
          <div style={{ 
            ...styles.alert, 
            backgroundColor: message.type === 'success' ? '#def7ec' : '#fde8e8',
            color: message.type === 'success' ? '#03543f' : '#9b1c1c'
          }}>
            {message.text}
          </div>
        )}

        {/* TAB 1: SUBMIT REGISTRATION INTENT TO FASTAPI */}
        {activeTab === 'request' && (
          <form onSubmit={handleRequestAccess}>
            <label style={styles.label}>Enter Phone Number</label>
            <input 
              type="tel" 
              placeholder="e.g., +21191XXXXXXXX" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              style={styles.input} 
              required 
            />
            <span style={styles.infoTxt}>Your network profile signature will be verified by staff.</span>
            
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Processing Request...' : 'Request Access from Staff'}
            </button>
          </form>
        )}

        {/* TAB 2: POST DIRECTLY BACK TO LOCAL MIKROTIK GATEWAY DAEOM */}
        {activeTab === 'login' && (
          <form name="login" action={loginTarget} method="post">
            {/* Hidden tracking variables required natively by RouterOS */}
            <input type="hidden" name="dst" value={dst} />
            <input type="hidden" name="popup" value="true" />

            <label style={styles.label}>User ID</label>
            <input 
              type="text" 
              name="username" 
              placeholder="e.g., GOK4B72" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input} 
              required 
            />
            
            <label style={styles.label}>Password PIN</label>
            <input 
              type="password" 
              name="password" 
              placeholder="Enter SMS PIN"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input} 
              required 
            />
            
            <button type="submit" style={{ ...styles.button, backgroundColor: '#10b981' }}>
              Log In to Wi-Fi Network
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Global Core Wrapper with Suspense Boundary to handle query parameter compilation safely
export default function CaptivePortalPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'system-ui' }}>
        Loading Wi-Fi Portal Context...
      </div>
    }>
      <CaptivePortalContent />
    </Suspense>
  );
}

// Structured Inline CSS Variables
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f4f6f9',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    margin: 0,
    padding: '0 16px'
  },
  card: {
    backgroundColor: 'white',
    padding: '28px',
    borderRadius: '12px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: '400px',
    boxSizing: 'border-box'
  },
  title: {
    textAlign: 'center',
    color: '#1e293b',
    marginTop: 0,
    marginBottom: '16px'
  },
  debugBox: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#64748b',
    background: '#f8fafc',
    padding: '8px 12px',
    borderRadius: '6px',
    marginBottom: '20px',
    border: '1px solid #e2e8f0'
  },
  tabs: {
    display: 'flex',
    marginBottom: '24px',
    borderBottom: '2px solid #e2e8f0'
  },
  tab: {
    flex: 1,
    textAlign: 'center',
    padding: '12px',
    cursor: 'pointer',
    color: '#64748b',
    fontWeight: 600,
    fontSize: '15px',
    transition: 'all 0.2s ease'
  },
  activeTab: {
    color: '#2563eb',
    borderBottom: '2px solid #2563eb'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    color: '#475569',
    fontWeight: 500
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '16px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    boxSizing: 'border-box',
    fontSize: '16px',
    outline: 'none'
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  },
  infoTxt: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginTop: '-8px',
    marginBottom: '20px',
    lineHeight: '1.4'
  },
  alert: {
    padding: '12px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '16px',
    lineHeight: '1.4',
    textAlign: 'left'
  }
};