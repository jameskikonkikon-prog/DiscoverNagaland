'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { PLANS } from '@/types';

type Business = {
  id: string;
  name: string;
  category: string;
  city: string | null;
  area: string | null;
  phone: string | null;
  whatsapp: string | null;
  price_range: string | null;
  opening_hours: string | null;
  description: string | null;
  tags: string | null;
  website: string | null;
  photos: string[] | null;
  plan: 'basic' | 'pro' | 'plus';
};

const CATEGORIES = [
  'Restaurant', 'Cafe', 'Hotel', 'Retail', 'Grocery', 'Pharmacy',
  'Salon & Beauty', 'Gym & Fitness', 'Electronics', 'Clothing',
  'Bakery', 'Education', 'Healthcare', 'Automotive', 'Real Estate',
  'Professional Services', 'Entertainment', 'Travel & Tourism', 'Other',
];

const PRICE_RANGES = ['₹', '₹₹', '₹₹₹', '₹₹₹₹'];

export default function SettingsPage() {
  const router = useRouter();
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [website, setWebsite] = useState('');

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
        .select('id, name, category, city, area, phone, whatsapp, price_range, opening_hours, description, tags, website, photos, plan')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .single();

      if (!mounted) return;
      if (biz) {
        const b = biz as Business;
        setBusiness(b);
        setName(b.name ?? '');
        setCategory(b.category ?? '');
        setCity(b.city ?? '');
        setArea(b.area ?? '');
        setPhone(b.phone ?? '');
        setWhatsapp(b.whatsapp ?? '');
        setPriceRange(b.price_range ?? '');
        setOpeningHours(b.opening_hours ?? '');
        setDescription(b.description ?? '');
        setTags(b.tags ?? '');
        setWebsite(b.website ?? '');
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
    if (photos.length >= maxPhotos) {
      setUploadError(`Your plan allows max ${maxPhotos === Infinity ? 'unlimited' : maxPhotos} photos`);
      return;
    }
    const allowed = maxPhotos === Infinity ? files.length : Math.min(files.length, maxPhotos - photos.length);
    const toUpload = files.slice(0, allowed);
    if (toUpload.length < files.length) setUploadError(`Only ${allowed} more photo${allowed !== 1 ? 's' : ''} allowed on your plan`);
    else setUploadError('');
    setUploading(true);
    if (!toUpload.length) { setUploading(false); return; }
    try {
      const fd = new FormData();
      toUpload.forEach(f => fd.append('files', f));
      const res = await fetch('/api/upload?type=business', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) setUploadError(json.error ?? 'Upload failed. Please try again.');
      else setPhotos(prev => [...prev, ...json.urls]);
    } catch { setUploadError('Network error during upload. Please try again.'); }
    finally { setUploading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: updErr } = await supabase
      .from('businesses')
      .update({
        name: name.trim(),
        category: category.trim(),
        city: city.trim() || null,
        area: area.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        price_range: priceRange || null,
        opening_hours: openingHours.trim() || null,
        description: description.trim() || null,
        tags: tags.trim() || null,
        website: website.trim() || null,
        photos: photos.length ? photos : null,
      })
      .eq('id', business.id);

    setSaving(false);
    if (updErr) {
      setError(updErr.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
                <div style={s.title}>⚙️ Settings</div>
                <div style={s.sub}>No business linked to your account.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.card}>
          <div style={s.titleRow}>
            <Link href="/dashboard" style={s.back}>←</Link>
            <div>
              <div style={s.title}>⚙️ Edit Listing</div>
              <div style={s.sub}>Update your business information. Changes appear on your public listing immediately.</div>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div style={s.grid2}>
              <div>
                <label style={s.label}>Business Name *</label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={s.input}
                  placeholder="Your business name"
                />
              </div>
              <div>
                <label style={s.label}>Category *</label>
                <select
                  required
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={s.input}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={s.grid2}>
              <div>
                <label style={s.label}>City</label>
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  style={s.input}
                  placeholder="e.g. Kohima"
                />
              </div>
              <div>
                <label style={s.label}>Area / Locality</label>
                <input
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  style={s.input}
                  placeholder="e.g. High School Colony"
                />
              </div>
            </div>

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Phone Number</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={s.input}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label style={s.label}>WhatsApp Number</label>
                <input
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  style={s.input}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Price Range</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PRICE_RANGES.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriceRange(priceRange === p ? '' : p)}
                      style={{
                        ...s.chipBtn,
                        ...(priceRange === p ? s.chipSelected : {}),
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={s.label}>Opening Hours</label>
                <input
                  value={openingHours}
                  onChange={e => setOpeningHours(e.target.value)}
                  style={s.input}
                  placeholder="e.g. Mon–Sat 9am–7pm"
                />
              </div>
            </div>

            <div>
              <label style={s.label}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                style={s.textarea}
                placeholder="Describe your business…"
              />
            </div>

            {/* PHOTOS */}
            {(() => {
              const plan = (business?.plan ?? 'basic') as 'basic' | 'pro' | 'plus';
              const mx = PLANS[plan]?.maxPhotos ?? 2;
              const mxLabel = mx === Infinity ? '∞' : mx;
              return (
                <div style={{ marginTop: 16, marginBottom: 4 }}>
                  <label style={s.label}>
                    Photos <span style={{ fontWeight: 400, opacity: 0.5 }}>({photos.length}/{mxLabel})</span>
                  </label>
                  {photos.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 8, marginBottom: 8 }}>
                      {photos.map((url, i) => (
                        <div key={url} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: '#1a1a1a', border: '1px solid #222' }}>
                          {brokenThumbs.has(i) ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, opacity: 0.3 }}>🖼️</div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={() => setBrokenThumbs(prev => new Set(prev).add(i))} />
                          )}
                          <button
                            type="button"
                            onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                            style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                            aria-label="Remove photo"
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {(mx === Infinity || photos.length < mx) && (
                    <label style={{ display: 'block', background: '#0a0a0a', border: '1.5px dashed #1e1e1e', borderRadius: 10, padding: '14px 16px', textAlign: 'center', cursor: uploading ? 'default' : 'pointer' }}>
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={handlePhotoFiles} disabled={uploading} />
                      <div style={{ fontSize: 18, marginBottom: 4 }}>📷</div>
                      <div style={{ fontSize: 12, color: '#ccc', fontWeight: 600, marginBottom: 2 }}>{uploading ? 'Uploading…' : photos.length === 0 ? 'Add photos' : 'Add more'}</div>
                      <div style={{ fontSize: 11, color: '#555' }}>JPG, PNG, WebP · Max 5 MB each</div>
                    </label>
                  )}
                  {uploadError && <div style={{ fontSize: 11, color: '#c0392b', marginTop: 6 }}>{uploadError}</div>}
                </div>
              );
            })()}

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Tags</label>
                <input
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  style={s.input}
                  placeholder="e.g. delivery, dine-in, vegetarian"
                />
              </div>
              <div>
                <label style={s.label}>Website / Social Link</label>
                <input
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  style={s.input}
                  placeholder="https://instagram.com/yourbusiness"
                />
              </div>
            </div>

            <div style={s.actions}>
              <button type="submit" disabled={saving} style={s.primaryBtn}>
                {saving ? 'Saving…' : '💾 Save Changes'}
              </button>
              {saved && <span style={s.saved}>✓ Saved!</span>}
            </div>

            {error && <div style={s.error}>{error}</div>}
          </form>
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
    padding: 24,
  },
  titleRow: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 },
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
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 },
  label: { display: 'block', marginTop: 16, marginBottom: 6, fontSize: 12, color: '#aaa', fontWeight: 600 },
  input: {
    width: '100%',
    background: '#0a0a0a',
    border: '1px solid #1e1e1e',
    borderRadius: 10,
    padding: '10px 12px',
    color: '#e5e5e5',
    fontFamily: "'Sora', sans-serif",
    fontSize: 13,
    boxSizing: 'border-box',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    background: '#0a0a0a',
    border: '1px solid #1e1e1e',
    borderRadius: 10,
    padding: '10px 12px',
    color: '#e5e5e5',
    fontFamily: "'Sora', sans-serif",
    fontSize: 13,
    resize: 'vertical',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  chipBtn: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #1e1e1e',
    background: '#0a0a0a',
    color: '#e5e5e5',
    fontSize: 13,
    fontFamily: "'Sora', sans-serif",
    cursor: 'pointer',
    fontWeight: 700,
  },
  chipSelected: {
    borderColor: '#c0392b',
    background: 'rgba(192,57,43,0.12)',
    color: '#c0392b',
  },
  actions: { display: 'flex', gap: 12, alignItems: 'center', marginTop: 24 },
  primaryBtn: {
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
  saved: { color: '#25D366', fontWeight: 800, fontSize: 13 },
  error: { marginTop: 12, color: '#c0392b', fontSize: 13, fontWeight: 600 },
};
