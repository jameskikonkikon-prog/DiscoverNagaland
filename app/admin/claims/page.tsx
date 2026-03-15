'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const ADMIN_EMAIL = 'jameskikonkikon@gmail.com';

type Claim = {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string;
  designation: string | null;
  status: string;
  created_at: string;
  businesses: { name: string } | null;
};

export default function AdminClaimsPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null); // claim id being processed

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      setAuthChecked(true);

      if (!user || user.email !== ADMIN_EMAIL) {
        setAuthorized(false);
        return;
      }

      setAuthorized(true);
      const { data } = await supabase
        .from('claims')
        .select('*, businesses(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setClaims((data as Claim[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleAction = async (claimId: string, action: 'approve' | 'reject') => {
    setActing(claimId);
    try {
      const res = await fetch(`/api/admin/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setClaims(prev => prev.filter(c => c.id !== claimId));
      }
    } finally {
      setActing(null);
    }
  };

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (!authChecked) return null;
  if (!authorized) return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#666' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c0392b', marginBottom: '0.5rem' }}>Unauthorized</div>
        <div style={{ fontSize: '0.85rem' }}>You must be logged in as the admin to view this page.</div>
        <a href="/" style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.82rem', color: '#555', textDecoration: 'none' }}>← Go home</a>
      </div>
    </main>
  );

  return (
    <>
      <style>{styles}</style>
      <main className="ac-page">
        <div className="ac-header">
          <div className="ac-header-left">
            <Link href="/admin" className="ac-back">← Admin</Link>
            <h1 className="ac-title">Claim Requests</h1>
          </div>
          <span className="ac-count">{loading ? '…' : `${claims.length} pending`}</span>
        </div>

        {loading ? (
          <div className="ac-empty">Loading…</div>
        ) : claims.length === 0 ? (
          <div className="ac-empty">No pending claims. All clear ✓</div>
        ) : (
          <div className="ac-table-wrap">
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Claimant</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Designation</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(c => (
                  <tr key={c.id}>
                    <td>
                      <a href={`/business/${c.business_id}`} target="_blank" rel="noopener noreferrer" className="ac-biz-link">
                        {c.businesses?.name || c.business_id}
                      </a>
                    </td>
                    <td className="ac-bold">{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.email}</td>
                    <td className="ac-dim">{c.designation || '—'}</td>
                    <td className="ac-dim">{formatDate(c.created_at)}</td>
                    <td>
                      <div className="ac-actions">
                        <button
                          className="ac-btn ac-approve"
                          disabled={acting === c.id}
                          onClick={() => handleAction(c.id, 'approve')}
                        >
                          {acting === c.id ? '…' : 'Approve'}
                        </button>
                        <button
                          className="ac-btn ac-reject"
                          disabled={acting === c.id}
                          onClick={() => handleAction(c.id, 'reject')}
                        >
                          {acting === c.id ? '…' : 'Reject'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; color: #e0e0e0; font-family: 'Sora', sans-serif; min-height: 100vh; }

  .ac-page { min-height: 100vh; background: #0a0a0a; padding: 2rem; }

  .ac-header {
    max-width: 1100px; margin: 0 auto 2rem;
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 1.25rem; border-bottom: 1px solid #1e1e1e;
  }
  .ac-header-left { display: flex; align-items: center; gap: 1.25rem; }
  .ac-back { font-size: 0.82rem; color: #666; text-decoration: none; transition: color 0.15s; }
  .ac-back:hover { color: #c0392b; }
  .ac-title { font-size: 1.25rem; font-weight: 800; color: #fff; }
  .ac-count { font-size: 0.8rem; color: #666; background: #141414; border: 1px solid #1e1e1e; padding: 4px 12px; border-radius: 20px; }

  .ac-empty { max-width: 1100px; margin: 4rem auto; text-align: center; color: #555; font-size: 0.9rem; }

  .ac-table-wrap { max-width: 1100px; margin: 0 auto; overflow-x: auto; border-radius: 12px; border: 1px solid #1e1e1e; }

  .ac-table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
  .ac-table thead { background: #111; }
  .ac-table th {
    padding: 12px 16px; text-align: left;
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: #555;
    border-bottom: 1px solid #1e1e1e;
  }
  .ac-table td { padding: 14px 16px; border-bottom: 1px solid #141414; vertical-align: middle; color: #ccc; }
  .ac-table tr:last-child td { border-bottom: none; }
  .ac-table tr:hover td { background: #0f0f0f; }

  .ac-biz-link { color: #c0392b; text-decoration: none; font-weight: 600; }
  .ac-biz-link:hover { text-decoration: underline; }
  .ac-bold { font-weight: 600; color: #fff; }
  .ac-dim { color: #666; }

  .ac-actions { display: flex; gap: 6px; }
  .ac-btn {
    padding: 5px 14px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;
    border: none; cursor: pointer; font-family: 'Sora', sans-serif;
    transition: opacity 0.15s;
  }
  .ac-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .ac-approve { background: rgba(39,174,96,0.15); color: #27ae60; border: 1px solid rgba(39,174,96,0.3); }
  .ac-approve:hover:not(:disabled) { background: rgba(39,174,96,0.25); }
  .ac-reject { background: rgba(192,57,43,0.12); color: #c0392b; border: 1px solid rgba(192,57,43,0.25); }
  .ac-reject:hover:not(:disabled) { background: rgba(192,57,43,0.22); }

  @media (max-width: 700px) {
    .ac-page { padding: 1rem; }
    .ac-table th:nth-child(3), .ac-table td:nth-child(3),
    .ac-table th:nth-child(5), .ac-table td:nth-child(5) { display: none; }
  }
`;
