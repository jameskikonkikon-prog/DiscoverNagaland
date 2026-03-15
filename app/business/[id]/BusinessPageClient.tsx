'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Business = {
  id: string;
  name: string;
  category: string;
  city: string;
  area?: string | null;
  address: string;
  landmark?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  description?: string;
  opening_hours?: string;
  photos?: string[];
  price_range?: string;
  price_min?: number;
  price_max?: number;
  price_unit?: string;
  menu_url?: string;
  website?: string;
  tags?: string;
  amenities?: string;
  is_verified?: boolean;
  plan?: string;
  owner_id?: string | null;
  claimed?: boolean | null;
  created_at?: string;
};

type Review = {
  id: string;
  rating: number;
  comment: string;
  reviewer_name: string;
  created_at: string;
};

function getPriceLabel(biz: Business): string | null {
  const cat = biz.category?.toLowerCase();
  if (biz.price_min && biz.price_max) {
    if (cat === 'pg') return `₹${biz.price_min.toLocaleString()} – ₹${biz.price_max.toLocaleString()} / month`;
    if (cat === 'hotel') return `₹${biz.price_min.toLocaleString()} – ₹${biz.price_max.toLocaleString()} / night`;
    if (cat === 'turf') return `₹${biz.price_min.toLocaleString()} / hr (weekday) · ₹${biz.price_max.toLocaleString()} / hr (weekend)`;
  }
  if (biz.price_min) {
    if (cat === 'restaurant' || cat === 'cafe') return `~₹${biz.price_min.toLocaleString()} per person`;
    if (cat === 'rental') return `₹${biz.price_min.toLocaleString()} ${biz.price_unit || 'per day'}`;
    if (cat === 'salon') return `Starting ₹${biz.price_min.toLocaleString()}`;
    if (cat === 'hospital' || cat === 'clinic') return `₹${biz.price_min.toLocaleString()} consultation`;
    if (cat === 'coaching' || cat === 'school') return `₹${biz.price_min.toLocaleString()} ${biz.price_unit || 'per month'}`;
    return `From ₹${biz.price_min.toLocaleString()}`;
  }
  if (biz.price_range) {
    const map: Record<string, string> = { budget: '💰 Budget-friendly', mid: '💰💰 Mid-range', premium: '💰💰💰 Premium' };
    return map[biz.price_range] || null;
  }
  return null;
}

function isOpenNow(openingHours: string): boolean | null {
  if (!openingHours) return null;
  try {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const lower = openingHours.toLowerCase();
    if (lower.includes('24') || lower.includes('always')) return true;
    const sunClosed = (lower.includes('sun') && lower.includes('closed')) && day === 0;
    if (sunClosed) return false;
    const match = lower.match(/(\d{1,2})(?:am|:00)?\s*[-–]\s*(\d{1,2})(?:pm|:00)?/);
    if (match) {
      let open = parseInt(match[1]);
      let close = parseInt(match[2]);
      if (close < 12) close += 12;
      if (open < 8) open += 12;
      return hour >= open && hour < close;
    }
  } catch {}
  return null;
}

type Props = {
  biz: Business;
  initialReviews: Review[];
  isOwner: boolean;
  isLoggedIn: boolean;
};

export default function BusinessPageClient({ biz, initialReviews, isOwner, isLoggedIn }: Props) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: '', rating: 5, comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);

  // Claim modal state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState({ name: '', phone: '', email: '', designation: '', password: '', confirmPassword: '' });
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState('');

  useEffect(() => {
    const onScroll = () => setNavScrolled(typeof window !== 'undefined' && window.scrollY > 100);
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', onScroll);
      return () => window.removeEventListener('scroll', onScroll);
    }
  }, []);

  const submitReview = async () => {
    if (!reviewForm.name || !reviewForm.comment) return;
    setSubmittingReview(true);
    await supabase.from('reviews').insert({
      business_id: biz.id,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
      reviewer_name: reviewForm.name,
    });
    const { data } = await supabase.from('reviews').select('*').eq('business_id', biz.id).order('created_at', { ascending: false });
    setReviews(data || []);
    setReviewSuccess(true);
    setReviewForm({ name: '', rating: 5, comment: '' });
    setSubmittingReview(false);
  };

  const submitClaim = async () => {
    if (!claimForm.name || !claimForm.phone || !claimForm.email || !claimForm.password) return;
    if (claimForm.password.length < 8) { setClaimError('Password must be at least 8 characters.'); return; }
    if (claimForm.password !== claimForm.confirmPassword) { setClaimError('Passwords do not match.'); return; }
    setClaimLoading(true);
    setClaimError('');
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: biz.id,
          name: claimForm.name,
          phone: claimForm.phone,
          email: claimForm.email,
          designation: claimForm.designation,
          password: claimForm.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setClaimError(data.error || 'Something went wrong. Try again.'); return; }
      setClaimSuccess(true);
      setShowClaimModal(false);
    } catch {
      setClaimError('Something went wrong. Try again.');
    } finally {
      setClaimLoading(false);
    }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const openStatus = isOpenNow(biz.opening_hours || '');
  const amenitiesList = biz.amenities?.split(',').map(a => a.trim()).filter(Boolean) || [];
  const tagsList = biz.tags?.split(',').map(t => t.trim()).filter(Boolean) || [];
  const vibeTags = tagsList.length > 0 ? tagsList : (biz.tags ? [biz.tags] : []);
  const photos = biz.photos?.length ? biz.photos : [];
  const locationLine = [biz.area, biz.landmark, biz.city].filter(Boolean).join(' · ') || `${biz.address ? biz.address + ' · ' : ''}${biz.city}, Nagaland`;
  const FEATURE_KEYS = [
    { key: 'parking', label: '🅿️ Parking' },
    { key: 'card|payment|card payment', label: '💳 Card Payment' },
    { key: 'delivery', label: '🚚 Delivery' },
    { key: 'wifi|wi-fi|wifi', label: '📶 WiFi' },
    { key: 'ac|air cond|air conditioning', label: '❄️ AC' },
  ];
  const amenitiesLower = (biz.amenities || '').toLowerCase();
  const featuresList = FEATURE_KEYS.map(({ key, label }) => {
    const yes = key.split('|').some(k => amenitiesLower.includes(k.trim().toLowerCase()));
    return { label, yes };
  });

  function formatReviewDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week(s) ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent([biz.name, biz.address, biz.city, 'Nagaland'].filter(Boolean).join(' '))}`;
  const waUrl = biz.whatsapp ? `https://wa.me/${biz.whatsapp.replace(/\D/g, '')}?text=Hi!%20I%20found%20you%20on%20Yana%20Nagaland` : '';
  const shareWaUrl = typeof window !== 'undefined' ? `https://wa.me/?text=Check out ${biz.name} on Yana Nagaland: ${window.location.href}` : '';

  return (
    <>
      <style>{styles}</style>
      <main className="biz-page">
        <nav className={`nav ${navScrolled ? 'scrolled' : ''}`}>
          <Link href="/" className="nav-logo">Yana<span>Nagaland</span></Link>
          <div className="nav-center">{biz.name} · {biz.city}</div>
          <div className="nav-right">
            <Link href={`/search?q=${biz.city}`} className="nav-link">← {biz.city}</Link>
            {isLoggedIn ? (
              <Link href="/dashboard" className="nav-cta">Dashboard</Link>
            ) : (
              <Link href="/register" className="nav-cta">List Business</Link>
            )}
            {isLoggedIn && (
              <a href="/dashboard" className="nav-avatar" aria-label="Dashboard">
                <span className="nav-avatar-icon">👤</span>
              </a>
            )}
          </div>
        </nav>

        <div className="gallery" id="gallery">
          {photos.length > 0 ? (
            <>
              <img src={photos[activePhoto]} alt={biz.name} className="gallery-img" />
              <div className="gallery-grad" />
              {photos.length > 1 && (
                <div className="thumb-strip">
                  {photos.map((p, i) => (
                    <img
                      key={i}
                      src={p}
                      alt=""
                      className={`thumb ${i === activePhoto ? 'active' : ''}`}
                      onClick={() => setActivePhoto(i)}
                    />
                  ))}
                </div>
              )}
              <div className="photo-count">📷 {photos.length} photo{photos.length !== 1 ? 's' : ''}</div>
            </>
          ) : (
            <div className="gallery-placeholder">
              <span>🏔️</span>
              <p>No photos yet</p>
            </div>
          )}
        </div>

        <div className="content">
          <div className="left">
            <div className="hero-text fade-up">
              <div className="category-tag">{biz.plan === 'plus' ? '⭐ ' : ''}{biz.category}</div>
              <div className="biz-name">{biz.name}</div>
              <div className="meta-row">
                {openStatus !== null && (
                  <span className={`meta-chip ${openStatus ? 'open' : ''}`}>
                    <span className="dot" /> {openStatus ? 'Open now' : 'Closed'}
                  </span>
                )}
                {biz.plan === 'plus' && (
                  <span className="meta-chip verified">✓ Verified</span>
                )}
                {biz.plan === 'pro' && (
                  <span className="meta-chip pro">⚡ Pro</span>
                )}
                {biz.is_verified && biz.plan !== 'plus' && (
                  <span className="meta-chip">✓ Verified</span>
                )}
              </div>
              <div className="location-line">
                <span>📍</span>
                <span>{locationLine}</span>
              </div>
            </div>

            <div className="mobile-cta fade-up-2">
              <a href={`tel:${biz.phone}`} className="m-call">📞 Call Now</a>
              {biz.whatsapp && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="m-wa">💬 WhatsApp</a>
              )}
            </div>

            {vibeTags.length > 0 && (
              <div className="vibe-row fade-up-2">
                {vibeTags.map((t) => (
                  <span key={t} className="vibe">{t}</span>
                ))}
              </div>
            )}

            <div className="info-blocks fade-up-3">
              {biz.opening_hours && (
                <div className="info-block">
                  <div className="ib-label">Hours</div>
                  <div className="ib-value">{biz.opening_hours}</div>
                  {openStatus !== null && (
                    <div className={`open-tag ${openStatus ? '' : 'closed'}`}>
                      <span className="dot" style={{ background: openStatus ? '#27ae60' : '#999', width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
                      {openStatus ? ' Open right now' : ' Currently closed'}
                    </div>
                  )}
                </div>
              )}
              {biz.phone && (
                <div className="info-block">
                  <div className="ib-label">Phone</div>
                  <div className="ib-value">{biz.phone}</div>
                  <div className="ib-sub">Tap to call</div>
                </div>
              )}
              <div className="info-block full">
                <div className="ib-label">Address</div>
                <div className="ib-value">{biz.address}{biz.landmark ? `, near ${biz.landmark}` : ''}</div>
                <div className="ib-sub">{biz.city}, Nagaland</div>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="ib-link">Open in Google Maps →</a>
              </div>
            </div>

            {biz.description && (
              <div className="section fade-up-4">
                <div className="section-head">About</div>
                <p className="about-text">{biz.description}</p>
              </div>
            )}

            <div className="section fade-up-4">
              <div className="section-head">Features</div>
              <div className="features">
                {featuresList.map((f) => (
                  <span key={f.label} className={`feature ${f.yes ? 'yes' : 'no'}`}>{f.label}</span>
                ))}
              </div>
            </div>

            <div className="section fade-up-4">
              <div className="section-head">Reviews</div>
              <div className="reviews-top">
                <div className="rating-display">
                  <div className="rating-num">{avgRating ?? '—'}</div>
                  <div className="rating-info">
                    <div className="rating-stars">{'⭐'.repeat(avgRating ? Math.round(parseFloat(avgRating)) : 0)}{'☆'.repeat(5 - (avgRating ? Math.round(parseFloat(avgRating)) : 0))}</div>
                    <div className="rating-count">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                {!reviewSuccess && (
                  <button type="button" className="write-review-btn" onClick={() => { setShowReviewForm(!showReviewForm); if (!showReviewForm) setTimeout(() => document.getElementById('reviewForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                    + Write a review
                  </button>
                )}
              </div>

              <div id="reviewForm" className={`review-form ${showReviewForm ? 'show' : ''}`}>
                <div className="rf-label">Your Rating</div>
                <div className="star-row">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" className="star-pick" onClick={() => setReviewForm({ ...reviewForm, rating: s })}>
                      {s <= (hoverRating || reviewForm.rating) ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
                <div className="rf-grid">
                  <input type="text" className="rf-input" placeholder="Your name" value={reviewForm.name} onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })} />
                  <input type="email" className="rf-input" placeholder="Email (optional)" />
                </div>
                <textarea className="rf-input rf-textarea" placeholder="Share your experience..." value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} />
                <button type="button" className="rf-submit" onClick={submitReview} disabled={submittingReview || !reviewForm.name || !reviewForm.comment}>
                  {submittingReview ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>

              {reviewSuccess && <div className="review-success">🎉 Thanks for your review!</div>}

              {reviews.length > 0 ? (
                reviews.map((r) => (
                  <div key={r.id} className="review-card">
                    <div className="rc-top">
                      <div className="rc-name">{r.reviewer_name}</div>
                      <div className="rc-date">{formatReviewDate(r.created_at)}</div>
                    </div>
                    <div className="rc-stars">{'⭐'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                    <div className="rc-text">{r.comment}</div>
                  </div>
                ))
              ) : (
                <div className="no-reviews">No reviews yet — be the first!</div>
              )}
            </div>

            {biz.menu_url && (
              <div className="section fade-up-4">
                <div className="section-head">{biz.category?.toLowerCase() === 'restaurant' || biz.category?.toLowerCase() === 'cafe' ? 'Menu' : 'Price List'}</div>
                {biz.menu_url.endsWith('.pdf') ? (
                  <a href={biz.menu_url} target="_blank" rel="noopener noreferrer" className="ib-link">📄 View PDF</a>
                ) : (
                  <div className="menu-img-wrap">
                    <img src={biz.menu_url} alt="Menu" className={`menu-img ${showMenu ? 'expanded' : ''}`} onClick={() => setShowMenu(!showMenu)} />
                    <button type="button" className="menu-expand-btn" onClick={() => setShowMenu(!showMenu)}>{showMenu ? '↑ Collapse' : '↓ View Full'}</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="sidebar">
            <div className="sidebar-card">
              <div className="sc-label">Contact</div>
              <a href={`tel:${biz.phone}`} className="btn-primary">📞 Call {biz.phone}</a>
              {biz.whatsapp && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-wa">💬 Chat on WhatsApp</a>
              )}
              {biz.email && (
                <a href={`mailto:${biz.email}`} className="btn-ghost">✉️ Send Email</a>
              )}
              <div className="sc-divider" />
              <div className="sc-row">
                <div className="sc-icon">📞</div>
                <div className="sc-val"><a href={`tel:${biz.phone}`}>{biz.phone}</a></div>
              </div>
              {biz.email && (
                <div className="sc-row">
                  <div className="sc-icon">✉️</div>
                  <div className="sc-val" style={{ fontSize: '11px' }}><a href={`mailto:${biz.email}`}>{biz.email}</a></div>
                </div>
              )}
            </div>

            <div className="sidebar-card">
              <div className="sc-label">Location</div>
              <div className="map-box" onClick={() => window.open(mapsUrl, '_blank')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && window.open(mapsUrl, '_blank')}>
                <div className="map-grid" />
                <span className="map-pin">📍</span>
              </div>
              <div className="loc-name">{biz.area || biz.landmark || biz.address}</div>
              <div className="loc-sub">{[biz.landmark, biz.address].filter(Boolean).join(' · ')} {biz.city}</div>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">🗺️ Open in Google Maps</a>
            </div>

            <div className="sidebar-card">
              <div className="sc-label">Share</div>
              <div className="share-row">
                <a href={shareWaUrl} target="_blank" rel="noopener noreferrer" className="share-btn">💬 WhatsApp</a>
                <button type="button" className="share-btn" onClick={() => { navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : ''); }}>🔗 Copy Link</button>
              </div>
            </div>

            {/* Claim card:
                - isOwner            → hidden entirely
                - !isOwner + claimed → "already claimed" notice
                - !isOwner + !claimed → full claim button/modal
            */}
            {!isOwner && (
              biz.claimed ? (
                <div className="claim-card">
                  <div className="claim-title">Listing claimed</div>
                  <div className="claim-already">✅ This listing has already been claimed.</div>
                </div>
              ) : (
                <div className="claim-card">
                  <div className="claim-title">Own this business?</div>
                  <div className="claim-sub">Claim your listing to manage your profile, reply to reviews, and see who&apos;s finding you.</div>
                  {claimSuccess ? (
                    <div className="claim-success-msg">✅ Claim request submitted. We&apos;ll review it soon.</div>
                  ) : (
                    <button type="button" className="claim-btn" onClick={() => setShowClaimModal(true)}>🏷️ Claim This Listing</button>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </main>

      {showClaimModal && (
        <div className="claim-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowClaimModal(false); }}>
          <div className="claim-modal">
            <div className="cm-header">
              <div className="cm-title">🏷️ Claim This Listing</div>
              <button className="cm-close" onClick={() => setShowClaimModal(false)} aria-label="Close">✕</button>
            </div>
            <div className="cm-sub">Fill in your details and create a login. We&apos;ll verify your claim and transfer the listing to your account.</div>

            <div className="cm-field">
              <label className="cm-label">Your Name *</label>
              <input className="cm-input" type="text" placeholder="Full name" value={claimForm.name} onChange={e => setClaimForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="cm-field">
              <label className="cm-label">Phone *</label>
              <input className="cm-input" type="tel" placeholder="e.g. 9876543210" value={claimForm.phone} onChange={e => setClaimForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="cm-field">
              <label className="cm-label">Email *</label>
              <input className="cm-input" type="email" placeholder="you@example.com" value={claimForm.email} onChange={e => setClaimForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="cm-field">
              <label className="cm-label">Designation</label>
              <input className="cm-input" type="text" placeholder="e.g. Owner, Manager" value={claimForm.designation} onChange={e => setClaimForm(f => ({ ...f, designation: e.target.value }))} />
            </div>
            <div className="cm-divider" />
            <div className="cm-section-label">Create your login</div>
            <div className="cm-field">
              <label className="cm-label">Password *</label>
              <input className="cm-input" type="password" placeholder="Min. 8 characters" value={claimForm.password} onChange={e => setClaimForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="cm-field">
              <label className="cm-label">Confirm Password *</label>
              <input className="cm-input" type="password" placeholder="Repeat password" value={claimForm.confirmPassword} onChange={e => setClaimForm(f => ({ ...f, confirmPassword: e.target.value }))} />
            </div>

            {claimError && <div className="cm-error">{claimError}</div>}

            <button
              className="cm-submit"
              onClick={submitClaim}
              disabled={claimLoading || !claimForm.name || !claimForm.phone || !claimForm.email || !claimForm.password || !claimForm.confirmPassword}
            >
              {claimLoading ? 'Submitting…' : 'Submit Claim Request'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:#0a0a0a;
    --surface:#0f0f0f;
    --surface2:#141414;
    --surface3:#1a1a1a;
    --border:rgba(255,255,255,0.06);
    --border2:rgba(255,255,255,0.1);
    --red:#c0392b;
    --red-soft:rgba(192,57,43,0.1);
    --red-border:rgba(192,57,43,0.25);
    --green:#25D366;
    --text:#f5f5f5;
    --text2:#999;
    --text3:#555;
  }
  html { scroll-behavior: smooth; }
  body { font-family: 'Sora', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; -webkit-font-smoothing: antialiased; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .fade-up { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both; }
  .fade-up-2 { animation: fadeUp 0.6s 0.1s cubic-bezier(0.22,1,0.36,1) both; }
  .fade-up-3 { animation: fadeUp 0.6s 0.2s cubic-bezier(0.22,1,0.36,1) both; }
  .fade-up-4 { animation: fadeUp 0.6s 0.3s cubic-bezier(0.22,1,0.36,1) both; }
  .fade-in { animation: fadeIn 0.8s ease both; }

  .biz-page { min-height: 100vh; }

  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 200;
    height: 56px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 40px;
    background: rgba(10,10,10,0.8);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
    transition: background 0.3s;
  }
  .nav.scrolled { background: rgba(10,10,10,0.95); }
  .nav-logo { font-size: 17px; font-weight: 800; letter-spacing: -0.5px; text-decoration: none; color: var(--text); }
  .nav-logo span { color: var(--red); }
  .nav-center {
    position: absolute; left: 50%; transform: translateX(-50%);
    font-size: 13px; font-weight: 500; color: var(--text2);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;
  }
  .nav-right { display: flex; align-items: center; gap: 8px; }
  .nav-link { font-size: 12px; font-weight: 600; color: var(--text2); text-decoration: none; padding: 6px 14px; border-radius: 8px; transition: color 0.2s; }
  .nav-link:hover { color: var(--text); }
  .nav-cta { font-size: 12px; font-weight: 700; color: #fff; text-decoration: none; padding: 7px 16px; border-radius: 8px; background: var(--red); transition: opacity 0.2s; }
  .nav-cta:hover { opacity: 0.85; }
  .nav-avatar { width: 32px; height: 32px; border-radius: 999px; background: var(--surface2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; text-decoration: none; color: var(--text2); font-size: 14px; }
  .nav-avatar:hover { color: var(--red); }

  .gallery {
    margin-top: 56px; position: relative;
    height: 70vh; max-height: 560px; min-height: 340px;
    background: var(--surface2); overflow: hidden; cursor: pointer;
  }
  .gallery-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.8s cubic-bezier(0.22,1,0.36,1); }
  .gallery:hover .gallery-img { transform: scale(1.03); }
  .gallery-grad {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,0) 50%, rgba(10,10,10,0.7) 80%, rgba(10,10,10,1) 100%);
    pointer-events: none;
  }
  .thumb-strip { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; }
  .thumb { width: 48px; height: 36px; border-radius: 6px; object-fit: cover; cursor: pointer; border: 2px solid transparent; opacity: 0.5; transition: all 0.25s; }
  .thumb:hover { opacity: 0.8; }
  .thumb.active { border-color: #fff; opacity: 1; }
  .photo-count {
    position: absolute; top: 20px; right: 20px;
    background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.1);
    backdrop-filter: blur(8px); padding: 5px 12px; border-radius: 20px;
    font-size: 11px; color: rgba(255,255,255,0.6); letter-spacing: 0.5px;
  }
  .gallery-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; color: var(--text3); font-size: 3rem; }
  .gallery-placeholder p { font-size: 0.9rem; }

  .content {
    max-width: 1100px; margin: 0 auto;
    padding: 0 40px 100px;
    display: grid; grid-template-columns: 1fr 300px; gap: 40px;
    align-items: start;
  }

  .hero-text { padding: 40px 0 36px; border-bottom: 1px solid var(--border); margin-bottom: 36px; }
  .category-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: var(--red); margin-bottom: 14px; }
  .biz-name { font-size: 42px; font-weight: 800; letter-spacing: -1.5px; line-height: 1; margin-bottom: 16px; }
  .meta-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
  .meta-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border2); color: var(--text2); }
  .meta-chip.open { color: #27ae60; background: rgba(39,174,96,0.08); border-color: rgba(39,174,96,0.2); }
  .meta-chip.pro { color: var(--red); background: var(--red-soft); border-color: var(--red-border); }
  .meta-chip.verified { background: white; color: #b8860b; border: 1.5px solid #d4af37; }
  .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; display: inline-block; }
  .location-line { font-size: 13px; color: var(--text2); display: flex; align-items: center; gap: 6px; }

  .mobile-cta { display: none; gap: 10px; margin-bottom: 32px; }
  .m-call, .m-wa { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 12px; font-size: 13px; font-weight: 700; text-decoration: none; border: none; cursor: pointer; font-family: 'Sora', sans-serif; transition: opacity 0.2s; }
  .m-call { background: var(--red); color: #fff; }
  .m-wa { background: var(--green); color: #fff; }
  .m-call:hover, .m-wa:hover { opacity: 0.85; }

  .vibe-row { display: flex; flex-wrap: wrap; gap: 7px; padding: 28px 0; border-bottom: 1px solid var(--border); margin-bottom: 36px; }
  .vibe { padding: 7px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; background: transparent; border: 1px solid var(--border2); color: var(--text2); cursor: default; transition: all 0.2s; }
  .vibe:hover { border-color: rgba(255,255,255,0.2); color: var(--text); }

  .info-blocks { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-bottom: 36px; }
  .info-block { background: var(--surface); padding: 22px 24px; transition: background 0.2s; }
  .info-block:hover { background: var(--surface2); }
  .info-block.full { grid-column: 1 / -1; }
  .ib-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text3); margin-bottom: 8px; }
  .ib-value { font-size: 15px; font-weight: 600; color: var(--text); }
  .ib-sub { font-size: 12px; color: var(--text2); margin-top: 3px; }
  .ib-link { font-size: 12px; color: var(--red); text-decoration: none; font-weight: 600; margin-top: 6px; display: inline-block; transition: opacity 0.2s; }
  .ib-link:hover { opacity: 0.7; }
  .open-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: #27ae60; margin-top: 6px; }
  .open-tag.closed { color: var(--text2); }

  .section { margin-bottom: 40px; }
  .section-head { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: var(--text3); margin-bottom: 16px; }
  .about-text { font-size: 15px; line-height: 1.85; color: var(--text2); font-weight: 300; }

  .features { display: flex; flex-wrap: wrap; gap: 8px; }
  .feature { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 10px; font-size: 12px; font-weight: 500; background: var(--surface); border: 1px solid var(--border); color: var(--text2); }
  .feature.yes { color: var(--text); }
  .feature.no { opacity: 0.3; text-decoration: line-through; }

  .reviews-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .rating-display { display: flex; align-items: baseline; gap: 10px; }
  .rating-num { font-size: 48px; font-weight: 800; letter-spacing: -2px; line-height: 1; }
  .rating-stars { font-size: 14px; letter-spacing: 2px; margin-bottom: 3px; }
  .rating-count { font-size: 11px; color: var(--text3); }
  .write-review-btn { font-size: 12px; font-weight: 600; padding: 8px 18px; border-radius: 8px; background: transparent; color: var(--text2); border: 1px solid var(--border2); cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; }
  .write-review-btn:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }

  .review-form { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 20px; display: none; }
  .review-form.show { display: block; animation: fadeUp 0.3s ease both; }
  .rf-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text3); margin-bottom: 12px; }
  .star-row { display: flex; gap: 8px; margin-bottom: 18px; }
  .star-pick { font-size: 28px; cursor: pointer; transition: transform 0.15s; background: none; border: none; line-height: 1; }
  .star-pick:hover { transform: scale(1.15); }
  .rf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .rf-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; font-size: 13px; color: var(--text); font-family: 'Sora', sans-serif; outline: none; transition: border-color 0.2s; }
  .rf-input:focus { border-color: rgba(255,255,255,0.2); }
  .rf-textarea { resize: none; height: 90px; }
  .rf-submit { width: 100%; padding: 13px; background: var(--red); color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Sora', sans-serif; margin-top: 4px; transition: opacity 0.2s; }
  .rf-submit:hover:not(:disabled) { opacity: 0.85; }
  .rf-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .review-success { background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.2); color: #27ae60; padding: 12px; border-radius: 10px; margin-bottom: 16px; }

  .review-card { padding: 20px 0; border-bottom: 1px solid var(--border); }
  .review-card:last-child { border-bottom: none; }
  .rc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .rc-name { font-size: 13px; font-weight: 600; }
  .rc-date { font-size: 11px; color: var(--text3); }
  .rc-stars { font-size: 12px; letter-spacing: 2px; margin-bottom: 8px; }
  .rc-text { font-size: 13px; color: var(--text2); line-height: 1.7; font-weight: 300; }
  .no-reviews { padding: 40px 0; text-align: center; color: var(--text3); font-size: 13px; }

  .menu-img-wrap { margin-top: 8px; }
  .menu-img { width: 100%; border-radius: 12px; cursor: pointer; max-height: 300px; object-fit: cover; transition: max-height 0.4s ease; }
  .menu-img.expanded { max-height: none; }
  .menu-expand-btn { width: 100%; margin-top: 8px; padding: 10px; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; color: var(--text2); font-family: 'Sora', sans-serif; font-size: 12px; cursor: pointer; }

  .sidebar { position: sticky; top: 76px; }
  .sidebar-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px; margin-bottom: 14px; overflow: hidden; }
  .sc-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: var(--text3); margin-bottom: 16px; }
  .btn-primary { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; border-radius: 12px; background: var(--red); color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; border: none; cursor: pointer; font-family: 'Sora', sans-serif; transition: opacity 0.2s; margin-bottom: 8px; letter-spacing: 0.2px; }
  .btn-primary:hover { opacity: 0.85; }
  .btn-wa { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; border-radius: 12px; background: #1a3d24; color: #25D366; border: 1px solid rgba(37,211,102,0.2); font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; margin-bottom: 8px; }
  .btn-wa:hover { background: #1f4a2c; }
  .btn-ghost { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; border-radius: 12px; background: transparent; color: var(--text2); border: 1px solid var(--border); font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; }
  .btn-ghost:hover { border-color: var(--border2); color: var(--text); }
  .sc-divider { height: 1px; background: var(--border); margin: 16px 0; }
  .sc-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 12px; color: var(--text2); }
  .sc-icon { width: 28px; height: 28px; border-radius: 8px; background: var(--surface2); display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
  .sc-val a { color: var(--text2); text-decoration: none; transition: color 0.2s; }
  .sc-val a:hover { color: var(--red); }

  .map-box { background: var(--surface2); border-radius: 10px; height: 110px; display: flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 14px; border: 1px solid var(--border); cursor: pointer; transition: border-color 0.2s; overflow: hidden; position: relative; }
  .map-box:hover { border-color: var(--border2); }
  .map-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 20px 20px; }
  .map-pin { font-size: 28px; position: relative; z-index: 1; }
  .loc-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
  .loc-sub { font-size: 11px; color: var(--text2); margin-bottom: 12px; }

  .share-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .share-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 10px; background: var(--surface2); color: var(--text2); border: 1px solid var(--border); font-size: 11px; font-weight: 600; cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; text-decoration: none; }
  .share-btn:hover { border-color: var(--border2); color: var(--text); }

  .claim-card { background: var(--surface); border: 1px solid var(--border); border-left: 2px solid var(--red); border-radius: 16px; padding: 20px; margin-bottom: 14px; }
  .claim-title { font-size: 13px; font-weight: 700; margin-bottom: 5px; }
  .claim-sub { font-size: 11px; color: var(--text2); line-height: 1.6; margin-bottom: 14px; }
  .claim-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px; border-radius: 10px; background: var(--red-soft); color: var(--red); border: 1px solid var(--red-border); font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; text-decoration: none; }
  .claim-btn:hover { background: var(--red); color: #fff; border-color: var(--red); }
  .claim-success-msg { font-size: 12px; color: #27ae60; background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.2); border-radius: 10px; padding: 10px 12px; line-height: 1.5; }
  .claim-already { font-size: 12px; color: var(--text2); line-height: 1.5; }

  .claim-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.15s ease; }
  .claim-modal { background: var(--surface); border: 1px solid var(--border2); border-radius: 20px; padding: 28px; width: 100%; max-width: 420px; animation: fadeUp 0.2s cubic-bezier(0.22,1,0.36,1) both; }
  .cm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .cm-title { font-size: 15px; font-weight: 800; }
  .cm-close { background: none; border: none; color: var(--text2); font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 6px; line-height: 1; transition: color 0.15s; font-family: 'Sora', sans-serif; }
  .cm-close:hover { color: var(--text); }
  .cm-sub { font-size: 12px; color: var(--text2); line-height: 1.6; margin-bottom: 20px; }
  .cm-divider { height: 1px; background: var(--border); margin: 16px 0 12px; }
  .cm-section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text3); margin-bottom: 12px; }
  .cm-field { margin-bottom: 12px; }
  .cm-label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text3); margin-bottom: 6px; }
  .cm-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; font-size: 13px; color: var(--text); font-family: 'Sora', sans-serif; outline: none; transition: border-color 0.2s; }
  .cm-input:focus { border-color: rgba(255,255,255,0.2); }
  .cm-input::placeholder { color: var(--text3); }
  .cm-error { font-size: 12px; color: #e74c3c; background: rgba(231,76,60,0.08); border: 1px solid rgba(231,76,60,0.2); border-radius: 8px; padding: 9px 12px; margin-bottom: 12px; }
  .cm-submit { width: 100%; padding: 13px; background: var(--red); color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Sora', sans-serif; margin-top: 4px; transition: opacity 0.2s; }
  .cm-submit:hover:not(:disabled) { opacity: 0.85; }
  .cm-submit:disabled { opacity: 0.45; cursor: not-allowed; }

  @media (max-width: 900px) {
    .content { grid-template-columns: 1fr; padding: 0 20px 80px; }
    .sidebar { display: none; }
    .mobile-cta { display: flex; }
    .biz-name { font-size: 30px; }
    .gallery { height: 50vw; min-height: 220px; }
    .info-blocks { grid-template-columns: 1fr; }
    .rf-grid { grid-template-columns: 1fr; }
    .nav { padding: 0 20px; }
    .nav-center { display: none; }
  }
`;
