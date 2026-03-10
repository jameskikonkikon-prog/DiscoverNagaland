'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Business = {
  id: string;
  name: string;
  description: string | null;
};

export default function WriteDescriptionPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClientComponentClient());

  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [business, setBusiness] = useState<Business | null>(null);
  const [specialNote, setSpecialNote] = useState('');
  const [description, setDescription] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) {
        router.push('/login');
        setLoading(false);
        return;
      }
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name, description')
        .eq('owner_id', session.user.id)
        .single();
      if (!mounted) return;
      if (!biz) {
        setBusiness(null);
        setLoading(false);
        return;
      }
      setBusiness(biz as Business);
      setDescription((biz as Business).description || '');
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [supabase, router]);

  const canGenerate = useMemo(() => !!business && !aiLoading, [business, aiLoading]);
  const canSave = useMemo(() => !!business && description.trim().length > 0 && !saveLoading, [business, description, saveLoading]);

  async function generate() {
    if (!business) return;
    setAiLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: 'write-description',
          business_id: business.id,
          special_note: specialNote.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'AI request failed');
        return;
      }
      setDescription(json.result || '');
      setHasGenerated(true);
    } catch {
      setError('Something went wrong');
    } finally {
      setAiLoading(false);
    }
  }

  async function save() {
    if (!business) return;
    setSaveLoading(true);
    setError(null);
    setSaved(false);
    try {
      const { error: updErr } = await supabase
        .from('businesses')
        .update({ description })
        .eq('id', business.id);
      if (updErr) {
        setError(updErr.message);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setError('Save failed');
    } finally {
      setSaveLoading(false);
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
              <Link href="/dashboard/ai-tools" style={s.back}>←</Link>
              <div>
                <div style={s.title}>✍️ Write Description</div>
                <div style={s.sub}>No business linked to your account.</div>
              </div>
            </div>
            <Link href="/dashboard/my-listing" style={s.link}>Go to My Listing →</Link>
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
            <Link href="/dashboard/ai-tools" style={s.back}>←</Link>
            <div>
              <div style={s.title}>✍️ Write Description</div>
              <div style={s.sub}>Let AI write your business description. Edit it, then save directly to your listing.</div>
            </div>
          </div>

          <label style={s.label}>Current description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={7}
            style={s.textarea}
            placeholder="Your description will appear here…"
          />

          <label style={s.label}>What makes your business special? (optional)</label>
          <input
            value={specialNote}
            onChange={(e) => setSpecialNote(e.target.value)}
            style={s.input}
            placeholder="e.g. only shop in Kohima with imported boots..."
          />

          <div style={s.actions}>
            <button type="button" onClick={generate} disabled={!canGenerate} style={s.primaryBtn}>
              {aiLoading ? 'Generating…' : hasGenerated ? '↺ Regenerate' : '✨ Generate with AI'}
            </button>
            <button type="button" onClick={save} disabled={!canSave} style={s.secondaryBtn}>
              {saveLoading ? 'Saving…' : '💾 Save to Listing'}
            </button>
            {saved && <span style={s.saved}>✓ Saved!</span>}
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
    padding: 18,
  },
  titleRow: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
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
  },
  title: { fontSize: 18, fontWeight: 800, marginBottom: 2 },
  sub: { fontSize: 13, color: '#888', lineHeight: 1.5 },
  label: { display: 'block', marginTop: 14, marginBottom: 8, fontSize: 12, color: '#aaa', fontWeight: 600 },
  textarea: {
    width: '100%',
    background: '#0a0a0a',
    border: '1px solid #1e1e1e',
    borderRadius: 10,
    padding: 12,
    color: '#e5e5e5',
    fontFamily: 'inherit',
    fontSize: 13,
    resize: 'vertical',
  },
  input: {
    width: '100%',
    background: '#0a0a0a',
    border: '1px solid #1e1e1e',
    borderRadius: 10,
    padding: 12,
    color: '#e5e5e5',
    fontFamily: 'inherit',
    fontSize: 13,
  },
  actions: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 },
  primaryBtn: {
    background: '#c0392b',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
  },
  secondaryBtn: {
    background: 'transparent',
    color: '#e5e5e5',
    border: '1px solid #1e1e1e',
    borderRadius: 10,
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
  },
  saved: { color: '#25D366', fontWeight: 800, fontSize: 12 },
  error: { marginTop: 12, color: '#c0392b', fontSize: 13, fontWeight: 600 },
  link: { color: '#c0392b', textDecoration: 'none', fontWeight: 700, display: 'inline-block', marginTop: 10 },
};

