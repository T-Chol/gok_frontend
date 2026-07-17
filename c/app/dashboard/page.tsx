// c/app/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function parseJwtClaims(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
  } catch (err) { return null; }
}

export default function AppDashboard() {
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  type PendingReq = { phone_number: string; mac_address: string };
  const [pending, setPending] = useState<PendingReq[]>([]);
  
  const [dl, setDl] = useState('10M');
  const [ul, setUl] = useState('10M');
  const [dosLimit, setDosLimit] = useState(5);
  const [dosWindow, setDosWindow] = useState(10);
  
  const [blacklistedPhones, setBlacklistedPhones] = useState<string[]>([]);
  const [blacklistedMacs, setBlacklistedMacs] = useState<string[]>([]);
  const [unblacklistTarget, setUnblacklistTarget] = useState('');

  useEffect(() => {
    if (!token) return;
    const syncInterval = setInterval(() => {
      fetch(`${API_BASE_URL}/api/employee/pending`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : [])
        .then(data => setPending(data))
        .catch(() => console.debug("Sync transient trace dropped. Re-polling..."));
    }, 4000); 
    return () => clearInterval(syncInterval);
  }, [token]);

  const triggerLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: user, password: pass })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        const claims = parseJwtClaims(data.access_token);
        setRole(claims?.role || 'employee');
        
        const pendRes = await fetch(`${API_BASE_URL}/api/employee/pending`, { headers: { 'Authorization': `Bearer ${data.access_token}` } });
        if (pendRes.ok) setPending(await pendRes.json());
        if (claims?.role === 'admin') loadBlacklist(data.access_token);
      } else { alert('Authentication credentials invalid.'); }
    } catch { alert('Network connection lost.'); }
    finally { setLoading(false); }
  };

  const loadBlacklist = async (tk: string) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/blacklist`, { headers: { 'Authorization': `Bearer ${tk}` } });
    if (res.ok) {
      const data = await res.json();
      setBlacklistedPhones(data.blacklisted_phones || []);
      setBlacklistedMacs(data.blacklisted_macs || []);
    }
  };

  const handleGlobalSpeedSync = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API_BASE_URL}/api/admin/sync-speed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ download_speed: dl, upload_speed: ul, dos_max_requests: dosLimit, dos_window_minutes: dosWindow })
    });
    alert('System operational controls synchronized.');
  };

  const handleUnblacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/api/admin/unblacklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ target_value: unblacklistTarget })
    });
    if (res.ok) {
      alert('Bypass complete.'); setUnblacklistTarget(''); loadBlacklist(token);
    }
  };

  const executeVoucherApproval = async (phone: string, tierKey: string, routerInstance: string) => {
    if (actionLoading) return;
    setActionLoading(phone);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/employee/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ phone_number: phone, tier_id: tierKey, target_router: routerInstance })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "approved") {
          alert(`Approval logged! Device bypassed securely.`);
        } else {
          alert(`⚠️ ROUTER OFFLINE FALLBACK MODE\n\nUser MAC: ${data.target_mac}\nVoucher ID: ${data.voucher_username}\nPIN: ${data.voucher_password}`);
        }
        setPending(prev => prev.filter(r => r.phone_number !== phone));
      }
    } catch {
      alert('Network transmission failed during clearance.');
    } finally {
      setActionLoading(null);
    }
  };

  if (!token) {
    return (
      <div style={{ backgroundColor: '#f8fafc', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <div style={{ maxWidth: '400px', width: '100%', padding: '32px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>Staff Center Ingress</h3>
          <form onSubmit={triggerLogin}>
            <input type="text" placeholder="Username" value={user} onChange={e => setUser(e.target.value)} style={admStyles.inputField} required />
            <input type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} style={admStyles.inputField} required />
            <button type="submit" disabled={loading} style={admStyles.primaryBtn}>{loading ? 'Authenticating...' : 'Authenticate Terminal'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Gok Anyuak Master Operations Center</h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Active Session: <strong>{user}</strong> | Clearance Level: <span style={{ padding: '3px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>{role.toUpperCase()}</span></p>
          </div>
        </div>

        {role === 'admin' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={admStyles.sectionTitle}>Global Network Speed Controls</h4>
              <form onSubmit={handleGlobalSpeedSync}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Download Speed <input type="text" value={dl} onChange={e => setDl(e.target.value)} style={admStyles.inputField} /></label>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Upload Speed <input type="text" value={ul} onChange={e => setUl(e.target.value)} style={admStyles.inputField} /></label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>DoS Max Requests <input type="number" value={dosLimit} onChange={e => setDosLimit(Number(e.target.value))} style={admStyles.inputField} /></label>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>DoS Window (Min) <input type="number" value={dosWindow} onChange={e => setDosWindow(Number(e.target.value))} style={admStyles.inputField} /></label>
                </div>
                <button type="submit" style={{ ...admStyles.actionBtn, background: '#dc2626' }}>Sync Profile Rules</button>
              </form>
            </div>

            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={admStyles.sectionTitle}>Lockout Release Portal</h4>
              <form onSubmit={handleUnblacklist} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input type="text" placeholder="Phone or MAC Address Token" value={unblacklistTarget} onChange={e => setUnblacklistTarget(e.target.value)} style={{ ...admStyles.inputField, marginTop: 0, marginBottom: 0 }} required />
                  <button type="submit" style={{ ...admStyles.actionBtn, background: '#1e3a8a', whiteSpace: 'nowrap' }}>Release Lockout</button>
                </div>
              </form>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                <div><strong>Blocked Phones:</strong> {blacklistedPhones.join(', ') || 'None'}</div>
                <div style={{ marginTop: '4px' }}><strong>Blocked MACs:</strong> {blacklistedMacs.join(', ') || 'None'}</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Live Active Requests (Auto-Sync Queue Matrix)</h4>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={admStyles.th}>Phone Number</th>
                <th style={admStyles.th}>Hardware Signature (MAC)</th>
                <th style={admStyles.th}>Authorize Access Vouchers</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((req, i) => {
                const isThisRowBushed = actionLoading === req.phone_number;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', opacity: actionLoading && !isThisRowBushed ? 0.5 : 1 }}>
                    <td style={admStyles.td}><strong>{req.phone_number}</strong></td>
                    <td style={admStyles.td}><code style={{ background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', fontSize: '13px' }}>{req.mac_address}</code></td>
                    <td style={{ ...admStyles.td, display: 'flex', gap: '8px' }}>
                      <button disabled={!!actionLoading} onClick={() => executeVoucherApproval(req.phone_number, 'tier_1', 'mikrotik2')} style={{ ...admStyles.badgeBtn, background: '#10b981', cursor: actionLoading ? 'not-allowed' : 'pointer' }}>{isThisRowBushed ? 'Clearing...' : '1hr / Single User'}</button>
                      <button disabled={!!actionLoading} onClick={() => executeVoucherApproval(req.phone_number, 'tier_2', 'mikrotik2')} style={{ ...admStyles.badgeBtn, background: '#3b82f6', cursor: actionLoading ? 'not-allowed' : 'pointer' }}>{isThisRowBushed ? '...' : '2hr / 1 Companion'}</button>
                      <button disabled={!!actionLoading} onClick={() => executeVoucherApproval(req.phone_number, 'tier_3', 'mikrotik2')} style={{ ...admStyles.badgeBtn, background: '#6366f1', cursor: actionLoading ? 'not-allowed' : 'pointer' }}>{isThisRowBushed ? '...' : '12hr / 2 Companions'}</button>
                      <button disabled={!!actionLoading} onClick={() => executeVoucherApproval(req.phone_number, 'tier_4', 'mikrotik2')} style={{ ...admStyles.badgeBtn, background: '#a855f7', cursor: actionLoading ? 'not-allowed' : 'pointer' }}>{isThisRowBushed ? '...' : '30d / 3 Companions'}</button>
                    </td>
                  </tr>
                );
              })}
              {pending.length === 0 && (
                <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No guests currently waiting for registration clearance.</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

const admStyles = {
  sectionTitle: { margin: '0 0 20px 0', fontSize: '15px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  inputField: { width: '100%', padding: '10px 12px', marginTop: '6px', marginBottom: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' as const, fontSize: '14px' },
  primaryBtn: { width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' },
  actionBtn: { color: 'white', padding: '10px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  th: { padding: '14px 24px', fontSize: '13px', color: '#475569', fontWeight: 600 },
  td: { padding: '16px 24px', fontSize: '14px', color: '#334155', verticalAlign: 'middle' },
  badgeBtn: { color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }
};