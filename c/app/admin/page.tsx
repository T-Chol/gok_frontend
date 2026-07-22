// c/app/admin/page.tsx
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

  // Auto-Sync Polling Hook
  useEffect(() => {
    if (!token) return;
    const syncInterval = setInterval(() => {
      fetch(`${API_BASE_URL}/api/employee/pending`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : [])
        .then(data => setPending(data))
        .catch(() => console.debug("Sync transient failure. Re-polling..."));
    }, 3000);
    return () => clearInterval(syncInterval);
  }, [token]);

  const triggerLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const details = new URLSearchParams();
      details.append('username', user);
      details.append('password', pass);

      const res = await fetch(`${API_BASE_URL}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: details
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
        if (data.tunnel_online && data.status === "approved") {
          alert(`Approval complete. Device authorized inside live cache tables successfully.`);
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
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '16px' }}>
        <div style={{ maxWidth: '400px', width: '100%', padding: '32px 24px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>Staff Center Ingress</h3>
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
    <div className="dashboard-wrapper" style={{ padding: '24px 16px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      <style jsx global>{`
        .admin-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .release-portal-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        .vouchers-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        /* Responsive Breakpoints */
        @media (min-width: 640px) {
          .form-grid {
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .release-portal-form {
            flex-direction: row;
          }
        }

        @media (min-width: 1024px) {
          .dashboard-wrapper {
            padding: 40px !important;
          }
          .admin-grid {
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }
        }

        /* Mobile Table Card Transformation */
        @media (max-width: 767px) {
          .responsive-table, .responsive-table tbody, .responsive-table tr, .responsive-table td {
            display: block;
            width: 100%;
          }
          .responsive-table thead {
            display: none;
          }
          .responsive-table tr {
            border-bottom: 1px solid #e2e8f0;
            padding: 16px;
            box-sizing: border-box;
          }
          .responsive-table tr:last-child {
            border-bottom: none;
          }
          .responsive-table td {
            padding: 6px 0 !important;
            border: none !important;
          }
          .responsive-table td::before {
            content: attr(data-label);
            display: block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 4px;
          }
          .vouchers-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            width: 100%;
          }
          .vouchers-group button {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Top Operational Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
            Gok Anyuak Master Operations Center
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px', lineHeight: '1.5' }}>
            Active Session: <strong>{user}</strong> | Clearance Level:{' '}
            <span style={{ padding: '3px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '12px', fontWeight: 700, display: 'inline-block' }}>
              {role.toUpperCase()}
            </span>
          </p>
        </div>

        {/* Admin Controls Panel */}
        {role === 'admin' && (
          <div className="admin-grid">
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={admStyles.sectionTitle}>Global Network Speed Controls</h4>
              <form onSubmit={handleGlobalSpeedSync}>
                <div className="form-grid">
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Download Speed <input type="text" value={dl} onChange={e => setDl(e.target.value)} style={admStyles.inputField} /></label>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Upload Speed <input type="text" value={ul} onChange={e => setUl(e.target.value)} style={admStyles.inputField} /></label>
                </div>
                <div className="form-grid">
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>DoS Max Requests <input type="number" value={dosLimit} onChange={e => setDosLimit(Number(e.target.value))} style={admStyles.inputField} /></label>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>DoS Window (Min) <input type="number" value={dosWindow} onChange={e => setDosWindow(Number(e.target.value))} style={admStyles.inputField} /></label>
                </div>
                <button type="submit" style={{ ...admStyles.actionBtn, background: '#dc2626', width: '100%' }}>Sync Profile Rules</button>
              </form>
            </div>

            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={admStyles.sectionTitle}>Lockout Release Portal</h4>
              <form onSubmit={handleUnblacklist} className="release-portal-form">
                <input type="text" placeholder="Phone or MAC Address Token" value={unblacklistTarget} onChange={e => setUnblacklistTarget(e.target.value)} style={{ ...admStyles.inputField, marginTop: 0, marginBottom: 0 }} required />
                <button type="submit" style={{ ...admStyles.actionBtn, background: '#1e3a8a', whiteSpace: 'nowrap' }}>Release Lockout</button>
              </form>
              <div style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-word' }}>
                <div><strong>Blocked Phones:</strong> {blacklistedPhones.join(', ') || 'None'}</div>
                <div style={{ marginTop: '6px' }}><strong>Blocked MACs:</strong> {blacklistedMacs.join(', ') || 'None'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Live Pending Queue */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>Live Active Requests (Auto-Sync Queue Matrix)</h4>
          </div>
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                    <td data-label="Phone Number" style={admStyles.td}><strong>{req.phone_number}</strong></td>
                    <td data-label="Hardware Signature (MAC)" style={admStyles.td}>
                      <code style={{ background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', fontSize: '12px', wordBreak: 'break-all' }}>{req.mac_address}</code>
                    </td>
                    <td data-label="Authorize Access Vouchers" style={admStyles.td}>
                      <div className="vouchers-group">
                        <button disabled={!!actionLoading} onClick={() => executeVoucherApproval(req.phone_number, 'tier_1', 'mikrotik1')} style={{ ...admStyles.badgeBtn, background: '#10b981', cursor: actionLoading ? 'not-allowed' : 'pointer' }}>{isThisRowBushed ? 'Approving...' : '1hr / 1 Dev (M1)'}</button>
                        <button disabled={!!actionLoading} onClick={() => executeVoucherApproval(req.phone_number, 'tier_2', 'mikrotik1')} style={{ ...admStyles.badgeBtn, background: '#3b82f6', cursor: actionLoading ? 'not-allowed' : 'pointer' }}>{isThisRowBushed ? '...' : '2hr / 2 Devs (M1)'}</button>
                        <button disabled={!!actionLoading} onClick={() => executeVoucherApproval(req.phone_number, 'tier_3', 'mikrotik2')} style={{ ...admStyles.badgeBtn, background: '#6366f1', cursor: actionLoading ? 'not-allowed' : 'pointer' }}>{isThisRowBushed ? '...' : '12hr / 3 Devs (M2)'}</button>
                        <button disabled={!!actionLoading} onClick={() => executeVoucherApproval(req.phone_number, 'tier_4', 'mikrotik2')} style={{ ...admStyles.badgeBtn, background: '#a855f7', cursor: actionLoading ? 'not-allowed' : 'pointer' }}>{isThisRowBushed ? '...' : '30d / 4 Devs (M2)'}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pending.length === 0 && (
                <tr><td colSpan={3} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No guests currently waiting for registration clearance.</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

const admStyles = {
  sectionTitle: { margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  inputField: { width: '100%', padding: '10px 12px', marginTop: '4px', marginBottom: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' as const, fontSize: '14px' },
  primaryBtn: { width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' },
  actionBtn: { color: 'white', padding: '10px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  th: { padding: '14px 20px', fontSize: '12px', color: '#475569', fontWeight: 600 },
  td: { padding: '16px 20px', fontSize: '14px', color: '#334155', verticalAlign: 'middle' },
  badgeBtn: { color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }
};