'use client';
import React, { useState, useEffect } from 'react';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'; // Replace with your actual FastAPI endpoint

export default function AppDashboard() {
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  type PendingReq = { phone_number: string; mac_address: string };
  const [pending, setPending] = useState<PendingReq[]>([]);
  
  // Admin Speed Allocation Constraints
  const [dl, setDl] = useState('10M');
  const [ul, setUl] = useState('10M');
  
  // Privilege Promotion Fields
  const [promoUser, setPromoUser] = useState('');
  const [promoRole, setPromoRole] = useState('employee');

  const triggerLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const body = new URLSearchParams({ username: user, password: pass });
    const res = await fetch(`${API_BASE_URL}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (res.ok) {
      const data = await res.json();
      setToken(data.access_token);
      setRole(user === 'admin' ? 'admin' : 'employee');
      loadPending(data.access_token);
    } else {
      alert('Authentication failed');
    }
  };

  const loadPending = async (tk) => {
    const res = await fetch(`${API_BASE_URL}/api/employee/pending`, {
      headers: { 'Authorization': `Bearer ${tk}` }
    });
    if (res.ok) setPending(await res.json());
  };

  const handleGlobalSpeedSync = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/api/admin/sync-speed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ download_speed: dl, upload_speed: ul })
    });
    if (res.ok) alert('Network profiles synchronized to new speed limits.');
  };

  const handleUserRoleElevation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/api/admin/elevate-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ target_username: promoUser, new_role: promoRole })
    });
    if (res.ok) {
      alert(`Successfully elevated user profile state.`);
      setPromoUser('');
    }
  };

  // const executeVoucherApproval = async (phone: string, tierKey: string, routerInstance: string): Promise<void> => {
  //   const res = await fetch(`${API_BASE_URL}/api/employee/approve`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  //     body: JSON.stringify({ phone_number: phone, tier_id: tierKey, target_router: routerInstance })
  //   });
  //   if (res.ok) {
  //     alert('Voucher successfully issued.');
  //     loadPending(token);
  //   }
  // };
const executeVoucherApproval = async (phone: string, tierKey: string, routerInstance: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/api/employee/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ phone_number: phone, tier_id: tierKey, target_router: routerInstance })
  });
  
  if (res.ok) {
    const data = await res.json();
    
    if (data.tunnel_online) {
      alert(`Voucher successfully issued and pushed to router for ${phone}`);
    } else {
      // Clear visual alert layout with the data tokens right on the screen
      alert(
        `⚠️ TUNNEL OFFLINE FALLBACK MODE\n\n` +
        `Unable to reach the router. Please hand over these details directly to the client:\n\n` +
        `User MAC: ${data.target_mac}\n` +
        `Hotspot ID: ${data.voucher_username}\n` +
        `Hotspot PIN: ${data.voucher_password}\n` +
        `Access Tier: ${data.limit_tier}\n\n` +
        `SMS Delivery Status: ${data.sms_sent ? 'Sent' : 'Failed'}`
      );
    }
    loadPending(token);
  }
};

  if (!token) {
    return (
      <div style={{ maxWidth: '360px', margin: '100px auto', padding: '24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'sans-serif' }}>
        <h3>Staff Central Ingress</h3>
        <form onSubmit={triggerLogin}>
          <input type="text" placeholder="Username" value={user} onChange={e => setUser(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} required />
          <input type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px' }} required />
          <button type="submit" style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}>Authenticate</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Gok Anyuak Master Operations Center</h2>
      <p>Active Account Token: <strong>{user}</strong> | Clearance: <strong>{role.toUpperCase()}</strong></p>

      {role === 'admin' && (
        <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h4>Administrative Core Control Interface</h4>
          <div style={{ display: 'flex', gap: '40px' }}>
            <form onSubmit={handleGlobalSpeedSync} style={{ borderRight: '1px solid #cbd5e1', paddingRight: '40px' }}>
              <h5>Sync Global Bandwidth Allocation</h5>
              <input type="text" value={dl} onChange={e => setDl(e.target.value)} style={{ width: '70px', padding: '6px' }} /> Download<br/><br/>
              <input type="text" value={ul} onChange={e => setUl(e.target.value)} style={{ width: '70px', padding: '6px' }} /> Upload<br/><br/>
              <button type="submit" style={{ background: '#dc2626', color: 'white', padding: '8px 12px', border: 'none', cursor: 'pointer' }}>Enforce for Everyone</button>
            </form>
            <form onSubmit={handleUserRoleElevation}>
              <h5>Elevate Staff Permissions</h5>
              <input type="text" placeholder="Username" value={promoUser} onChange={e => setPromoUser(e.target.value)} style={{ padding: '6px', marginRight: '10px' }} required />
              <select value={promoRole} onChange={e => setPromoRole(e.target.value)} style={{ padding: '6px', marginRight: '10px' }}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" style={{ background: '#1e3a8a', color: 'white', padding: '8px 12px', border: 'none', cursor: 'pointer' }}>Authorize Privilege</button>
            </form>
          </div>
        </div>
      )}

      <div style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px' }}>
        <h4>Live Captive Portal Network Ingress Queue</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Phone Number</th>
              <th style={{ padding: '12px' }}>Hardware Signature (MAC)</th>
              <th style={{ padding: '12px' }}>Authorize Access Vouchers</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((req, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px' }}>{req.phone_number}</td>
                <td style={{ padding: '12px' }}><code>{req.mac_address}</code></td>
                <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                  <button onClick={() => executeVoucherApproval(req.phone_number, 'tier_1', 'mikrotik1')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>1hr / 1Dev (M1)</button>
                  <button onClick={() => executeVoucherApproval(req.phone_number, 'tier_2', 'mikrotik1')} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>2hr / 2Dev (M1)</button>
                  <button onClick={() => executeVoucherApproval(req.phone_number, 'tier_3', 'mikrotik2')} style={{ background: '#6366f1', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>12hr / 3Dev (M2)</button>
                  <button onClick={() => executeVoucherApproval(req.phone_number, 'tier_4', 'mikrotik2')} style={{ background: '#a855f7', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>30d / 4Dev (M2)</button>
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No guests currently waiting for registration clearance.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}