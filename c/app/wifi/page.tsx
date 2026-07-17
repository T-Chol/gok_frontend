// c/app/wifi/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function CaptivePortalContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'request' | 'login'>('request');
  
  const [mac, setMac] = useState('');
  const [ip, setIp] = useState('');
  const [dst, setDst] = useState('');
  const [loginTarget, setLoginTarget] = useState('http://192.168.40.1/login'); 

  const [phoneNumber, setPhoneNumber] = useState('');
  const [submittedPhone, setSubmittedPhone] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Parse MikroTik template variables on initial redirect hook load
  useEffect(() => {
    const urlMac = searchParams.get('mac') || '';
    const urlIp = searchParams.get('ip') || '';
    const urlDst = searchParams.get('link-orig') || '';
    const urlLoginOnly = searchParams.get('link-login-only') || '';

    if (urlMac.match(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)) setMac(urlMac);
    if (urlIp) setIp(urlIp);
    if (urlDst) setDst(urlDst);
    
    if (urlLoginOnly) {
      setLoginTarget(urlLoginOnly);
    } else if (urlIp.startsWith('192.168.40.')) {
      setLoginTarget('http://192.168.40.1/login');
    } else if (urlIp.startsWith('192.168.30.')) {
      setLoginTarget('http://192.168.30.1/login');
    }
  }, [searchParams]);

  // AUTOMATED BACKGROUND INTERRUPT POLLING ENGINE:
  // Runs every 3 seconds ONLY after a user submits their phone number.
  // Checks the live sales registry. The exact second staff approves the transaction,
  // it hijacks the UI flow, builds an encrypted login payload, and auto-submits to the router.
  useEffect(() => {
    if (!submittedPhone) return;

    const autoClearanceChecker = setInterval(async () => {
      try {
        // Fetch current active registrations status from master runtime queue arrays
        const res = await fetch(`${API_BASE_URL}/api/employee/pending`);
        if (res.ok) {
          const pendingList = await res.json();
          const stillPending = pendingList.some(
            (req: { phone_number: string }) => req.phone_number === submittedPhone
          );

          // If the phone number is gone from the pending queue, it means staff approved it!
          if (!stillPending) {
            clearInterval(autoClearanceChecker);
            setMessage({ type: 'success', text: 'Payment cleared! Initializing secure auto-login handshake...' });
            
            // Allow state to serialize for 1.5 seconds, then fire the cookie injection sequence
            setTimeout(() => {
              executeInvisibleRouterPost(mac, mac);
            }, 1500);
          }
        }
      } catch (err) {
        console.debug("Auto-clearance link re-establishing link traces...");
      }
    }, 3000);

    return () => clearInterval(autoClearanceChecker);
  }, [submittedPhone, mac]);

  // Helper macro function to execute the invisible form payload dispatch loop
  const executeInvisibleRouterPost = (userKey: string, passKey: string) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = loginTarget; // Directs straight to the local MikroTik interface gateway gateway IP

    // Pass essential authentication variables expected by standard hotame arrays
    const usernameInput = document.createElement('input');
    usernameInput.type = 'hidden';
    usernameInput.name = 'username';
    usernameInput.value = userKey;
    form.appendChild(usernameInput);

    const passwordInput = document.createElement('input');
    passwordInput.type = 'hidden';
    passwordInput.name = 'password';
    passwordInput.value = passKey;
    form.appendChild(passwordInput);

    const dstInput = document.createElement('input');
    dstInput.type = 'hidden';
    dstInput.name = 'dst';
    dstInput.value = dst || 'https://www.google.com';
    form.appendChild(dstInput);

    const popupInput = document.createElement('input');
    popupInput.type = 'hidden';
    popupInput.name = 'popup';
    popupInput.value = 'true';
    form.appendChild(popupInput);

    document.body.appendChild(form);
    form.submit(); // Dispatches variables natively, dropping the long-term tracking cookie instantly!
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);

    let cleanedPhone = phoneNumber.replace(/[\s\-()]/g, '');
    if (!cleanedPhone.startsWith('+')) {
      if (cleanedPhone.startsWith('0')) cleanedPhone = cleanedPhone.substring(1);
      cleanedPhone = `+211${cleanedPhone}`;
    }

    if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
      setMessage({ type: 'error', text: 'Please enter a valid phone number.' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/portal/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: cleanedPhone, mac_address: mac || '00:00:00:00:00:00' })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Access request queued successfully! Please approach the counter to complete your clearance payment.' });
        setSubmittedPhone(cleanedPhone); // Arms the background polling hook instantly
        setPhoneNumber('');
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.detail || 'Your access request could not be processed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. The local authentication gateway is offline.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.headerContainer}>
          <h2 style={styles.title}>Gok Anyuak Wi-Fi</h2>
          <p style={styles.subtitle}>Instant Auto-Login Network Access</p>
        </div>
        
        <div style={styles.debugBox}>
          <div><span style={{color: '#94a3b8'}}>IP:</span> <code>{ip || 'Detecting...'}</code></div>
          <div><span style={{color: '#94a3b8'}}>MAC:</span> <code>{mac || 'Detecting...'}</code></div>
        </div>

        <div style={styles.tabs}>
          <div style={{ ...styles.tab, ...(activeTab === 'request' ? styles.activeTab : {}) }} onClick={() => { if (!loading) { setActiveTab('request'); setMessage(null); } }}>Request Access</div>
          <div style={{ ...styles.tab, ...(activeTab === 'login' ? styles.activeTab : {}) }} onClick={() => { if (!loading) { setActiveTab('login'); setMessage(null); } }}>Have Companion PIN</div>
        </div>

        {message && (
          <div style={{ ...styles.alert, backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2', color: message.type === 'success' ? '#065f46' : '#991b1b', border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fca5a5'}` }}>
            {message.text}
          </div>
        )}

        {activeTab === 'request' && (
          <form onSubmit={handleRequestAccess}>
            <label style={styles.label}>Your Phone Number</label>
            <input type="tel" placeholder="e.g., 0912345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} style={styles.input} disabled={loading || !!submittedPhone} required />
            <span style={styles.infoTxt}>
              {submittedPhone 
                ? '⏳ Waiting for staff payment validation... Keep this browser page open to bypass automatically.' 
                : 'Submit your phone number, then head to the counter to complete cash payment.'}
            </span>
            <button type="submit" style={{ ...styles.button, opacity: (loading || !!submittedPhone) ? 0.6 : 1, cursor: (loading || !!submittedPhone) ? 'not-allowed' : 'pointer' }} disabled={loading || !!submittedPhone}>
              {submittedPhone ? 'Waiting for Approval...' : loading ? 'Processing Queue...' : 'Submit Access Request'}
            </button>
          </form>
        )}

        {activeTab === 'login' && (
          <form name="login" action={loginTarget} method="post">
            <input type="hidden" name="dst" value={dst} />
            <input type="hidden" name="popup" value="true" />
            <label style={styles.label}>Companion Account ID</label>
            <input type="text" name="username" placeholder="e.g., GOK4B72" value={username} onChange={(e) => setUsername(e.target.value)} style={styles.input} required />
            <label style={styles.label}>Companion SMS Password PIN</label>
            <input type="password" name="password" placeholder="Enter SMS PIN" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} required />
            <button type="submit" style={{ ...styles.button, background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>Verify Extra Device</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CaptivePortalPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'system-ui', backgroundColor: '#f8fafc', color: '#64748b' }}>Loading Wi-Fi Portal Context...</div>}>
      <CaptivePortalContent />
    </Suspense>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', margin: 0, padding: '0 16px' },
  card: { backgroundColor: 'white', padding: '36px', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '420px', boxSizing: 'border-box' },
  headerContainer: { textAlign: 'center', marginBottom: '24px' },
  title: { color: '#0f172a', fontSize: '24px', fontWeight: 700, margin: '0 0 4px 0', letterSpacing: '-0.025em' },
  subtitle: { color: '#64748b', fontSize: '14px', margin: 0 },
  debugBox: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#334155', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e2e8f0' },
  tabs: { display: 'flex', marginBottom: '24px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' },
  tab: { flex: 1, textAlign: 'center', padding: '10px', cursor: 'pointer', color: '#64748b', fontWeight: 600, fontSize: '14px', borderRadius: '6px', transition: 'all 0.15s ease' },
  activeTab: { color: '#2563eb', backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' },
  label: { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#344054', fontWeight: 600 },
  input: { width: '100%', padding: '12px 14px', marginBottom: '18px', border: '1px solid #d0d5dd', borderRadius: '8px', boxSizing: 'border-box', fontSize: '15px', outline: 'none' },
  button: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' },
  infoTxt: { display: 'block', fontSize: '12px', color: '#667085', marginTop: '-10px', marginBottom: '20px', lineHeight: '1.5' },
  alert: { padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }
};