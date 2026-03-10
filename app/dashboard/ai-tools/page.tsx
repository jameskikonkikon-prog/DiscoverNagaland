'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const TOOLS = [
  { href: '/dashboard/ai-tools/write-description', icon: '✍️', name: 'Write Description', desc: 'Generate a compelling description and save it to your listing' },
  { href: '/dashboard/ai-tools', icon: '📈', name: 'Growth Advisor', desc: 'Coming next' },
  { href: '/dashboard/ai-tools', icon: '📷', name: 'Menu Reader', desc: 'Coming next' },
  { href: '/dashboard/ai-tools', icon: '⚔️', name: 'Competitor Intel', desc: 'Coming next' },
] as const;

export default function AiToolsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClientComponentClient());
  const [business, setBusiness] = useState<{ id: string; description: string | null } | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        router.push('/login');
        setPageLoading(false);
        return;
      }

      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (!mounted) return;
      setBusiness(biz ?? null);
      setPageLoading(false);
    })();
    return () => { mounted = false; };
  }, [supabase, router]);

  if (pageLoading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.loading}>Loading…</div>
      </div>
    );
  }

  if (!business) {
    return (
      <div style={styles.wrapper}>
        <p style={styles.error}>No business linked to your account.</p>
        <Link href="/dashboard/my-listing" style={styles.link}>Go to My Listing →</Link>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <Link href="/dashboard" style={styles.link}>← Back to Dashboard</Link>
        <h1 style={styles.title}>AI Tools</h1>
        <p style={styles.sub}>Pick a tool below.</p>
      </div>

      <div style={styles.grid}>
        {TOOLS.map((tool) => (
          <a key={tool.name} href={tool.href} style={{ ...styles.card, textDecoration: 'none' as const }}>
            <span style={styles.cardIcon}>{tool.icon}</span>
            <div style={styles.cardText}>
              <div style={styles.cardName}>{tool.name}</div>
              <div style={styles.cardDesc}>{tool.desc}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#e5e5e5',
    fontFamily: "'Sora', sans-serif",
    padding: 24,
  },
  loading: {
    textAlign: 'center',
    padding: 48,
    color: '#888',
  },
  error: {
    color: '#c0392b',
    marginBottom: 12,
  },
  link: {
    color: '#c0392b',
    textDecoration: 'none',
    fontSize: 14,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 4,
  },
  sub: {
    fontSize: 14,
    color: '#888',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    background: '#141414',
    border: '1px solid #222',
    borderRadius: 12,
    cursor: 'pointer',
    textAlign: 'left',
    color: 'inherit',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, background 0.2s',
  },
  cardIcon: {
    fontSize: 28,
  },
  cardText: { flex: 1, minWidth: 0 },
  cardName: { fontWeight: 600, fontSize: 15, marginBottom: 2 },
  cardDesc: { fontSize: 12, color: '#888' },
};
