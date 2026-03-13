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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);

  // Editable fields
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) { router.push('/login'); return; }

      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name, category, city, area, phone, whatsapp, email, price_range, opening_hours, website, photos, description, tags, vibe_tags')
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
      }
      setLoading(false);
    }
    load().catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [supabase, router]);

  async function handleSave() {
    if (!business) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: updErr } = await supabase
      .from('businesses')
      .update({
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        price_range: priceRange.trim() || null,
        opening_hours: openingHours.trim() || null,
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
    { label: 'Photos', value: business.photos?.length ? `${business.photos.length} photo(s)` : null },
    { label: 'Description', value: business.description },
    { label: 'Tags', value: business.tags },
    { label: 'Vibe Tags', value: business.vibe_tags?.join(', ') || null },
  ];

  return (
    <div style={s.page}>
      <style>{`.listing-field-input:focus{border-bottom-color:#c0392b !important;color:#fff !important;}`}</style>
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
            {saved && <span style={s.savedMsg}>✓ Saved!</span>}
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
    fontSize: 12,
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
