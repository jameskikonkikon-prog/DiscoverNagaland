import { createClient } from '@supabase/supabase-js';

type MenuItem = { id: string; name: string; price: string; description: string };
type Business = { id: string; name: string; category: string; city: string };

export default async function PublicMenuPage({ params }: { params: { businessId: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data: business }, { data: items }] = await Promise.all([
    supabase.from('businesses').select('id, name, category, city').eq('id', params.businessId).single(),
    supabase.from('menu_items').select('id, name, price, description').eq('business_id', params.businessId).order('created_at', { ascending: true }),
  ]);

  if (!business) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.notFound}>Business not found.</div>
        </div>
      </div>
    );
  }

  const menuItems = (items as MenuItem[]) ?? [];

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.bizName}>{(business as Business).name}</div>
          {(business as Business).category && <div style={s.bizMeta}>{(business as Business).category}{(business as Business).city ? ` · ${(business as Business).city}` : ''}</div>}
          <div style={s.menuLabel}>Menu & Catalogue</div>
        </div>

        {menuItems.length === 0 ? (
          <div style={s.empty}>No items listed yet.</div>
        ) : (
          <div style={s.grid}>
            {menuItems.map(item => (
              <div key={item.id} style={s.card}>
                <div style={s.itemTop}>
                  <div style={s.itemName}>{item.name}</div>
                  {item.price && <div style={s.itemPrice}>{item.price}</div>}
                </div>
                {item.description && <div style={s.itemDesc}>{item.description}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={s.footer}>
          Powered by <span style={s.footerAccent}>Yana Nagaland</span>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: "'Sora', sans-serif", padding: '24px 16px' },
  container: { maxWidth: 680, margin: '0 auto' },
  header: { textAlign: 'center', paddingBottom: 28, borderBottom: '1px solid #1e1e1e', marginBottom: 24 },
  bizName: { fontSize: 26, fontWeight: 800, marginBottom: 4 },
  bizMeta: { fontSize: 13, color: '#888', marginBottom: 10 },
  menuLabel: { display: 'inline-block', background: 'rgba(192,57,43,0.12)', color: '#c0392b', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' },
  grid: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '14px 16px' },
  itemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  itemName: { fontSize: 15, fontWeight: 700, flex: 1 },
  itemPrice: { fontSize: 15, fontWeight: 800, color: '#c0392b', flexShrink: 0 },
  itemDesc: { fontSize: 12, color: '#888', marginTop: 4, lineHeight: 1.5 },
  empty: { textAlign: 'center', color: '#555', fontSize: 14, padding: '40px 0' },
  notFound: { textAlign: 'center', color: '#555', fontSize: 14, padding: '60px 0' },
  footer: { textAlign: 'center', marginTop: 36, fontSize: 11, color: '#444' },
  footerAccent: { color: '#c0392b', fontWeight: 700 },
};
