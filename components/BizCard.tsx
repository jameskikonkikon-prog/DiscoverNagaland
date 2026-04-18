'use client';

export type BizCardBiz = {
  id: string;
  name: string;
  category: string;
  city: string;
  area?: string | null;
  photos?: string[] | null;
  phone?: string | null;
  whatsapp?: string | null;
  is_verified?: boolean;
  verified?: boolean;
  plan?: string | null;
  opening_hours?: string | null;
};

type Props = {
  biz: BizCardBiz;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
};

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: '🍽️', cafe: '☕', hotel: '🏨', pg: '🏠', hostel: '🏠',
  rental: '🏡', rental_house: '🏡', gym: '💪', turf: '⚽', shop: '🛍️',
  salon: '💇', coaching: '📚', school: '🎓', pharmacy: '💊',
  hospital: '🏥', clinic: '🏥', service: '🔧',
};

function getCatEmoji(cat: string) {
  const lower = (cat || '').toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_EMOJI)) {
    if (lower.includes(k)) return v;
  }
  return '🏪';
}

function isOpenNow(hours: string | null): boolean | null {
  if (!hours || !hours.trim()) return null;
  const h = hours.toLowerCase().trim();
  if (h.includes('24') || h === 'always open') return true;

  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utcMs + 5.5 * 3600000);
  const cur = ist.getHours() * 60 + ist.getMinutes();

  function parseTime(t: string): number | null {
    const m = t.trim().toLowerCase().replace(/\s/g, '').match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
    if (!m) return null;
    let hr = parseInt(m[1]);
    const min = parseInt(m[2] || '0');
    if (m[3] === 'pm' && hr !== 12) hr += 12;
    if (m[3] === 'am' && hr === 12) hr = 0;
    return hr * 60 + min;
  }

  const range = h.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[–\-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/);
  if (range) {
    const open = parseTime(range[1]);
    const close = parseTime(range[2]);
    if (open !== null && close !== null) {
      if (close < open) return cur >= open || cur < close;
      return cur >= open && cur < close;
    }
  }
  return null;
}

function getWaUrl(biz: BizCardBiz) {
  const num = biz.whatsapp || biz.phone;
  if (!num) return null;
  const clean = num.replace(/\D/g, '');
  const formatted = clean.startsWith('91') ? clean : `91${clean}`;
  return `https://wa.me/${formatted}?text=${encodeURIComponent(`Hi, I found ${biz.name} on Yana Nagaland and would like to know more.`)}`;
}

export function BizCard({ biz, isSaved = false, onToggleSave }: Props) {
  const photo = biz.photos?.[0] ?? null;
  const isVerified = !!(biz.is_verified || biz.verified);
  const openStatus = isOpenNow(biz.opening_hours ?? null);
  const location = [biz.area, biz.city].filter(Boolean).join(' · ') || biz.city;
  const waUrl = getWaUrl(biz);
  const callUrl = biz.phone ? `tel:${biz.phone}` : null;

  return (
    <div
      className="bc"
      onClick={() => { window.location.href = `/business/${biz.id}`; }}
    >
      {/* Image */}
      {photo ? (
        <img src={photo} alt={biz.name} className="bc-img" />
      ) : (
        <div className="bc-no-photo">
          <span className="bc-emoji">{getCatEmoji(biz.category)}</span>
        </div>
      )}

      {/* Dark gradient */}
      <div className="bc-grad" />

      {/* Top-left badges */}
      {(isVerified || openStatus !== null) && (
        <div className="bc-badges">
          {isVerified && <span className="bc-badge bc-badge-v">✓ Verified</span>}
          {openStatus === true && <span className="bc-badge bc-badge-open">Open</span>}
          {openStatus === false && <span className="bc-badge bc-badge-closed">Closed</span>}
        </div>
      )}

      {/* Top-right heart */}
      {onToggleSave && (
        <button
          className={`bc-heart${isSaved ? ' bc-heart-on' : ''}`}
          onClick={e => { e.stopPropagation(); onToggleSave(biz.id); }}
          aria-label={isSaved ? 'Remove from saved' : 'Save'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            fill={isSaved ? '#e5383b' : 'none'}
            stroke={isSaved ? '#e5383b' : 'rgba(255,255,255,0.9)'}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      )}

      {/* Bottom overlay content */}
      <div className="bc-overlay">
        <div className="bc-name">{biz.name}</div>
        <div className="bc-meta">
          <span className="bc-cat">{biz.category}</span>
          <span className="bc-dot">·</span>
          📍 {location}
        </div>
        {(waUrl || callUrl) && (
          <div className="bc-actions">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bc-btn bc-wa"
                onClick={e => e.stopPropagation()}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
            )}
            {callUrl && (
              <a
                href={callUrl}
                className="bc-btn bc-call"
                onClick={e => e.stopPropagation()}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                Call
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const BIZ_CARD_CSS = `
  .bc {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    background: #111;
    border: 1px solid #1e1e1e;
    height: 200px;
    transition: transform 0.18s, box-shadow 0.18s;
    flex-shrink: 0;
  }
  .bc:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,0.4); }
  .bc-img {
    position: absolute; inset: 0;
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .bc-no-photo {
    position: absolute; inset: 0;
    background: linear-gradient(160deg, #161616 0%, #0e0e0e 100%);
    display: flex; align-items: center; justify-content: center;
  }
  .bc-emoji { font-size: 2.8rem; opacity: 0.3; }
  .bc-grad {
    position: absolute; inset: 0; z-index: 1;
    background: linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 35%, rgba(0,0,0,0.88) 80%, rgba(0,0,0,0.96) 100%);
    pointer-events: none;
  }
  .bc-badges {
    position: absolute; top: 10px; left: 10px; z-index: 3;
    display: flex; gap: 5px;
  }
  .bc-badge {
    font-family: 'Sora', sans-serif;
    font-size: 10px; font-weight: 700;
    padding: 3px 8px; border-radius: 999px;
    white-space: nowrap; letter-spacing: 0.03em;
  }
  .bc-badge-v {
    background: rgba(255,255,255,0.92); color: #b8860b;
    border: 1.5px solid #d4af37;
  }
  .bc-badge-open {
    background: rgba(34,197,94,0.18); color: #22c55e;
    border: 1.5px solid rgba(34,197,94,0.38);
  }
  .bc-badge-closed {
    background: rgba(239,68,68,0.18); color: #ef4444;
    border: 1.5px solid rgba(239,68,68,0.38);
  }
  .bc-heart {
    position: absolute; top: 10px; right: 10px; z-index: 3;
    width: 32px; height: 32px; border-radius: 999px;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.12);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background 0.15s, transform 0.12s;
  }
  .bc-heart:hover { background: rgba(229,56,59,0.25); transform: scale(1.08); }
  .bc-heart-on { background: rgba(229,56,59,0.2); border-color: rgba(229,56,59,0.4); }
  .bc-overlay {
    position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
    padding: 11px 13px 12px;
  }
  .bc-name {
    font-family: 'Playfair Display', serif;
    font-size: 15px; font-weight: 700; color: #fff;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-bottom: 3px; line-height: 1.25;
  }
  .bc-meta {
    font-family: 'Sora', sans-serif;
    font-size: 11px; color: rgba(255,255,255,0.55);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-bottom: 8px; display: flex; align-items: center; gap: 4px;
  }
  .bc-cat { color: rgba(255,255,255,0.7); font-weight: 500; }
  .bc-dot { color: rgba(255,255,255,0.3); }
  .bc-actions { display: flex; gap: 6px; }
  .bc-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 5px 10px; border-radius: 6px;
    font-family: 'Sora', sans-serif; font-size: 11px; font-weight: 600;
    text-decoration: none; cursor: pointer;
    transition: opacity 0.15s, background 0.15s;
    border: none;
  }
  .bc-btn:hover { opacity: 0.85; }
  .bc-wa {
    background: rgba(37,211,102,0.18);
    color: #25d366;
    border: 1px solid rgba(37,211,102,0.28) !important;
  }
  .bc-call {
    background: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.8);
    border: 1px solid rgba(255,255,255,0.14) !important;
  }
`;
