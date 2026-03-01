'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';

type Business = {
  id: string; name: string; category: string; city: string;
  address: string; landmark?: string; phone: string; whatsapp?: string;
  email?: string; description?: string; opening_hours?: string;
  photos?: string[]; website?: string; tags?: string;
  plan?: string; trial_ends_at?: string; plan_expires_at?: string;
  views?: number; call_clicks?: number; whatsapp_clicks?: number;
  is_verified?: boolean; menu_url?: string;
};

function getPlanLabel(plan: string) {
  return { free: '🆓 Free', trial: '🎁 Trial', basic: '⭐ Basic', pro: '👑 Pro' }[plan] || plan;
}

function getTrialDaysLeft(trialEndsAt: string): number {
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [biz, setBiz] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Business>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const success = searchParams.get('success');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single();
      if (!data) { router.push('/register'); return; }
      setBiz(data); setForm(data); setLoading(false);
    }
    load();
  }, [router]);

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const uploadPhotos = async (businessId: string) => {
    const urls: string[] = [];
    for (const photo of photos) {
      const ext = photo.name.split('.').pop();
      const path = `${businessId}/${Date.now()}.${ext}`;
      const { data } = await supabase.storage.from('business-photos').upload(path, photo, { upsert: true });
      if (data) {
        const { data: urlData } = supabase.storage.from('business-photos').getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    return [...(biz?.photos || []), ...urls];
  };

  const handleSave = async () => {
    if (!biz) return;
    setSaving(true);
    try {
      const updates = { ...form };
      if (photos.length > 0) updates.photos = await uploadPhotos(biz.id);
      if (menuFile) {
        const ext = menuFile.name.split('.').pop();
        const path = `menus/${biz.id}/menu.${ext}`;
        const { data } = await supabase.storage.from('business-photos').upload(path, menuFile, { upsert: true });
        if (data) {
          const { data: urlData } = supabase.storage.from('business-photos').getPublicUrl(path);
          updates.menu_url = urlData.publicUrl;
        }
      }
      const { data, error } = await supabase.from('businesses').update(updates).eq('id', biz.id).select().single();
      if (error) throw error;
      setBiz(data); setForm(data); setEditing(false); setPhotos([]); setMenuFile(null);
      setSaveMsg('✓ Saved!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch { setSaveMsg('❌ Failed to save.'); }
    setSaving(false);
  };

  if (loading) return (
    <>
      <style>{styles}</style>
      <main className="dash-page">
        <div className="loading-wrap"><div className="loading-spinner" /><p>Loading…</p></div>
      </main>
    </>
  );

  if (!biz) return null;

  const plan = biz.plan || 'trial';
  const isTrial = plan === 'trial';
  const isFree = plan === 'free';
  const isPro = plan === 'pro';
  const trialDays = biz.trial_ends_at ? getTrialDaysLeft(biz.trial_ends_at) : 0;
  const trialExpired = isTrial && trialDays === 0;

  return (
    <>
      <style>{styles}</style>
      <main className="dash-page">
        <header className="dash-header">
          <a href="/" className="dash-logo">Discover<span>Nagaland</span></a>
          <div className="dash-header-right">
            <a href={`/business/${biz.id}`} target="_blank" rel="noopener noreferrer" className="preview-btn">👁 View Listing</a>
            <button className="logout-btn" onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}>Sign Out</button>
          </div>
        </header>

        <div className="dash-content">
          {success === 'upgraded' && (
            <div className="success-banner">🎉 Plan upgraded successfully! Your listing now has full visibility.</div>
          )}

          {/* Trial banner */}
          {isTrial && !trialExpired && (
            <div className="trial-banner">
              <div>
                <strong>🎁 Free Trial — {trialDays} day{trialDays !== 1 ? 's' : ''} remaining</strong>
                <p>You have full Basic features during your trial. Upgrade before it ends to keep full visibility.</p>
              </div>
              <a href="/upgrade" className="trial-upgrade-btn">Upgrade Now →</a>
            </div>
          )}

          {trialExpired && (
            <div className="trial-expired-banner">
              <div>
                <strong>⚠️ Your free trial has ended</strong>
                <p>Your listing is now on the Free plan with limited visibility. Upgrade to Basic for ₹299/month.</p>
              </div>
              <a href="/upgrade" className="trial-upgrade-btn danger">Upgrade for ₹299/mo →</a>
            </div>
          )}

          {isFree && (
            <div className="free-banner">
              <div>
                <strong>📊 You&apos;re on the Free plan</strong>
                <p>Customers searching your category can&apos;t see your full profile. Upgrade to Basic for ₹299/month to appear in AI search results with full visibility.</p>
              </div>
              <a href="/upgrade" className="trial-upgrade-btn">Upgrade for ₹299/mo →</a>
            </div>
          )}

          <div className="dash-welcome">
            <div>
              <h1>Welcome back! <em>{biz.name}</em></h1>
              <p>{biz.category} · {biz.city} · <span className="plan-badge">{getPlanLabel(plan)}</span> {biz.is_verified && <span className="verified-tag">✓ Verified</span>}</p>
            </div>
            {saveMsg && <div className="save-msg">{saveMsg}</div>}
          </div>

          {/* Stats */}
          <div className="stats-grid">
            {[
              { icon: '👁', label: 'Total Views', value: biz.views || 0, locked: isFree },
              { icon: '📞', label: 'Call Clicks', value: biz.call_clicks || 0, locked: isFree },
              { icon: '💬', label: 'WhatsApp Clicks', value: biz.whatsapp_clicks || 0, locked: isFree },
            ].map(s => (
              <div key={s.label} className={`stat-card ${s.locked ? 'locked' : ''}`}>
                <div className="stat-icon">{s.icon}</div>
                {s.locked ? (
                  <div className="stat-locked">🔒<div className="stat-label">Upgrade to view</div></div>
                ) : (
                  <>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Plan info */}
          <div className="plan-info-card">
            <div className="plan-info-left">
              <div className="plan-info-label">Current Plan</div>
              <div className="plan-info-name">{getPlanLabel(plan)}</div>
              {plan === 'basic' && <div className="plan-info-sub">₹299/month · Full visibility</div>}
              {plan === 'pro' && <div className="plan-info-sub">₹499/month · Priority ranking + Analytics</div>}
              {isTrial && <div className="plan-info-sub">{trialDays} days left in free trial</div>}
            </div>
            {!isPro && (
              <a href="/upgrade" className="upgrade-cta-btn">
                {plan === 'basic' ? 'Upgrade to Pro →' : 'Upgrade Plan →'}
              </a>
            )}
          </div>

          {/* Edit section */}
          <div className="section-header">
            <h2>Listing Details</h2>
            {!editing
              ? <button className="edit-btn" onClick={() => setEditing(true)}>✏️ Edit</button>
              : <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="cancel-btn" onClick={() => { setEditing(false); setForm(biz); }}>Cancel</button>
                  <button className="save-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                </div>
            }
          </div>

          <div className="details-grid">
            <div className="detail-card full-width">
              <div className="detail-title">📋 Basic Information</div>
              <div className="detail-row">
                <div className="detail-group">
                  <div className="detail-label">Business Name</div>
                  {editing ? <input className="detail-input" value={form.name || ''} onChange={e => update('name', e.target.value)} /> : <div className="detail-value">{biz.name}</div>}
                </div>
                <div className="detail-group">
                  <div className="detail-label">Category</div>
                  <div className="detail-value">{biz.category}</div>
                </div>
              </div>
              <div className="detail-group">
                <div className="detail-label">Description</div>
                {editing ? <textarea className="detail-textarea" value={form.description || ''} onChange={e => update('description', e.target.value)} rows={3} /> : <div className="detail-value">{biz.description || <span className="detail-empty">Not set</span>}</div>}
              </div>
              <div className="detail-group">
                <div className="detail-label">Opening Hours</div>
                {editing ? <input className="detail-input" value={form.opening_hours || ''} onChange={e => update('opening_hours', e.target.value)} /> : <div className="detail-value">{biz.opening_hours || <span className="detail-empty">Not set</span>}</div>}
              </div>
            </div>

            <div className="detail-card">
              <div className="detail-title">📍 Location</div>
              <div className="detail-group"><div className="detail-label">District</div><div className="detail-value">{biz.city}</div></div>
              <div className="detail-group">
                <div className="detail-label">Address</div>
                {editing ? <input className="detail-input" value={form.address || ''} onChange={e => update('address', e.target.value)} /> : <div className="detail-value">{biz.address}</div>}
              </div>
              <div className="detail-group">
                <div className="detail-label">Landmark</div>
                {editing ? <input className="detail-input" value={form.landmark || ''} onChange={e => update('landmark', e.target.value)} placeholder="Nearby landmark" /> : <div className="detail-value">{biz.landmark || <span className="detail-empty">Not set</span>}</div>}
              </div>
            </div>

            <div className="detail-card">
              <div className="detail-title">📞 Contact</div>
              <div className="detail-group">
                <div className="detail-label">Phone</div>
                {editing ? <input className="detail-input" value={form.phone || ''} onChange={e => update('phone', e.target.value)} /> : <div className="detail-value">{biz.phone}</div>}
              </div>
              <div className="detail-group">
                <div className="detail-label">WhatsApp</div>
                {editing ? <input className="detail-input" value={form.whatsapp || ''} onChange={e => update('whatsapp', e.target.value)} /> : <div className="detail-value">{biz.whatsapp || <span className="detail-empty">Not set</span>}</div>}
              </div>
              <div className="detail-group">
                <div className="detail-label">Website</div>
                {editing ? <input className="detail-input" value={form.website || ''} onChange={e => update('website', e.target.value)} /> : <div className="detail-value">{biz.website || <span className="detail-empty">Not set</span>}</div>}
              </div>
            </div>

            <div className="detail-card full-width">
              <div className="detail-title">📷 Photos</div>
              {biz.photos && biz.photos.length > 0
                ? <div className="photos-grid">{biz.photos.map((p, i) => <img key={i} src={p} alt="" className="photo-thumb" />)}</div>
                : <p className="detail-empty">No photos yet</p>
              }
              {editing && (
                <label className="upload-box" style={{ marginTop: '0.75rem' }}>
                  <span>{photos.length > 0 ? `✓ ${photos.length} new photos` : '+ Add photos'}</span>
                  <input type="file" multiple accept="image/*" onChange={e => setPhotos(Array.from(e.target.files || []))} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>

          <div className="danger-zone">
            <div className="danger-title">Account</div>
            <button className="logout-danger-btn" onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}>Sign out</button>
          </div>
        </div>
      </main>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0a140a', minHeight: '100vh' }} />}>
      <DashboardInner />
    </Suspense>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a140a; color: #e8ddd0; font-family: 'Outfit', sans-serif; }
  .dash-page { min-height: 100vh; background: #0a140a; }
  .dash-header { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; background: rgba(10,20,10,0.97); border-bottom: 1px solid rgba(201,150,58,0.12); backdrop-filter: blur(12px); }
  .dash-logo { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: #c9963a; text-decoration: none; }
  .dash-logo span { color: #e8ddd0; }
  .dash-header-right { display: flex; gap: 0.75rem; align-items: center; }
  .preview-btn { padding: 0.5rem 1rem; background: rgba(201,150,58,0.1); border: 1px solid rgba(201,150,58,0.25); color: #c9963a; text-decoration: none; border-radius: 8px; font-size: 0.82rem; }
  .logout-btn { padding: 0.5rem 1rem; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #8a9a8a; border-radius: 8px; font-family: 'Outfit', sans-serif; font-size: 0.82rem; cursor: pointer; }
  .dash-content { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
  .success-banner { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.2); color: #4ade80; padding: 1rem 1.25rem; border-radius: 10px; margin-bottom: 1.25rem; font-size: 0.9rem; }
  .trial-banner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: rgba(201,150,58,0.08); border: 1px solid rgba(201,150,58,0.25); border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .trial-banner strong { color: #c9963a; display: block; margin-bottom: 0.25rem; }
  .trial-banner p { font-size: 0.83rem; color: #8a9a8a; }
  .trial-expired-banner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .trial-expired-banner strong { color: #f87171; display: block; margin-bottom: 0.25rem; }
  .trial-expired-banner p { font-size: 0.83rem; color: #8a9a8a; }
  .free-banner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .free-banner strong { color: #a5b4fc; display: block; margin-bottom: 0.25rem; }
  .free-banner p { font-size: 0.83rem; color: #8a9a8a; }
  .trial-upgrade-btn { padding: 0.65rem 1.25rem; background: linear-gradient(135deg, #c9963a, #a07020); color: #000d00; text-decoration: none; border-radius: 8px; font-size: 0.85rem; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
  .trial-upgrade-btn.danger { background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; }
  .dash-welcome { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
  .dash-welcome h1 { font-family: 'Playfair Display', serif; font-size: 1.7rem; color: #e8ddd0; margin-bottom: 0.3rem; }
  .dash-welcome h1 em { color: #c9963a; font-style: italic; }
  .dash-welcome p { color: #8a9a8a; font-size: 0.88rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .plan-badge { background: rgba(201,150,58,0.12); color: #c9963a; padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.78rem; }
  .verified-tag { background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); padding: 0.15rem 0.5rem; border-radius: 20px; font-size: 0.72rem; }
  .save-msg { padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.85rem; background: rgba(74,222,128,0.1); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  .stat-card { background: linear-gradient(145deg, #1a2e1a, #152515); border: 1px solid rgba(201,150,58,0.1); border-radius: 14px; padding: 1.5rem; text-align: center; }
  .stat-card.locked { opacity: 0.6; }
  .stat-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
  .stat-value { font-family: 'Playfair Display', serif; font-size: 2rem; color: #c9963a; font-weight: 700; margin-bottom: 0.35rem; }
  .stat-label { font-size: 0.78rem; color: #8a9a8a; text-transform: uppercase; letter-spacing: 0.08em; }
  .stat-locked { font-size: 1.2rem; color: #4a5a4a; }
  .plan-info-card { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(145deg, #1a2e1a, #152515); border: 1px solid rgba(201,150,58,0.12); border-radius: 14px; padding: 1.25rem 1.5rem; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
  .plan-info-label { font-size: 0.72rem; color: #6a7a6a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.3rem; }
  .plan-info-name { font-size: 1.1rem; font-weight: 600; color: #e8ddd0; }
  .plan-info-sub { font-size: 0.8rem; color: #8a9a8a; margin-top: 0.2rem; }
  .upgrade-cta-btn { padding: 0.7rem 1.4rem; background: linear-gradient(135deg, #c9963a, #a07020); color: #000d00; text-decoration: none; border-radius: 10px; font-size: 0.88rem; font-weight: 700; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
  .section-header h2 { font-family: 'Playfair Display', serif; font-size: 1.25rem; color: #e8ddd0; }
  .edit-btn { padding: 0.55rem 1.1rem; background: rgba(201,150,58,0.1); border: 1px solid rgba(201,150,58,0.25); color: #c9963a; border-radius: 8px; font-family: 'Outfit', sans-serif; font-size: 0.85rem; cursor: pointer; }
  .cancel-btn { padding: 0.55rem 1rem; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #8a9a8a; border-radius: 8px; font-family: 'Outfit', sans-serif; font-size: 0.85rem; cursor: pointer; }
  .save-btn { padding: 0.55rem 1.25rem; background: linear-gradient(135deg, #c9963a, #a07020); border: none; color: #000d00; border-radius: 8px; font-family: 'Outfit', sans-serif; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
  .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
  .detail-card { background: linear-gradient(145deg, #1a2e1a, #152515); border: 1px solid rgba(201,150,58,0.1); border-radius: 14px; padding: 1.5rem; }
  .detail-card.full-width { grid-column: 1 / -1; }
  .detail-title { font-size: 0.78rem; color: #c9963a; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; margin-bottom: 1.25rem; }
  .detail-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .detail-group { margin-bottom: 1rem; }
  .detail-group:last-child { margin-bottom: 0; }
  .detail-label { font-size: 0.72rem; color: #6a7a6a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.3rem; }
  .detail-value { font-size: 0.9rem; color: #e8ddd0; line-height: 1.5; }
  .detail-empty { font-size: 0.85rem; color: #4a5a4a; font-style: italic; }
  .detail-input { width: 100%; padding: 0.6rem 0.85rem; background: rgba(0,0,0,0.3); border: 1.5px solid rgba(201,150,58,0.2); border-radius: 8px; color: #e8ddd0; font-family: 'Outfit', sans-serif; font-size: 0.9rem; outline: none; }
  .detail-input:focus { border-color: #c9963a; }
  .detail-textarea { width: 100%; padding: 0.6rem 0.85rem; background: rgba(0,0,0,0.3); border: 1.5px solid rgba(201,150,58,0.2); border-radius: 8px; color: #e8ddd0; font-family: 'Outfit', sans-serif; font-size: 0.9rem; outline: none; resize: vertical; line-height: 1.5; }
  .photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.5rem; }
  .photo-thumb { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; }
  .upload-box { display: flex; align-items: center; justify-content: center; width: 100%; padding: 1rem; border: 2px dashed rgba(201,150,58,0.2); border-radius: 10px; color: #8a9a8a; cursor: pointer; font-size: 0.85rem; }
  .upload-box:hover { border-color: #c9963a; color: #c9963a; }
  .danger-zone { border: 1px solid rgba(255,80,80,0.1); border-radius: 12px; padding: 1.25rem; }
  .danger-title { font-size: 0.72rem; color: #f87171; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.75rem; }
  .logout-danger-btn { padding: 0.6rem 1.25rem; background: transparent; border: 1px solid rgba(248,113,113,0.2); color: #f87171; border-radius: 8px; font-family: 'Outfit', sans-serif; font-size: 0.85rem; cursor: pointer; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 1rem; color: #8a9a8a; }
  .loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(201,150,58,0.2); border-top-color: #c9963a; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @media (max-width: 640px) {
    .stats-grid { grid-template-columns: 1fr; }
    .details-grid { grid-template-columns: 1fr; }
    .detail-row { grid-template-columns: 1fr; }
    .dash-content { padding: 1.25rem 1rem 3rem; }
  }
`;
