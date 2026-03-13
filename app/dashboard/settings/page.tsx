'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

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

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) { router.push('/login'); return; }

      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name, category, city, area, phone, whatsapp, price_range, opening_hours, description, tags, website')
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
      }
      setLoading(false);
    }
    load().catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [supabase, router]);

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
