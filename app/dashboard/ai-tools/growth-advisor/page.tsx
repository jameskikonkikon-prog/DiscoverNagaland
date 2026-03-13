'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

type Business = {
  id: string;
  name: string;
};

const Q1_OPTIONS = [
  'Students & Young Adults',
  'Families',
  'Working Professionals',
  'Tourists & Visitors',
  'Mixed',
] as const;

const Q2_OPTIONS = [
  'Walk-in',
  'WhatsApp',
  'Instagram',
  'Google Maps',
  'Word of mouth',
  'Other',
] as const;

const Q3_OPTIONS = [
  'Getting new customers',
  'Keeping existing customers coming back',
  'Standing out from competition',
  'Growing my online presence',
  'Managing busy and slow periods',
] as const;

export default function GrowthAdvisorPage() {
  const router = useRouter();
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const [business, setBusiness] = useState<Business | null>(null);
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string[]>([]);
  const [q3, setQ3] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .single();
      if (!mounted) return;
      setBusiness((biz as Business) ?? null);
      setLoading(false);
    }
    load().catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [supabase, router]);

  const canGenerate = useMemo(
    () => !!business && !!q1 && q2.length > 0 && !!q3 && !aiLoading,
    [business, q1, q2, q3, aiLoading]
  );

  function toggleQ2(option: string) {
    setQ2((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  }

  async function generate() {
    if (!business || !canGenerate) return;
    setAiLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: 'growth-advisor',
          business_id: business.id,
          customers: q1,
          discovery: q2.join(', '),
          challenge: q3,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'AI request failed');
        return;
      }
      setResult(json.result || '');
    } catch {
      setError('Something went wrong');
    } finally {
      setAiLoading(false);
    }
  }

  function copyResult() {
    if (result) {
      navigator.clipboard.writeText(result);
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
                <div style={s.title}>📈 Growth Advisor</div>
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
              <div style={s.title}>📈 Growth Advisor</div>
              <div style={s.sub}>
                Answer a few questions about your customers and get 5 focused growth tips for your business.
              </div>
            </div>
          </div>

          <div style={s.sectionLabel}>Who are your main customers?</div>
          <div style={s.optionsRow}>
            {Q1_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setQ1(opt)}
                style={{
                  ...s.optionBtn,
                  ...(q1 === opt ? s.optionSelected : {}),
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          <div style={s.sectionLabel}>How do customers currently find you?</div>
          <div style={s.optionsRow}>
            {Q2_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleQ2(opt)}
                style={{
                  ...s.optionBtn,
                  ...(q2.includes(opt) ? s.optionSelected : {}),
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          <div style={s.sectionLabel}>What's your biggest challenge right now?</div>
          <div style={s.optionsRow}>
            {Q3_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setQ3(opt)}
                style={{
                  ...s.optionBtn,
                  ...(q3 === opt ? s.optionSelected : {}),
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          {canGenerate && (
            <div style={s.actions}>
              <button
                type="button"
                onClick={generate}
                disabled={aiLoading}
                style={s.primaryBtn}
              >
                {aiLoading ? 'Generating…' : '📈 Get My Growth Tips'}
              </button>
            </div>
          )}

          {error && <div style={s.error}>{error}</div>}

          {result && (
            <div style={s.resultBox}>
              <pre style={s.resultText}>{result}</pre>
              <button type="button" onClick={copyResult} style={s.copyBtn}>
                Copy
              </button>
            </div>
          )}
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
  },
  title: { fontSize: 18, fontWeight: 800, marginBottom: 2 },
  sub: { fontSize: 13, color: '#888', lineHeight: 1.5 },
  sectionLabel: { marginTop: 14, marginBottom: 8, fontSize: 12, color: '#aaa', fontWeight: 600 },
  optionsRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  optionBtn: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #1e1e1e',
    background: '#0a0a0a',
    color: '#e5e5e5',
    fontSize: 12,
    fontFamily: "'Sora', sans-serif",
    cursor: 'pointer',
  },
  optionSelected: {
    borderColor: '#c0392b',
    background: 'rgba(192,57,43,0.08)',
  },
  actions: { marginTop: 16, display: 'flex', gap: 10 },
  primaryBtn: {
    background: '#c0392b',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Sora', sans-serif",
    fontSize: 13,
  },
  resultBox: {
    marginTop: 18,
    background: '#141414',
    borderRadius: 10,
    border: '1px solid #1e1e1e',
    padding: 14,
  },
  resultText: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: 13,
    color: '#ddd',
  },
  copyBtn: {
    marginTop: 10,
    padding: '6px 14px',
    background: '#222',
    color: '#e5e5e5',
    borderRadius: 8,
    border: '1px solid #333',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: "'Sora', sans-serif",
  },
  error: { marginTop: 10, color: '#c0392b', fontSize: 13, fontWeight: 600 },
  link: { color: '#c0392b', textDecoration: 'none', fontWeight: 700, display: 'inline-block', marginTop: 10 },
};

