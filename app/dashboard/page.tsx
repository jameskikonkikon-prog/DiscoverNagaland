'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';
import { PLANS } from '@/types';
import type { PlanType } from '@/types';

type Business = {
  id: string; name: string; category: string; city: string;
  address: string; landmark?: string; phone: string; whatsapp?: string;
  email?: string; description?: string; opening_hours?: string;
  photos?: string[]; videos?: string[]; website?: string; tags?: string;
  plan: PlanType; plan_expires_at?: string;
  views?: number; call_clicks?: number; whatsapp_clicks?: number;
  is_verified?: boolean; is_founding_member?: boolean; menu_url?: string;
  price_min?: number; price_max?: number; price_range?: string;
  amenities?: string; gender?: string; vacancy?: boolean;
  wifi?: boolean; ac?: boolean; meals?: boolean;
  room_type?: string; cuisine?: string; vibe_tags?: string;
};

function getPlanLabel(plan: PlanType) {
  return { basic: 'Basic (Free)', pro: 'Pro', plus: 'Plus' }[plan] || plan;
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

  const update = (field: string, value: string | number | boolean) => setForm(f => ({ ...f, [field]: value }));

  const uploadPhotos = async (businessId: string) => {
    const urls: string[] = [];
    for (const photo of photos) {
      const ext = photo.name.split('.').pop();
      const path = `${businessId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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
      const updates: Record<string, unknown> = { ...form };
      delete updates.id; delete updates.owner_id; delete updates.created_at; delete updates.updated_at;
      if (photos.length > 0) {
        const maxPhotos = PLANS[biz.plan]?.maxPhotos ?? 2;
        const allPhotos = await uploadPhotos(biz.id);
        updates.photos = maxPhotos === Infinity ? allPhotos : allPhotos.slice(0, maxPhotos);
      }
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
      setSaveMsg('Saved successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch { setSaveMsg('Failed to save. Please try again.'); }
    setSaving(false);
  };

  const removePhoto = (index: number) => {
    if (!biz || !biz.photos) return;
    const updated = biz.photos.filter((_, i) => i !== index);
    setForm(f => ({ ...f, photos: updated }));
    setBiz(b => b ? { ...b, photos: updated } : b);
  };

  if (loading) return (
    <>
      <style>{styles}</style>
      <main className="dash-page">
        <div className="loading-wrap"><div className="loading-spinner" /><p>Loading your dashboard...</p></div>
      </main>
    </>
  );

  if (!biz) return null;

  const plan = biz.plan || 'basic';
  const planConfig = PLANS[plan];
  const isBasic = plan === 'basic';
  const isPro = plan === 'pro';
  const isPlus = plan === 'plus';
  const hasAnalytics = isPro || isPlus;
  const maxPhotos = planConfig?.maxPhotos ?? 2;
  const currentPhotoCount = biz.photos?.length || 0;
  const canAddPhotos = maxPhotos === Infinity || currentPhotoCount < maxPhotos;

  // Category-specific fields
  const cat = biz.category?.toLowerCase() || '';
  const showPG = ['pg', 'rental', 'hotel'].includes(cat);
  const showFood = ['restaurant', 'cafe', 'food'].includes(cat);

  return (
    <>
      <style>{styles}</style>
      <main className="dash-page">
        <header className="dash-header">
          <a href="/" className="dash-logo">
            <span className="logo-y">Yana</span><span className="logo-n">Nagaland</span>
          </a>
          <div className="dash-header-right">
            <a href={`/business/${biz.id}`} target="_blank" rel="noopener noreferrer" className="preview-btn">View Listing</a>
            <button className="logout-btn" onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}>Sign Out</button>
          </div>
        </header>

        <div className="dash-content">
          {success === 'upgraded' && (
            <div className="success-banner">Plan upgraded successfully! Your listing now has enhanced visibility.</div>
          )}

          {/* Founding Member Banner */}
          {biz.is_founding_member && (
            <div className="founding-member-banner">
              <strong>🎉 Founding Member — Pro Plan Free Forever</strong>
              <p>You&apos;re one of the first 100 businesses on Yana Nagaland. Your Pro plan never expires.</p>
            </div>
          )}

          {/* Basic plan upsell */}
          {isBasic && (
            <div className="free-banner">
              <div>
                <strong>You&apos;re on the Basic (Free) plan</strong>
                <p>Your listing is live but ranked lower in search. Upgrade for analytics, AI tools, and higher visibility.</p>
              </div>
              <a href="/pricing" className="trial-upgrade-btn">View Plans</a>
            </div>
          )}

          {/* Welcome */}
          <div className="dash-welcome">
            <div>
              <h1>{biz.name}</h1>
              <p className="dash-meta">
                {biz.category} · {biz.city}
                <span className={`plan-badge plan-${plan}`}>{getPlanLabel(plan)}</span>
                {biz.is_verified && <span className="verified-tag">Verified</span>}
                {biz.is_founding_member && <span className="founding-tag">Founding Member</span>}
              </p>
            </div>
            {saveMsg && <div className={`save-msg ${saveMsg.includes('Failed') ? 'error' : ''}`}>{saveMsg}</div>}
          </div>

          {/* Stats */}
          <div className="stats-grid">
            {[
              { icon: '👁', label: 'Profile Views', value: biz.views || 0 },
              { icon: '📞', label: 'Call Clicks', value: biz.call_clicks || 0 },
              { icon: '💬', label: 'WhatsApp Clicks', value: biz.whatsapp_clicks || 0 },
            ].map(s => (
              <div key={s.label} className={`stat-card ${!hasAnalytics ? 'locked' : ''}`}>
                <div className="stat-icon">{s.icon}</div>
                {!hasAnalytics ? (
                  <div className="stat-locked">
                    <div className="lock-icon">🔒</div>
                    <div className="stat-label">Pro plan required</div>
                  </div>
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
              {isBasic && <div className="plan-info-sub">Free forever · Standard listing</div>}
              {isPro && biz.is_founding_member && <div className="plan-info-sub">Founding Member · Free forever</div>}
              {isPro && !biz.is_founding_member && <div className="plan-info-sub">₹299/month · Analytics + Higher ranking</div>}
              {isPlus && <div className="plan-info-sub">₹499/month · Priority ranking + Featured</div>}
            </div>
            {!isPlus && (
              <a href="/pricing" className="upgrade-cta-btn">
                {isBasic ? 'Upgrade Plan' : 'Upgrade to Plus'}
              </a>
            )}
          </div>

          {/* Edit section header */}
          <div className="section-header">
            <h2>Listing Details</h2>
            {!editing
              ? <button className="edit-btn" onClick={() => setEditing(true)}>Edit</button>
              : <div className="edit-actions">
                  <button className="cancel-btn" onClick={() => { setEditing(false); setForm(biz); }}>Cancel</button>
                  <button className="save-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
            }
          </div>

          <div className="details-grid">
            {/* Basic Info */}
            <div className="detail-card full-width">
              <div className="detail-title">Basic Information</div>
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
                {editing ? <textarea className="detail-textarea" value={form.description || ''} onChange={e => update('description', e.target.value)} rows={3} placeholder="Describe your business..." /> : <div className="detail-value">{biz.description || <span className="detail-empty">Not set</span>}</div>}
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <div className="detail-label">Opening Hours</div>
                  {editing ? <input className="detail-input" value={form.opening_hours || ''} onChange={e => update('opening_hours', e.target.value)} placeholder="e.g. 9 AM - 9 PM" /> : <div className="detail-value">{biz.opening_hours || <span className="detail-empty">Not set</span>}</div>}
                </div>
                <div className="detail-group">
                  <div className="detail-label">Tags</div>
                  {editing ? <input className="detail-input" value={form.tags || ''} onChange={e => update('tags', e.target.value)} placeholder="comma separated tags" /> : <div className="detail-value">{biz.tags || <span className="detail-empty">Not set</span>}</div>}
                </div>
              </div>
              <div className="detail-group">
                <div className="detail-label">Vibe Tags</div>
                {editing ? <input className="detail-input" value={form.vibe_tags || ''} onChange={e => update('vibe_tags', e.target.value)} placeholder="e.g. cozy, family-friendly, romantic" /> : <div className="detail-value">{biz.vibe_tags || <span className="detail-empty">Not set</span>}</div>}
              </div>
            </div>

            {/* Location */}
            <div className="detail-card">
              <div className="detail-title">Location</div>
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

            {/* Contact */}
            <div className="detail-card">
              <div className="detail-title">Contact</div>
              <div className="detail-group">
                <div className="detail-label">Phone</div>
                {editing ? <input className="detail-input" value={form.phone || ''} onChange={e => update('phone', e.target.value)} /> : <div className="detail-value">{biz.phone}</div>}
              </div>
              <div className="detail-group">
                <div className="detail-label">WhatsApp</div>
                {editing ? <input className="detail-input" value={form.whatsapp || ''} onChange={e => update('whatsapp', e.target.value)} placeholder="WhatsApp number" /> : <div className="detail-value">{biz.whatsapp || <span className="detail-empty">Not set</span>}</div>}
              </div>
              <div className="detail-group">
                <div className="detail-label">Email</div>
                {editing ? <input className="detail-input" value={form.email || ''} onChange={e => update('email', e.target.value)} placeholder="Email address" /> : <div className="detail-value">{biz.email || <span className="detail-empty">Not set</span>}</div>}
              </div>
              <div className="detail-group">
                <div className="detail-label">Website</div>
                {editing ? <input className="detail-input" value={form.website || ''} onChange={e => update('website', e.target.value)} placeholder="https://" /> : <div className="detail-value">{biz.website || <span className="detail-empty">Not set</span>}</div>}
              </div>
            </div>

            {/* Pricing */}
            <div className="detail-card full-width">
              <div className="detail-title">Pricing</div>
              <div className="detail-row three-col">
                <div className="detail-group">
                  <div className="detail-label">Min Price (₹)</div>
                  {editing ? <input className="detail-input" type="number" value={form.price_min ?? ''} onChange={e => update('price_min', e.target.value ? Number(e.target.value) : '')} placeholder="e.g. 500" /> : <div className="detail-value">{biz.price_min != null ? `₹${biz.price_min}` : <span className="detail-empty">Not set</span>}</div>}
                </div>
                <div className="detail-group">
                  <div className="detail-label">Max Price (₹)</div>
                  {editing ? <input className="detail-input" type="number" value={form.price_max ?? ''} onChange={e => update('price_max', e.target.value ? Number(e.target.value) : '')} placeholder="e.g. 2000" /> : <div className="detail-value">{biz.price_max != null ? `₹${biz.price_max}` : <span className="detail-empty">Not set</span>}</div>}
                </div>
                <div className="detail-group">
                  <div className="detail-label">Price Range Label</div>
                  {editing ? <input className="detail-input" value={form.price_range || ''} onChange={e => update('price_range', e.target.value)} placeholder="e.g. Budget, Mid-range, Premium" /> : <div className="detail-value">{biz.price_range || <span className="detail-empty">Not set</span>}</div>}
                </div>
              </div>
            </div>

            {/* PG / Rental / Hotel fields */}
            {showPG && (
              <div className="detail-card full-width">
                <div className="detail-title">Accommodation Details</div>
                <div className="detail-row">
                  <div className="detail-group">
                    <div className="detail-label">Gender Preference</div>
                    {editing ? (
                      <select className="detail-input" value={form.gender || ''} onChange={e => update('gender', e.target.value)}>
                        <option value="">Any / Not specified</option>
                        <option value="male">Male only</option>
                        <option value="female">Female only</option>
                        <option value="coed">Co-ed</option>
                      </select>
                    ) : <div className="detail-value">{biz.gender ? biz.gender.charAt(0).toUpperCase() + biz.gender.slice(1) : <span className="detail-empty">Not set</span>}</div>}
                  </div>
                  <div className="detail-group">
                    <div className="detail-label">Room Type</div>
                    {editing ? (
                      <select className="detail-input" value={form.room_type || ''} onChange={e => update('room_type', e.target.value)}>
                        <option value="">Not specified</option>
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                        <option value="shared">Shared</option>
                        <option value="dormitory">Dormitory</option>
                      </select>
                    ) : <div className="detail-value">{biz.room_type ? biz.room_type.charAt(0).toUpperCase() + biz.room_type.slice(1) : <span className="detail-empty">Not set</span>}</div>}
                  </div>
                </div>
                <div className="toggle-row">
                  <label className="toggle-item">
                    <span>Vacancy Available</span>
                    {editing ? <input type="checkbox" checked={!!form.vacancy} onChange={e => update('vacancy', e.target.checked)} /> : <span className={`toggle-status ${biz.vacancy ? 'on' : 'off'}`}>{biz.vacancy ? 'Yes' : 'No'}</span>}
                  </label>
                  <label className="toggle-item">
                    <span>WiFi</span>
                    {editing ? <input type="checkbox" checked={!!form.wifi} onChange={e => update('wifi', e.target.checked)} /> : <span className={`toggle-status ${biz.wifi ? 'on' : 'off'}`}>{biz.wifi ? 'Yes' : 'No'}</span>}
                  </label>
                  <label className="toggle-item">
                    <span>AC</span>
                    {editing ? <input type="checkbox" checked={!!form.ac} onChange={e => update('ac', e.target.checked)} /> : <span className={`toggle-status ${biz.ac ? 'on' : 'off'}`}>{biz.ac ? 'Yes' : 'No'}</span>}
                  </label>
                  <label className="toggle-item">
                    <span>Meals Included</span>
                    {editing ? <input type="checkbox" checked={!!form.meals} onChange={e => update('meals', e.target.checked)} /> : <span className={`toggle-status ${biz.meals ? 'on' : 'off'}`}>{biz.meals ? 'Yes' : 'No'}</span>}
                  </label>
                </div>
                <div className="detail-group">
                  <div className="detail-label">Amenities</div>
                  {editing ? <input className="detail-input" value={form.amenities || ''} onChange={e => update('amenities', e.target.value)} placeholder="e.g. parking, laundry, gym, water purifier" /> : <div className="detail-value">{biz.amenities || <span className="detail-empty">Not set</span>}</div>}
                </div>
              </div>
            )}

            {/* Food / Restaurant fields */}
            {showFood && (
              <div className="detail-card full-width">
                <div className="detail-title">Restaurant Details</div>
                <div className="detail-group">
                  <div className="detail-label">Cuisine</div>
                  {editing ? <input className="detail-input" value={form.cuisine || ''} onChange={e => update('cuisine', e.target.value)} placeholder="e.g. Naga, Chinese, Indian, Continental" /> : <div className="detail-value">{biz.cuisine || <span className="detail-empty">Not set</span>}</div>}
                </div>
                <div className="toggle-row">
                  <label className="toggle-item">
                    <span>WiFi</span>
                    {editing ? <input type="checkbox" checked={!!form.wifi} onChange={e => update('wifi', e.target.checked)} /> : <span className={`toggle-status ${biz.wifi ? 'on' : 'off'}`}>{biz.wifi ? 'Yes' : 'No'}</span>}
                  </label>
                  <label className="toggle-item">
                    <span>AC</span>
                    {editing ? <input type="checkbox" checked={!!form.ac} onChange={e => update('ac', e.target.checked)} /> : <span className={`toggle-status ${biz.ac ? 'on' : 'off'}`}>{biz.ac ? 'Yes' : 'No'}</span>}
                  </label>
                </div>
                <div className="detail-group" style={{ marginTop: '0.5rem' }}>
                  <div className="detail-label">Menu Upload</div>
                  {biz.menu_url && <a href={biz.menu_url} target="_blank" rel="noopener noreferrer" className="menu-link">View current menu</a>}
                  {editing && (
                    <label className="upload-box" style={{ marginTop: '0.5rem' }}>
                      <span>{menuFile ? `Selected: ${menuFile.name}` : '+ Upload menu (PDF or image)'}</span>
                      <input type="file" accept="image/*,.pdf" onChange={e => setMenuFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Non-PG/Food amenities */}
            {!showPG && !showFood && (
              <div className="detail-card full-width">
                <div className="detail-title">Amenities & Features</div>
                <div className="toggle-row">
                  <label className="toggle-item">
                    <span>WiFi</span>
                    {editing ? <input type="checkbox" checked={!!form.wifi} onChange={e => update('wifi', e.target.checked)} /> : <span className={`toggle-status ${biz.wifi ? 'on' : 'off'}`}>{biz.wifi ? 'Yes' : 'No'}</span>}
                  </label>
                  <label className="toggle-item">
                    <span>AC</span>
                    {editing ? <input type="checkbox" checked={!!form.ac} onChange={e => update('ac', e.target.checked)} /> : <span className={`toggle-status ${biz.ac ? 'on' : 'off'}`}>{biz.ac ? 'Yes' : 'No'}</span>}
                  </label>
                </div>
                <div className="detail-group">
                  <div className="detail-label">Amenities</div>
                  {editing ? <input className="detail-input" value={form.amenities || ''} onChange={e => update('amenities', e.target.value)} placeholder="e.g. parking, air conditioning, wheelchair access" /> : <div className="detail-value">{biz.amenities || <span className="detail-empty">Not set</span>}</div>}
                </div>
              </div>
            )}

            {/* Photos */}
            <div className="detail-card full-width">
              <div className="detail-title">
                Photos
                <span className="photo-count">{currentPhotoCount} / {maxPhotos === Infinity ? '∞' : maxPhotos}</span>
              </div>
              {biz.photos && biz.photos.length > 0
                ? <div className="photos-grid">
                    {biz.photos.map((p, i) => (
                      <div key={i} className="photo-wrap">
                        <img src={p} alt="" className="photo-thumb" />
                        {editing && <button className="photo-remove" onClick={() => removePhoto(i)}>×</button>}
                      </div>
                    ))}
                  </div>
                : <p className="detail-empty">No photos yet</p>
              }
              {editing && canAddPhotos && (
                <label className="upload-box" style={{ marginTop: '0.75rem' }}>
                  <span>{photos.length > 0 ? `${photos.length} new photo${photos.length > 1 ? 's' : ''} selected` : '+ Add photos'}</span>
                  <input type="file" multiple accept="image/*" onChange={e => setPhotos(Array.from(e.target.files || []))} style={{ display: 'none' }} />
                </label>
              )}
              {editing && !canAddPhotos && (
                <div className="photo-limit-msg">
                  Photo limit reached ({maxPhotos}). <a href="/pricing" style={{ color: '#c0392b', textDecoration: 'underline' }}>Upgrade for more</a>
                </div>
              )}
            </div>
          </div>

          {/* Account section */}
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
    <Suspense fallback={<div style={{ background: '#0a0a0a', minHeight: '100vh' }} />}>
      <DashboardInner />
    </Suspense>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Sora:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; color: #e0e0e0; font-family: 'Sora', sans-serif; }

  .dash-page { min-height: 100vh; background: #0a0a0a; }

  .dash-header {
    position: sticky; top: 0; z-index: 50;
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 2rem;
    background: rgba(10,10,10,0.97);
    border-bottom: 1px solid #1e1e1e;
    backdrop-filter: blur(12px);
  }
  .dash-logo { text-decoration: none; display: flex; gap: 4px; align-items: baseline; }
  .logo-y { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; color: #fff; }
  .logo-n { font-family: 'Sora', sans-serif; font-size: 0.65rem; color: #888; text-transform: uppercase; letter-spacing: 0.3em; }
  .dash-header-right { display: flex; gap: 0.75rem; align-items: center; }
  .preview-btn {
    padding: 0.5rem 1rem;
    background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.2);
    color: #c0392b; text-decoration: none; border-radius: 8px; font-size: 0.82rem;
  }
  .logout-btn {
    padding: 0.5rem 1rem; background: transparent;
    border: 1px solid #2a2a2a; color: #888;
    border-radius: 8px; font-family: 'Sora', sans-serif; font-size: 0.82rem; cursor: pointer;
  }

  .dash-content { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

  .success-banner {
    background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.15);
    color: #4ade80; padding: 1rem 1.25rem; border-radius: 10px; margin-bottom: 1.25rem; font-size: 0.9rem;
  }

  .founding-member-banner {
    background: linear-gradient(135deg, rgba(74,222,128,0.06), rgba(212,160,23,0.06));
    border: 1px solid rgba(74,222,128,0.2);
    border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; text-align: center;
  }
  .founding-member-banner strong { color: #4ade80; display: block; margin-bottom: 0.3rem; }
  .founding-member-banner p { font-size: 0.83rem; color: #888; }

  .free-banner {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    background: rgba(255,255,255,0.02); border: 1px solid #222;
    border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;
  }
  .free-banner strong { color: #ccc; display: block; margin-bottom: 0.25rem; }
  .free-banner p { font-size: 0.83rem; color: #888; }

  .trial-upgrade-btn {
    padding: 0.65rem 1.25rem;
    background: #c0392b; color: #fff;
    text-decoration: none; border-radius: 8px; border: none;
    font-size: 0.85rem; font-weight: 700; white-space: nowrap; flex-shrink: 0;
    cursor: pointer; font-family: 'Sora', sans-serif;
    transition: background 0.15s, transform 0.15s;
    box-shadow: 0 4px 14px rgba(192,57,43,0.25);
  }
  .trial-upgrade-btn:hover { background: #a93226; transform: translateY(-1px); }

  .dash-welcome {
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;
  }
  .dash-welcome h1 { font-family: 'Playfair Display', serif; font-size: 1.7rem; color: #fff; margin-bottom: 0.3rem; }
  .dash-meta { color: #888; font-size: 0.88rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .plan-badge {
    padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;
  }
  .plan-basic { background: #1a1a1a; color: #888; border: 1px solid #2a2a2a; }
  .plan-pro { background: rgba(192,57,43,0.1); color: #e74c3c; border: 1px solid rgba(192,57,43,0.25); }
  .plan-plus { background: rgba(212,160,23,0.1); color: #D4A017; border: 1px solid rgba(212,160,23,0.25); }
  .verified-tag {
    background: rgba(74,222,128,0.08); color: #4ade80;
    border: 1px solid rgba(74,222,128,0.15); padding: 0.15rem 0.5rem;
    border-radius: 20px; font-size: 0.72rem;
  }
  .founding-tag {
    background: rgba(212,160,23,0.08); color: #D4A017;
    border: 1px solid rgba(212,160,23,0.15); padding: 0.15rem 0.5rem;
    border-radius: 20px; font-size: 0.72rem;
  }
  .save-msg {
    padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.85rem;
    background: rgba(74,222,128,0.08); color: #4ade80; border: 1px solid rgba(74,222,128,0.15);
  }
  .save-msg.error { background: rgba(239,68,68,0.08); color: #f87171; border-color: rgba(239,68,68,0.15); }

  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  .stat-card {
    background: #141414; border: 1px solid #1e1e1e;
    border-radius: 14px; padding: 1.5rem; text-align: center;
  }
  .stat-card.locked { opacity: 0.5; }
  .stat-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
  .stat-value { font-family: 'Playfair Display', serif; font-size: 2rem; color: #fff; font-weight: 700; margin-bottom: 0.35rem; }
  .stat-label { font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
  .stat-locked { color: #444; }
  .lock-icon { font-size: 1.2rem; margin-bottom: 0.3rem; }

  .plan-info-card {
    display: flex; align-items: center; justify-content: space-between;
    background: #141414; border: 1px solid #1e1e1e;
    border-radius: 14px; padding: 1.25rem 1.5rem; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;
  }
  .plan-info-label { font-size: 0.72rem; color: #555; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.3rem; }
  .plan-info-name { font-size: 1.1rem; font-weight: 600; color: #fff; }
  .plan-info-sub { font-size: 0.8rem; color: #888; margin-top: 0.2rem; }
  .upgrade-cta-btn {
    padding: 0.7rem 1.4rem;
    background: #c0392b; color: #fff;
    text-decoration: none; border-radius: 10px;
    font-size: 0.88rem; font-weight: 700;
    transition: background 0.15s, transform 0.15s;
  }
  .upgrade-cta-btn:hover { background: #a93226; transform: translateY(-1px); }

  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
  .section-header h2 { font-family: 'Playfair Display', serif; font-size: 1.25rem; color: #fff; }
  .edit-btn {
    padding: 0.55rem 1.1rem;
    background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.2);
    color: #c0392b; border-radius: 8px;
    font-family: 'Sora', sans-serif; font-size: 0.85rem; cursor: pointer;
  }
  .edit-actions { display: flex; gap: 0.5rem; }
  .cancel-btn {
    padding: 0.55rem 1rem; background: transparent;
    border: 1px solid #2a2a2a; color: #888;
    border-radius: 8px; font-family: 'Sora', sans-serif; font-size: 0.85rem; cursor: pointer;
  }
  .save-btn {
    padding: 0.55rem 1.25rem;
    background: #c0392b; border: none; color: #fff;
    border-radius: 8px; font-family: 'Sora', sans-serif; font-size: 0.85rem; font-weight: 700; cursor: pointer;
  }
  .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
  .detail-card {
    background: #141414; border: 1px solid #1e1e1e;
    border-radius: 14px; padding: 1.5rem;
  }
  .detail-card.full-width { grid-column: 1 / -1; }
  .detail-title {
    font-size: 0.78rem; color: #c0392b; letter-spacing: 0.1em;
    text-transform: uppercase; font-weight: 600; margin-bottom: 1.25rem;
    display: flex; align-items: center; justify-content: space-between;
  }
  .detail-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .detail-row.three-col { grid-template-columns: 1fr 1fr 1fr; }
  .detail-group { margin-bottom: 1rem; }
  .detail-group:last-child { margin-bottom: 0; }
  .detail-label { font-size: 0.72rem; color: #555; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.3rem; }
  .detail-value { font-size: 0.9rem; color: #e0e0e0; line-height: 1.5; }
  .detail-empty { font-size: 0.85rem; color: #444; font-style: italic; }
  .detail-input {
    width: 100%; padding: 0.6rem 0.85rem;
    background: #0a0a0a; border: 1.5px solid #2a2a2a;
    border-radius: 8px; color: #e0e0e0;
    font-family: 'Sora', sans-serif; font-size: 0.9rem; outline: none;
  }
  .detail-input:focus { border-color: #c0392b; }
  .detail-textarea {
    width: 100%; padding: 0.6rem 0.85rem;
    background: #0a0a0a; border: 1.5px solid #2a2a2a;
    border-radius: 8px; color: #e0e0e0;
    font-family: 'Sora', sans-serif; font-size: 0.9rem; outline: none;
    resize: vertical; line-height: 1.5;
  }
  select.detail-input { cursor: pointer; }
  select.detail-input option { background: #0a0a0a; color: #e0e0e0; }

  .toggle-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
  .toggle-item {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.85rem; color: #ccc; cursor: pointer;
  }
  .toggle-item input[type="checkbox"] {
    width: 18px; height: 18px; accent-color: #c0392b; cursor: pointer;
  }
  .toggle-status { font-size: 0.82rem; font-weight: 500; }
  .toggle-status.on { color: #4ade80; }
  .toggle-status.off { color: #555; }

  .menu-link { color: #c0392b; font-size: 0.85rem; text-decoration: underline; }

  .photo-count { font-size: 0.72rem; color: #555; font-weight: 400; letter-spacing: 0; text-transform: none; }
  .photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.5rem; }
  .photo-wrap { position: relative; }
  .photo-thumb { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; }
  .photo-remove {
    position: absolute; top: 4px; right: 4px;
    width: 22px; height: 22px;
    background: rgba(0,0,0,0.7); color: #f87171;
    border: none; border-radius: 50%;
    font-size: 14px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .upload-box {
    display: flex; align-items: center; justify-content: center;
    width: 100%; padding: 1rem;
    border: 2px dashed #2a2a2a; border-radius: 10px;
    color: #888; cursor: pointer; font-size: 0.85rem;
  }
  .upload-box:hover { border-color: #c0392b; color: #c0392b; }
  .photo-limit-msg {
    margin-top: 0.75rem; font-size: 0.82rem; color: #888; text-align: center;
  }

  .danger-zone { border: 1px solid rgba(255,80,80,0.08); border-radius: 12px; padding: 1.25rem; }
  .danger-title { font-size: 0.72rem; color: #f87171; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.75rem; }
  .logout-danger-btn {
    padding: 0.6rem 1.25rem; background: transparent;
    border: 1px solid rgba(248,113,113,0.15); color: #f87171;
    border-radius: 8px; font-family: 'Sora', sans-serif; font-size: 0.85rem; cursor: pointer;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 1rem; color: #888; }
  .loading-spinner { width: 40px; height: 40px; border: 3px solid #222; border-top-color: #c0392b; border-radius: 50%; animation: spin 0.8s linear infinite; }

  @media (max-width: 640px) {
    .stats-grid { grid-template-columns: 1fr; }
    .details-grid { grid-template-columns: 1fr; }
    .detail-row { grid-template-columns: 1fr; }
    .detail-row.three-col { grid-template-columns: 1fr; }
    .dash-content { padding: 1.25rem 1rem 3rem; }
    .toggle-row { flex-direction: column; gap: 0.75rem; }
  }
`;
