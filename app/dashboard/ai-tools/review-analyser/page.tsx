'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

type Business = { id: string; name: string; plan: string };
type Review = { id: string; rating: number; comment: string; reviewer_name: string; created_at: string };

export default function ReviewAnalyserPage() {
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
  const [reviews, setReviews] = useState<Review[]>([]);

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
      const { data: revs } = await supabase
        .from('reviews')
        .select('id, rating, comment, reviewer_name, created_at')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false });
      if (!mounted) return;
      setReviews((revs as Review[]) ?? []);
      setLoading(false);
    }
    load().catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [supabase, router]);

  const isPro = business?.plan === 'pro' || business?.plan === 'plus';

  async function analyse() {
    if (!business || reviews.length === 0) return;
    setAiLoading(true);
    setError(null);
    setResult(null);
    const reviewsText = reviews
      .map(r => `"${r.comment}" — ${r.reviewer_name}, ${r.rating} stars`)
      .join('\n');
    try {
      const res = await fetch('/api/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: 'review-analyser',
          business_id: business.id,
          reviews_text: reviewsText,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'AI request failed'); return; }
      setResult(json.result || '');
    } catch {
      setError('Something went wrong');
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return <div style={s.page}><div style={s.container}><div style={s.card}>Loading…</div></div></div>;
  }

  if (!business) {
    return (
      <div style={s.page}><div style={s.container}><div style={s.card}>
        <div style={s.titleRow}>
          <Link href="/dashboard" style={s.back}>←</Link>
          <div><div style={s.title}>💬 Review Analyser</div><div style={s.sub}>No business linked to your account.</div></div>
        </div>
      </div></div></div>
    );
  }

  if (!isPro) {
    return (
      <div style={s.page}><div style={s.container}><div style={s.card}>
        <div style={s.titleRow}>
          <Link href="/dashboard" style={s.back}>←</Link>
          <div><div style={s.title}>💬 Review Analyser</div><div style={s.sub}>Upgrade to Pro to unlock this tool.</div></div>
        </div>
        <div style={s.lockBox}>
          <div style={s.lockIcon}>🔒</div>
          <div style={s.lockTitle}>Pro Feature</div>
          <div style={s.lockSub}>The Review Analyser reads your customer reviews and tells you exactly what to improve to get more 5-star customers.</div>
          <Link href="/dashboard" style={s.upgradeBtn}>Upgrade to Pro →</Link>
        </div>
      </div></div></div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.card}>
          <div style={s.titleRow}>
            <Link href="/dashboard" style={s.back}>←</Link>
            <div>
              <div style={s.title}>💬 Review Analyser</div>
              <div style={s.sub}>AI will analyse your business reviews and tell you what customers love, what to improve, and how to get more 5-star reviews.</div>
            </div>
          </div>

          <div style={s.sectionLabel}>{reviews.length} review{reviews.length !== 1 ? 's' : ''} found</div>

          {reviews.length === 0 ? (
            <div style={s.emptyBox}>No reviews yet for your business on Yana Nagaland.</div>
          ) : (
            <div style={s.reviewList}>
              {reviews.map(r => (
                <div key={r.id} style={s.reviewRow}>
                  <div style={s.reviewMeta}>
                    <span style={s.reviewerName}>{r.reviewer_name}</span>
                    <span style={s.reviewRating}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  <div style={s.reviewComment}>{r.comment}</div>
                </div>
              ))}
            </div>
          )}

          {reviews.length > 0 && (
            <div style={s.actions}>
              <button
                type="button"
                onClick={analyse}
                disabled={aiLoading}
                style={s.primaryBtn}
              >
                {aiLoading ? 'Analysing…' : '🔍 Analyse Reviews'}
              </button>
            </div>
          )}

          {error && <div style={s.error}>{error}</div>}

          {result && (
            <div style={s.resultBox}>
              <pre style={s.resultText}>{result}</pre>
              <button type="button" onClick={() => navigator.clipboard.writeText(result)} style={s.copyBtn}>
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
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: "'Sora', sans-serif", padding: 24 },
  container: { maxWidth: 860, margin: '0 auto' },
  card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 18 },
  titleRow: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  back: { width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#0a0a0a', border: '1px solid #1e1e1e', color: '#c0392b', textDecoration: 'none', fontWeight: 800, flexShrink: 0 },
  title: { fontSize: 18, fontWeight: 800, marginBottom: 2 },
  sub: { fontSize: 13, color: '#888', lineHeight: 1.5 },
  sectionLabel: { marginTop: 14, marginBottom: 8, fontSize: 12, color: '#aaa', fontWeight: 600 },
  emptyBox: { background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 10, padding: 16, fontSize: 13, color: '#666', textAlign: 'center' },
  reviewList: { display: 'flex', flexDirection: 'column', gap: 8 },
  reviewRow: { background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 10, padding: 12 },
  reviewMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewerName: { fontSize: 12, fontWeight: 700, color: '#ccc' },
  reviewRating: { fontSize: 12, color: '#c0392b', letterSpacing: 1 },
  reviewComment: { fontSize: 13, color: '#aaa', lineHeight: 1.5 },
  actions: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 },
  primaryBtn: { background: '#c0392b', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora', sans-serif", fontSize: 13 },
  resultBox: { marginTop: 18, background: '#141414', borderRadius: 10, border: '1px solid #1e1e1e', padding: 14 },
  resultText: { margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, color: '#ddd' },
  copyBtn: { marginTop: 10, padding: '6px 14px', background: '#222', color: '#e5e5e5', borderRadius: 8, border: '1px solid #333', fontSize: 12, cursor: 'pointer', fontFamily: "'Sora', sans-serif" },
  error: { marginTop: 12, color: '#c0392b', fontSize: 13, fontWeight: 600 },
  lockBox: { textAlign: 'center', padding: '32px 16px' },
  lockIcon: { fontSize: 40, marginBottom: 12 },
  lockTitle: { fontSize: 18, fontWeight: 800, marginBottom: 8 },
  lockSub: { fontSize: 13, color: '#888', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 20px' },
  upgradeBtn: { display: 'inline-block', background: '#c0392b', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13 },
};
