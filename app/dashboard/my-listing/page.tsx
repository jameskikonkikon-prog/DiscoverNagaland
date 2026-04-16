'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useToast } from '@/components/Toast';
import { PLANS } from '@/types';

type Business = {
  id: string;
  name: string;
  category: string;
  city: string | null;
  area: string | null;
  plan: 'basic' | 'pro' | 'plus';
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  price_range: string | null;
  opening_hours: string | null;
  website: string | null;
  photos: string[] | null;
  description: string | null;
  tags: string | null;
  vibe_tags: string[] | null;
};

export default function MyListingPage() {
  const router = useRouter();
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);

  // Editable fields
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  // Photo management
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [brokenThumbs, setBrokenThumbs] = useState<Set<number>>(new Set());

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) { router.push('/login'); return; }

      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name, category, city, area, phone, whatsapp, email, price_range, opening_hours, website, photos, description, tags, vibe_tags, plan')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .single();

      if (!mounted) return;
      if (biz) {
        const b = biz as Business;
        setBusiness(b);
        setPhone(b.phone ?? '');
        setWhatsapp(b.whatsapp ?? '');
        setEmail(b.email ?? '');
        setPriceRange(b.price_range ?? '');
        setOpeningHours(b.opening_hours ?? '');
        setWebsite(b.website ?? '');
        setDescription(b.description ?? '');
        setPhotos(Array.isArray(b.photos) ? b.photos : []);
      }
      setLoading(false);
    }
    load().catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [supabase, router]);

  async function handlePhotoFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    const plan = (business?.plan ?? 'basic') as 'basic' | 'pro' | 'plus';
    const maxPhotos = PLANS[plan]?.maxPhotos ?? 2;
    if (photos.length >= maxPhotos) { setUploadError(`Your plan allows max ${maxPhotos === Infinity ? 'unlimited' : maxPhotos} photos`); return; }
    const allowed = maxPhotos === Infinity ? files.length : Math.min(files.length, maxPhotos - photos.length);
    const toUpload = files.slice(0, allowed);
    if (toUpload.length < files.length) setUploadError(`Only ${allowed} more photo${allowed !== 1 ? 's' : ''} allowed on your plan`);
    setUploading(true);
    if (!toUpload.length) { setUploading(false); return; }
    try {
      const fd = new FormData();
      toUpload.forEach(f => fd.append('files', f));
      const res = await fetch('/api/upload?type=business', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) { const msg = json.error ?? 'Upload failed. Please try again.'; setUploadError(msg); showToast(msg, 'error'); }
      else { setPhotos(prev => [...prev, ...json.urls]); showToast('Photos uploaded!'); }
    } catch { const msg = 'Network error during upload. Please try again.'; setUploadError(msg); showToast(msg, 'error'); }
    finally { setUploading(false); }
  }

  async function handleSave() {
    if (!business) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/businesses/${business.id}/business`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          email: email.trim() || null,
          price_range: priceRange.trim() || null,
          opening_hours: openingHours.trim() || null,
          website: website.trim() || null,
          description: description.trim() || null,
          photos: photos.length ? photos : null,
        }),
      });
      const json = await res.json();
      setSaving(false);
      if (!res.ok) {
        const msg = json.error ?? 'Failed to save. Please try again.';
        setError(msg);
        showToast(msg, 'error');
      } else {
        setError(null);
        if (Array.isArray(json.business?.photos)) setPhotos(json.business.photos);
        showToast('Listing updated!');
      }
    } catch {
      setSaving(false);
      const msg = 'Network error. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    }
  }

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.card}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.card}>
            <div style={s.titleRow}>
              <Link href="/dashboard" style={s.back}>←</Link>
              <div>
                <div style={s.title}>My Listing</div>
                <div style={s.sub}>No business linked to your account.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const location = [business.area, business.city].filter(Boolean).join(', ');

  const readonlyFields = [
    { label: 'Tags', value: business.tags },
    { label: 'Vibe Tags', value: business.vibe_tags?.join(', ') || null },
  ];

  return (
    <div style={s.page}>
      <style>{`.listing-field-input:focus{border-bottom-color:#c0392b !important;color:#fff !important;}.biz-photo-zone:hover{border-color:#3a1a1a !important;}`}</style>
      <div style={s.container}>
        <div style={s.card}>
          <div style={s.titleRow}>
            <Link href="/dashboard" style={s.back}>←</Link>
            <div>
              <div style={s.title}>My Listing</div>
              <div style={s.sub}>{business.category}{location ? ` · ${location}` : ''}</div>
            </div>
          </div>

          <div style={s.bizName}>{business.name}</div>

          {/* PHOTOS */}
          <div style={{marginBottom:20}}>
            {(() => {
              const p = (business?.plan ?? 'basic') as 'basic' | 'pro' | 'plus';
              const mx = PLANS[p]?.maxPhotos ?? 2;
              const mxLabel = mx === Infinity ? '∞' : mx;
              return (
                <>
                  <div style={{fontSize:11,color:'#666',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:10}}>
                    Photos <span style={{fontWeight:400,opacity:0.5}}>({photos.length}/{mxLabel})</span>
                  </div>
                  {photos.length > 0 && (
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))',gap:8,marginBottom:10}}>
                      {photos.map((url, i) => (
                        <div key={url} style={{position:'relative',borderRadius:8,overflow:'hidden',aspectRatio:'1',background:'#1a1a1a',border:'1px solid #222'}}>
                          {brokenThumbs.has(i) ? (
                            <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,opacity:0.3}}>🖼️</div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt={`Photo ${i + 1}`}
                              style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}
                              onError={() => setBrokenThumbs(prev => new Set(prev).add(i))}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                            style={{position:'absolute',top:3,right:3,width:28,height:28,borderRadius:'50%',background:'rgba(0,0,0,0.8)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:0}}
                            aria-label="Remove photo"
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {(mx === Infinity || photos.length < mx) && (
                    <label style={{display:'block',background:'#161616',border:'1.5px dashed #2a2a2a',borderRadius:10,padding:'14px 16px',textAlign:'center',cursor:uploading?'default':'pointer',transition:'border-color 0.15s'}}>
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple style={{display:'none'}} onChange={handlePhotoFiles} disabled={uploading} />
                      <div style={{fontSize:18,marginBottom:4}}>📷</div>
                      <div style={{fontSize:12,color:'#ccc',fontWeight:600,marginBottom:2}}>{uploading ? 'Uploading…' : photos.length === 0 ? 'Add photos' : 'Add more'}</div>
                      <div style={{fontSize:11,color:'#555'}}>JPG, PNG, WebP · Max 5 MB each</div>
                    </label>
                  )}
                </>
              );
            })()}
            {uploadError && <div style={{fontSize:11,color:'#c0392b',marginTop:6}}>{uploadError}</div>}
          </div>

          <div style={s.fields}>
            <div style={s.fieldRow}>
              <span style={s.fieldLabel}>Phone</span>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="listing-field-input"
                style={s.fieldInput}
                placeholder="Not added"
              />
            </div>
            <div style={s.fieldRow}>
              <span style={s.fieldLabel}>WhatsApp</span>
              <input
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className="listing-field-input"
                style={s.fieldInput}
                placeholder="Not added"
              />
            </div>
            <div style={s.fieldRow}>
              <span style={s.fieldLabel}>Email</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="listing-field-input"
                style={s.fieldInput}
                placeholder="Not added"
              />
            </div>
            <div style={s.fieldRow}>
              <span style={s.fieldLabel}>Price Range</span>
              <input
                value={priceRange}
                onChange={e => setPriceRange(e.target.value)}
                className="listing-field-input"
                style={s.fieldInput}
                placeholder="Not added"
              />
            </div>
            <div style={s.fieldRow}>
              <span style={s.fieldLabel}>Opening Hours</span>
              <input
                value={openingHours}
                onChange={e => setOpeningHours(e.target.value)}
                className="listing-field-input"
                style={s.fieldInput}
                placeholder="Not added"
              />
            </div>
            <div style={s.fieldRow}>
              <span style={s.fieldLabel}>Website</span>
              <input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                className="listing-field-input"
                style={s.fieldInput}
                placeholder="Not added"
              />
            </div>

            <div style={{ ...s.fieldRow, alignItems: 'flex-start', paddingTop: 12 }}>
              <span style={{ ...s.fieldLabel, paddingTop: 4 }}>Description</span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="listing-field-input"
                style={{ ...s.fieldInput, resize: 'vertical', minHeight: 72, lineHeight: 1.5, fontSize: 13, paddingTop: 4 } as React.CSSProperties}
                placeholder="Not added"
                rows={3}
              />
            </div>

            {readonlyFields.map((f, i) => (
              <div key={i} style={s.fieldRow}>
                <span style={s.fieldLabel}>{f.label}</span>
                <span style={{ ...s.fieldValue, ...(f.value ? {} : s.fieldMissing) }}>
                  {f.value ?? 'Not added'}
                </span>
              </div>
            ))}
          </div>

          <div style={s.actions}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={s.saveBtn}
            >
              {saving ? 'Saving…' : '💾 Save Changes'}
            </button>
          </div>

          {error && <div style={s.error}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#e5e5e5',
    fontFamily: "'Sora', sans-serif",
    padding: 24,
  },
  container: { maxWidth: 860, margin: '0 auto' },
  card: {
    background: '#111',
    border: '1px solid #1e1e1e',
    borderRadius: 14,
    padding: 22,
  },
  titleRow: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 18 },
  back: {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: 'grid',
    placeItems: 'center',
    background: '#0a0a0a',
    border: '1px solid #1e1e1e',
    color: '#c0392b',
    textDecoration: 'none',
    fontWeight: 800,
    flexShrink: 0,
  },
  title: { fontSize: 18, fontWeight: 800, marginBottom: 2 },
  sub: { fontSize: 13, color: '#888', lineHeight: 1.5 },
  bizName: { fontSize: 22, fontWeight: 800, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #1e1e1e' },
  fields: { display: 'flex', flexDirection: 'column' },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 12,
    padding: '10px 0',
    borderBottom: '1px solid #1a1a1a',
  },
  fieldLabel: { color: '#666', minWidth: 110 },
  fieldInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid transparent',
    color: '#ccc',
    fontFamily: "'Sora', sans-serif",
    fontSize: 16,
    fontWeight: 500,
    textAlign: 'right',
    outline: 'none',
    padding: '2px 4px',
    transition: 'border-color 0.15s',
  } as React.CSSProperties,
  fieldValue: { color: '#ccc', fontWeight: 500 },
  fieldMissing: { color: '#c0392b', fontStyle: 'italic' },
  actions: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 },
  saveBtn: {
    background: '#c0392b',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '11px 20px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Sora', sans-serif",
    fontSize: 13,
  },
  savedMsg: { color: '#25D366', fontWeight: 800, fontSize: 13 },
  error: { marginTop: 12, color: '#c0392b', fontSize: 13, fontWeight: 600 },
};
