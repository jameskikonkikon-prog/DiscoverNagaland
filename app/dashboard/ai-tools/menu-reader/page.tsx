'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import QRCode from 'qrcode';

type Business = { id: string; name: string; plan: string };
type MenuItem = { id: string; name: string; price: string; description: string };

export default function MenuCatalogueQRPage() {
  const router = useRouter();
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Manual add form
  const [addName, setAddName] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [adding, setAdding] = useState(false);

  // Upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) { router.push('/login'); return; }
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name, plan')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .single();
      if (!mounted) return;
      if (!biz) { setLoading(false); return; }
      setBusiness(biz as Business);
      const { data: existing } = await supabase
        .from('menu_items')
        .select('id, name, price, description')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: true });
      if (!mounted) return;
      setItems((existing as MenuItem[]) ?? []);
      const url = `https://yananagaland.com/menu/${biz.id}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#ffffff', light: '#0a0a0a' } });
      if (!mounted) return;
      setQrDataUrl(dataUrl);
      setLoading(false);
    }
    load().catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [supabase, router]);

  const isPro = business?.plan === 'pro' || business?.plan === 'plus';

  async function addItem() {
    if (!business || !addName.trim()) return;
    setAdding(true);
    setSaveError(null);
    const { data, error } = await supabase
      .from('menu_items')
      .insert({ business_id: business.id, name: addName.trim(), price: addPrice.trim(), description: addDesc.trim() })
      .select('id, name, price, description')
      .single();
    setAdding(false);
    if (error) { setSaveError(error.message); return; }
    setItems(prev => [...prev, data as MenuItem]);
    setAddName('');
    setAddPrice('');
    setAddDesc('');
  }

  async function deleteItem(id: string) {
    await supabase.from('menu_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !business) return;
    setUploading(true);
    setUploadError(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/menu-extract', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) { setUploadError(json.error || 'Extraction failed'); return; }
      const extracted: { name: string; price: string; description: string }[] = json.items ?? [];
      if (extracted.length === 0) { setUploadError('No items found in the file.'); return; }
      const { data, error } = await supabase
        .from('menu_items')
        .insert(extracted.map(i => ({ business_id: business.id, name: i.name, price: i.price, description: i.description })))
        .select('id, name, price, description');
      if (error) { setUploadError(error.message); return; }
      setItems(prev => [...prev, ...((data as MenuItem[]) ?? [])]);
    } catch {
      setUploadError('Something went wrong');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function downloadQR() {
    if (!qrDataUrl || !business) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `menu-qr-${business.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  }

  if (loading) {
    return <div style={s.page}><div style={s.container}><div style={s.card}>Loading…</div></div></div>;
  }

  if (!business) {
    return (
      <div style={s.page}><div style={s.container}><div style={s.card}>
        <div style={s.titleRow}>
          <Link href="/dashboard" style={s.back}>←</Link>
          <div><div style={s.title}>📋 Menu & Catalogue QR</div><div style={s.sub}>No business linked to your account.</div></div>
        </div>
      </div></div></div>
    );
  }

  if (!isPro) {
    return (
      <div style={s.page}><div style={s.container}><div style={s.card}>
        <div style={s.titleRow}>
          <Link href="/dashboard" style={s.back}>←</Link>
          <div><div style={s.title}>📋 Menu & Catalogue QR</div><div style={s.sub}>Upgrade to Pro to unlock this tool.</div></div>
        </div>
        <div style={s.lockBox}>
          <div style={s.lockIcon}>🔒</div>
          <div style={s.lockTitle}>Pro Feature</div>
          <div style={s.lockSub}>Build your menu or product catalogue and get a scannable QR code customers can use to browse your offerings instantly.</div>
          <Link href="/dashboard" style={s.upgradeBtn}>Upgrade to Pro →</Link>
        </div>
      </div></div></div>
    );
  }

  const menuUrl = `https://yananagaland.com/menu/${business.id}`;

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.card}>
          <div style={s.titleRow}>
            <Link href="/dashboard" style={s.back}>←</Link>
            <div>
              <div style={s.title}>📋 Menu & Catalogue QR</div>
              <div style={s.sub}>Add your items manually or upload a menu image/PDF. Share the QR so customers can browse instantly.</div>
            </div>
          </div>

          {/* QR Code */}
          {qrDataUrl && (
            <div style={s.qrSection}>
              <img src={qrDataUrl} alt="Menu QR Code" style={s.qrImg} />
              <div style={s.qrUrl}>{menuUrl}</div>
              <div style={s.qrActions}>
                <button type="button" onClick={downloadQR} style={s.primaryBtn}>⬇ Download QR Code</button>
                <a href={menuUrl} target="_blank" rel="noopener noreferrer" style={s.viewBtn}>View Menu →</a>
              </div>
            </div>
          )}

          {/* Upload */}
          <div style={s.sectionLabel}>Upload menu image or PDF</div>
          <div style={s.uploadRow}>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleUpload}
              style={s.fileInput}
              disabled={uploading}
            />
            {uploading && <span style={s.uploadingText}>Extracting items with AI…</span>}
          </div>
          {uploadError && <div style={s.error}>{uploadError}</div>}

          {/* Manual add */}
          <div style={s.sectionLabel}>Add item manually</div>
          <div style={s.addRow}>
            <input value={addName} onChange={e => setAddName(e.target.value)} style={{ ...s.input, flex: 2 }} placeholder="Item name *" />
            <input value={addPrice} onChange={e => setAddPrice(e.target.value)} style={{ ...s.input, flex: 1 }} placeholder="Price (e.g. ₹80)" />
          </div>
          <input value={addDesc} onChange={e => setAddDesc(e.target.value)} style={{ ...s.input, width: '100%', marginTop: 6, boxSizing: 'border-box' }} placeholder="Description (optional)" />
          <button type="button" onClick={addItem} disabled={!addName.trim() || adding} style={{ ...s.primaryBtn, marginTop: 8 }}>
            {adding ? 'Adding…' : '+ Add Item'}
          </button>
          {saveError && <div style={s.error}>{saveError}</div>}

          {/* Items list */}
          {items.length > 0 && (
            <>
              <div style={s.sectionLabel}>{items.length} item{items.length !== 1 ? 's' : ''} in your menu</div>
              <div style={s.itemList}>
                {items.map(item => (
                  <div key={item.id} style={s.itemRow}>
                    <div style={s.itemInfo}>
                      <span style={s.itemName}>{item.name}</span>
                      {item.price && <span style={s.itemPrice}>{item.price}</span>}
                      {item.description && <span style={s.itemDesc}>{item.description}</span>}
                    </div>
                    <button type="button" onClick={() => deleteItem(item.id)} style={s.deleteBtn}>✕</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: "'Sora', sans-serif", padding: 24 },
  container: { maxWidth: 860, margin: '0 auto' },
  card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 18 },
  titleRow: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  back: { width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#0a0a0a', border: '1px solid #1e1e1e', color: '#c0392b', textDecoration: 'none', fontWeight: 800, flexShrink: 0 },
  title: { fontSize: 18, fontWeight: 800, marginBottom: 2 },
  sub: { fontSize: 13, color: '#888', lineHeight: 1.5 },
  qrSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 12, padding: 20, marginBottom: 4 },
  qrImg: { width: 180, height: 180, borderRadius: 10 },
  qrUrl: { fontSize: 11, color: '#555', marginTop: 8, marginBottom: 12, wordBreak: 'break-all', textAlign: 'center' },
  qrActions: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  sectionLabel: { marginTop: 18, marginBottom: 8, fontSize: 12, color: '#aaa', fontWeight: 600 },
  uploadRow: { display: 'flex', alignItems: 'center', gap: 10 },
  fileInput: { fontSize: 12, color: '#888', fontFamily: "'Sora', sans-serif", background: 'transparent', border: '1px solid #1e1e1e', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' },
  uploadingText: { fontSize: 12, color: '#888' },
  addRow: { display: 'flex', gap: 8 },
  input: { background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 10, padding: '10px 12px', color: '#e5e5e5', fontFamily: "'Sora', sans-serif", fontSize: 13 },
  primaryBtn: { background: '#c0392b', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora', sans-serif", fontSize: 13 },
  viewBtn: { display: 'inline-block', background: '#0a0a0a', color: '#c0392b', border: '1px solid #c0392b', borderRadius: 10, padding: '10px 14px', fontWeight: 700, fontSize: 13, textDecoration: 'none' },
  itemList: { display: 'flex', flexDirection: 'column', gap: 6 },
  itemRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 10, padding: '10px 12px', gap: 8 },
  itemInfo: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  itemName: { fontSize: 13, fontWeight: 700 },
  itemPrice: { fontSize: 13, color: '#c0392b', fontWeight: 700 },
  itemDesc: { fontSize: 11, color: '#666', lineHeight: 1.5 },
  deleteBtn: { background: 'transparent', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer', padding: 2, flexShrink: 0 },
  error: { marginTop: 8, color: '#c0392b', fontSize: 12, fontWeight: 600 },
  lockBox: { textAlign: 'center', padding: '32px 16px' },
  lockIcon: { fontSize: 40, marginBottom: 12 },
  lockTitle: { fontSize: 18, fontWeight: 800, marginBottom: 8 },
  lockSub: { fontSize: 13, color: '#888', lineHeight: 1.6, maxWidth: 420, margin: '0 auto 20px' },
  upgradeBtn: { display: 'inline-block', background: '#c0392b', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13 },
};
