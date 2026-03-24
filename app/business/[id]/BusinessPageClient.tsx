'use client';

import { useEffect, useState, useCallback } from 'react';
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
  const [showMenu, setShowMenu] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: '', rating: 5, comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);
  const [failedPhotos, setFailedPhotos] = useState<Set<number>>(new Set());
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState({ name: '', phone: '', email: '', designation: '' });
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState('');

  useEffect(() => {
    // Fire page view tracking (fire-and-forget)
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: biz.id, event_type: 'view' }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(typeof window !== 'undefined' && window.scrollY > 100);
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', onScroll);
      return () => window.removeEventListener('scroll', onScroll);
    }
  }, []);

  const handlePhotoError = useCallback((index: number) => {
    setFailedPhotos(prev => new Set(prev).add(index));
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
    if (!claimForm.name || !claimForm.phone || !claimForm.email) return;
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
  const tagsList = biz.tags?.split(',').map(t => t.trim()).filter(Boolean) || [];
  const vibeTags = tagsList.length > 0 ? tagsList : (biz.tags ? [biz.tags] : []);
  const photos = biz.photos?.length ? biz.photos : [];
  const validPhotos = photos.filter((_, i) => !failedPhotos.has(i));
  const allPhotosFailed = photos.length > 0 && validPhotos.length === 0;
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

  const track = (type: 'call' | 'whatsapp') => {
    const data = JSON.stringify({ business_id: biz.id, event_type: type });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([data], { type: 'application/json' }));
    } else {
      fetch('/api/track', { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
  };
  const shareWaUrl = typeof window !== 'undefined' ? `https://wa.me/?text=Check out ${biz.name} on Yana Nagaland: ${window.location.href}` : '';

  // Gallery renderer
  const renderGallery = () => {
    if (photos.length === 0 || allPhotosFailed) {
      return (
        <div className="gallery-placeholder">
          <span>🏔️</span>
          <p>No photos yet</p>
        </div>
      );
    }

    // Find first valid photo indices
    const validIndices = photos.map((_, i) => i).filter(i => !failedPhotos.has(i));
    if (validIndices.length === 0) {
      return (
        <div className="gallery-placeholder">
          <span>🏔️</span>
          <p>No photos yet</p>
        </div>
      );
    }

    if (validIndices.length === 1) {
      return (
        <div className="gallery-single">
          <img
            src={photos[validIndices[0]]}
            alt={biz.name}
            className="gallery-img-single"
            onError={() => handlePhotoError(validIndices[0])}
          />
          <div className="gallery-grad" />
        </div>
      );
    }

    if (validIndices.length === 2) {
      return (
        <div className="gallery-duo">
          {validIndices.map(idx => (
            <div key={idx} className="gallery-duo-item">
              <img
                src={photos[idx]}
                alt={biz.name}
                className="gallery-img-fill"
                onError={() => handlePhotoError(idx)}
              />
            </div>
          ))}
          <div className="gallery-grad" />
        </div>
      );
    }

    // 3+ photos: 1 large left + 2 stacked right
    const mainIdx = validIndices[0];
    const rightIdx1 = validIndices[1];
    const rightIdx2 = validIndices[2];

    return (
      <div className="gallery-grid">
        <div className="gallery-main">
          <img
            src={photos[mainIdx]}
            alt={biz.name}
            className="gallery-img-fill"
            onError={() => handlePhotoError(mainIdx)}
          />
        </div>
        <div className="gallery-side">
          <div className="gallery-side-item">
            <img
              src={photos[rightIdx1]}
              alt={`${biz.name} photo`}
              className="gallery-img-fill"
              onError={() => handlePhotoError(rightIdx1)}
            />
          </div>
          <div className="gallery-side-item">
            <img
              src={photos[rightIdx2]}
              alt={`${biz.name} photo`}
              className="gallery-img-fill"
              onError={() => handlePhotoError(rightIdx2)}
            />
          </div>
        </div>
        <div className="gallery-grad" />
        {validIndices.length >= 4 && (
          <button
            type="button"
            className="view-all-photos-btn"
            onClick={() => setShowAllPhotos(true)}
          >
            View all {validIndices.length} photos
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{styles}</style>
      <main className="biz-page">
        {/* Nav — unchanged */}
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

        {/* Photo Gallery */}
        <div className="gallery" id="gallery">
          {renderGallery()}
        </div>

        <div className="content">
          <div className="left">
            {/* Business Header */}
            <div className="hero-text fade-up">
              <div className="header-pills">
                <span className="category-tag">{biz.plan === 'plus' ? '⭐ ' : ''}{biz.category}</span>
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
              <div className="biz-name">{biz.name}</div>
              {/* Rating right below name */}
              {reviews.length > 0 ? (
                <div className="header-rating">
                  <span className="header-rating-stars">
                    {'⭐'.repeat(Math.round(parseFloat(avgRating!)))}{'☆'.repeat(5 - Math.round(parseFloat(avgRating!)))}
                  </span>
                  <span className="header-rating-num">{avgRating}</span>
                  <span className="header-rating-count">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                </div>
              ) : (
                <div className="header-rating">
                  <span className="header-rating-count" style={{ fontStyle: 'italic', opacity: 0.5 }}>No ratings yet</span>
                </div>
              )}
              <div className="location-line">
                <span>📍</span>
                <span>{locationLine}</span>
              </div>
            </div>

            {/* Mobile CTA */}
            <div className="mobile-cta fade-up-2">
              <a href={`tel:${biz.phone}`} className="m-call" onClick={() => track('call')}>📞 Call Now</a>
              {biz.whatsapp && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="m-wa" onClick={() => track('whatsapp')}>💬 WhatsApp</a>
              )}
            </div>

            {/* Vibe tags */}
            {vibeTags.length > 0 && (
              <div className="vibe-row fade-up-2">
                {vibeTags.map((t) => (
                  <span key={t} className="vibe">{t}</span>
                ))}
              </div>
            )}

            {/* About card */}
            {biz.description && (
              <div className="card fade-up-3">
                <div className="card-head">About</div>
                <p className="about-text">{biz.description}</p>
              </div>
            )}

            {/* Hours & Info card */}
            <div className="card fade-up-3">
              <div className="card-head">Hours & Info</div>
              {biz.opening_hours && (
                <div className="hi-row">
                  <div className="hi-icon">🕐</div>
                  <div className="hi-content">
                    <div className="hi-value">{biz.opening_hours}</div>
                    {openStatus !== null && (
                      <div className={`hi-status ${openStatus ? 'open' : 'closed'}`}>
                        <span className="dot" style={{ background: openStatus ? '#27ae60' : '#999', width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
                        {openStatus ? ' Open right now' : ' Currently closed'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="hi-row">
                <div className="hi-icon">📍</div>
                <div className="hi-content">
                  <div className="hi-value">{biz.address}{biz.landmark ? `, near ${biz.landmark}` : ''}</div>
                  <div className="hi-sub">{biz.city}, Nagaland</div>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hi-link">Open in Google Maps →</a>
                </div>
              </div>
            </div>

            {/* Features card — only show if at least one feature is available */}
            {featuresList.some(f => f.yes) && (
              <div className="card fade-up-4">
                <div className="card-head">Features</div>
                <div className="features">
                  {featuresList.filter(f => f.yes).map((f) => (
                    <span key={f.label} className="feature yes">{f.label}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews card */}
            <div className="card fade-up-4">
              <div className="card-head">Reviews</div>
              <div className="reviews-top">
                <div className="rating-display">
                  {reviews.length > 0 ? (
                    <>
                      <div className="rating-num">{avgRating}</div>
                      <div className="rating-info">
                        <div className="rating-stars">{'⭐'.repeat(Math.round(parseFloat(avgRating!)))}{'☆'.repeat(5 - Math.round(parseFloat(avgRating!)))}</div>
                        <div className="rating-count">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
                      </div>
                    </>
                  ) : (
                    <div className="rating-count" style={{ fontStyle: 'italic', opacity: 0.5 }}>No ratings yet</div>
                  )}
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

            {/* Menu section */}
            {biz.menu_url && (
              <div className="card fade-up-4">
                <div className="card-head">{biz.category?.toLowerCase() === 'restaurant' || biz.category?.toLowerCase() === 'cafe' ? 'Menu' : 'Price List'}</div>
                {biz.menu_url.endsWith('.pdf') ? (
                  <a href={biz.menu_url} target="_blank" rel="noopener noreferrer" className="hi-link">📄 View PDF</a>
                ) : (
                  <div className="menu-img-wrap">
                    <img
                      src={biz.menu_url}
                      alt="Menu"
                      className={`menu-img ${showMenu ? 'expanded' : ''}`}
                      onClick={() => setShowMenu(!showMenu)}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <button type="button" className="menu-expand-btn" onClick={() => setShowMenu(!showMenu)}>{showMenu ? '↑ Collapse' : '↓ View Full'}</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            {/* Contact card — no duplicate phone listing */}
            <div className="sidebar-card">
              <div className="sc-label">Contact</div>
              <a href={`tel:${biz.phone}`} className="btn-primary" onClick={() => track('call')}>📞 Call {biz.phone}</a>
              {biz.whatsapp && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-wa" onClick={() => track('whatsapp')}>💬 Chat on WhatsApp</a>
              )}
              {biz.email && (
                <a href={`mailto:${biz.email}`} className="btn-ghost">✉️ Send Email</a>
              )}
            </div>

            {/* Location card */}
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

            {/* Share card */}
            <div className="sidebar-card">
              <div className="sc-label">Share</div>
              <div className="share-row">
                <a href={shareWaUrl} target="_blank" rel="noopener noreferrer" className="share-btn">💬 WhatsApp</a>
                <button type="button" className="share-btn" onClick={() => { navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : ''); }}>🔗 Copy Link</button>
              </div>
            </div>

            {/* Claim card — exactly as before */}
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
                    <div className="claim-success-msg">✅ Claim request submitted. Check your email to verify and finish setting up your account.</div>
                  ) : (
                    <button type="button" className="claim-btn" onClick={() => setShowClaimModal(true)}>🏷️ Claim This Listing</button>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </main>

      {/* All photos lightbox */}
      {showAllPhotos && (
        <div className="photos-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAllPhotos(false); }}>
          <div className="photos-modal">
            <div className="photos-modal-header">
              <div className="photos-modal-title">All Photos</div>
              <button className="cm-close" onClick={() => setShowAllPhotos(false)} aria-label="Close">✕</button>
            </div>
            <div className="photos-modal-grid">
              {photos.map((p, i) => !failedPhotos.has(i) && (
                <img
                  key={i}
                  src={p}
                  alt={`${biz.name} photo ${i + 1}`}
                  className="photos-modal-img"
                  onError={() => handlePhotoError(i)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Claim modal — exactly as before */}
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
            {claimError && <div className="cm-error">{claimError}</div>}

            <button
              className="cm-submit"
              onClick={submitClaim}
              disabled={claimLoading || !claimForm.name || !claimForm.phone || !claimForm.email}
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

  /* Nav — unchanged */
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

  /* Gallery */
  .gallery {
    margin-top: 56px; position: relative;
    height: 420px; max-height: 480px; min-height: 300px;
    background: var(--surface2); overflow: hidden;
  }
  .gallery-grad {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,0) 60%, rgba(10,10,10,0.6) 85%, rgba(10,10,10,1) 100%);
    pointer-events: none; z-index: 2;
  }
  .gallery-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; color: var(--text3); font-size: 3rem; }
  .gallery-placeholder p { font-size: 0.9rem; }

  /* Single photo */
  .gallery-single { width: 100%; height: 100%; position: relative; }
  .gallery-img-single { width: 100%; height: 100%; object-fit: cover; display: block; }

  /* Two photos side by side */
  .gallery-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; height: 100%; position: relative; }
  .gallery-duo-item { overflow: hidden; }
  .gallery-img-fill { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.5s cubic-bezier(0.22,1,0.36,1); }
  .gallery-duo-item:hover .gallery-img-fill { transform: scale(1.03); }

  /* 3+ photos grid */
  .gallery-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; height: 100%; position: relative; }
  .gallery-main { overflow: hidden; grid-row: 1 / 2; }
  .gallery-main .gallery-img-fill { cursor: pointer; }
  .gallery-main:hover .gallery-img-fill { transform: scale(1.03); }
  .gallery-side { display: grid; grid-template-rows: 1fr 1fr; gap: 3px; overflow: hidden; }
  .gallery-side-item { overflow: hidden; }
  .gallery-side-item:hover .gallery-img-fill { transform: scale(1.03); }

  .view-all-photos-btn {
    position: absolute; bottom: 20px; right: 20px; z-index: 3;
    padding: 8px 18px; border-radius: 8px;
    background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.15);
    backdrop-filter: blur(8px); color: #fff; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s;
  }
  .view-all-photos-btn:hover { background: rgba(0,0,0,0.85); border-color: rgba(255,255,255,0.3); }

  /* Content layout */
  .content {
    max-width: 1100px; margin: 0 auto;
    padding: 0 40px 100px;
    display: grid; grid-template-columns: 1fr 320px; gap: 32px;
    align-items: start;
  }

  /* Header */
  .hero-text { padding: 32px 0 28px; margin-bottom: 24px; }
  .header-pills { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .category-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--bg); background: var(--red); padding: 4px 12px; border-radius: 20px; }
  .biz-name { font-size: 38px; font-weight: 800; letter-spacing: -1.5px; line-height: 1.1; margin-bottom: 10px; }
  .header-rating { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .header-rating-stars { font-size: 14px; letter-spacing: 1px; }
  .header-rating-num { font-size: 14px; font-weight: 700; color: var(--text); }
  .header-rating-count { font-size: 13px; color: var(--text2); }
  .meta-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
  .meta-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border2); color: var(--text2); }
  .meta-chip.open { color: #27ae60; background: rgba(39,174,96,0.08); border-color: rgba(39,174,96,0.2); }
  .meta-chip.pro { color: var(--red); background: var(--red-soft); border-color: var(--red-border); }
  .meta-chip.verified { background: white; color: #b8860b; border: 1.5px solid #d4af37; }
  .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; display: inline-block; }
  .location-line { font-size: 13px; color: var(--text2); display: flex; align-items: center; gap: 6px; }

  /* Mobile CTA */
  .mobile-cta { display: none; gap: 10px; margin-bottom: 24px; }
  .m-call, .m-wa { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 12px; font-size: 13px; font-weight: 700; text-decoration: none; border: none; cursor: pointer; font-family: 'Sora', sans-serif; transition: opacity 0.2s; }
  .m-call { background: var(--red); color: #fff; }
  .m-wa { background: var(--green); color: #fff; }
  .m-call:hover, .m-wa:hover { opacity: 0.85; }

  /* Vibe tags */
  .vibe-row { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 24px; }
  .vibe { padding: 7px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; background: transparent; border: 1px solid var(--border2); color: var(--text2); cursor: default; transition: all 0.2s; }
  .vibe:hover { border-color: rgba(255,255,255,0.2); color: var(--text); }

  /* Cards */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
  }
  .card-head { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: var(--text3); margin-bottom: 16px; }

  .about-text { font-size: 15px; line-height: 1.85; color: var(--text2); font-weight: 300; }

  /* Hours & Info card */
  .hi-row { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border); }
  .hi-row:last-child { border-bottom: none; padding-bottom: 0; }
  .hi-row:first-of-type { padding-top: 0; }
  .hi-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .hi-content { flex: 1; }
  .hi-value { font-size: 14px; font-weight: 600; color: var(--text); }
  .hi-sub { font-size: 12px; color: var(--text2); margin-top: 3px; }
  .hi-link { font-size: 12px; color: var(--red); text-decoration: none; font-weight: 600; margin-top: 6px; display: inline-block; transition: opacity 0.2s; }
  .hi-link:hover { opacity: 0.7; }
  .hi-status { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: #27ae60; margin-top: 4px; }
  .hi-status.closed { color: var(--text2); }

  /* Features */
  .features { display: flex; flex-wrap: wrap; gap: 8px; }
  .feature { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 10px; font-size: 12px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); color: var(--text2); }
  .feature.yes { color: var(--text); border-color: var(--border2); }
  .feature.no { opacity: 0.3; text-decoration: line-through; }

  /* Reviews */
  .reviews-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .rating-display { display: flex; align-items: baseline; gap: 10px; }
  .rating-num { font-size: 42px; font-weight: 800; letter-spacing: -2px; line-height: 1; }
  .rating-stars { font-size: 14px; letter-spacing: 2px; margin-bottom: 3px; }
  .rating-count { font-size: 11px; color: var(--text3); }
  .write-review-btn { font-size: 12px; font-weight: 600; padding: 8px 18px; border-radius: 8px; background: transparent; color: var(--text2); border: 1px solid var(--border2); cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; }
  .write-review-btn:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }

  .review-form { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 20px; display: none; }
  .review-form.show { display: block; animation: fadeUp 0.3s ease both; }
  .rf-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text3); margin-bottom: 12px; }
  .star-row { display: flex; gap: 8px; margin-bottom: 18px; }
  .star-pick { font-size: 28px; cursor: pointer; transition: transform 0.15s; background: none; border: none; line-height: 1; }
  .star-pick:hover { transform: scale(1.15); }
  .rf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .rf-input { width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; font-size: 13px; color: var(--text); font-family: 'Sora', sans-serif; outline: none; transition: border-color 0.2s; }
  .rf-input:focus { border-color: rgba(255,255,255,0.2); }
  .rf-textarea { resize: none; height: 90px; }
  .rf-submit { width: 100%; padding: 13px; background: var(--red); color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Sora', sans-serif; margin-top: 4px; transition: opacity 0.2s; }
  .rf-submit:hover:not(:disabled) { opacity: 0.85; }
  .rf-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .review-success { background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.2); color: #27ae60; padding: 12px; border-radius: 10px; margin-bottom: 16px; }

  .review-card { padding: 18px 0; border-bottom: 1px solid var(--border); }
  .review-card:last-child { border-bottom: none; }
  .rc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .rc-name { font-size: 13px; font-weight: 600; }
  .rc-date { font-size: 11px; color: var(--text3); }
  .rc-stars { font-size: 12px; letter-spacing: 2px; margin-bottom: 8px; }
  .rc-text { font-size: 13px; color: var(--text2); line-height: 1.7; font-weight: 300; }
  .no-reviews { padding: 40px 0; text-align: center; color: var(--text3); font-size: 13px; }

  /* Menu */
  .menu-img-wrap { margin-top: 8px; }
  .menu-img { width: 100%; border-radius: 12px; cursor: pointer; max-height: 300px; object-fit: cover; transition: max-height 0.4s ease; }
  .menu-img.expanded { max-height: none; }
  .menu-expand-btn { width: 100%; margin-top: 8px; padding: 10px; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; color: var(--text2); font-family: 'Sora', sans-serif; font-size: 12px; cursor: pointer; }

  /* Sidebar */
  .sidebar { position: sticky; top: 76px; }
  .sidebar-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 22px; margin-bottom: 14px; overflow: hidden; }
  .sc-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: var(--text3); margin-bottom: 16px; }
  .btn-primary { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; border-radius: 12px; background: var(--red); color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; border: none; cursor: pointer; font-family: 'Sora', sans-serif; transition: opacity 0.2s; margin-bottom: 8px; letter-spacing: 0.2px; }
  .btn-primary:hover { opacity: 0.85; }
  .btn-wa { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; border-radius: 12px; background: #1a3d24; color: #25D366; border: 1px solid rgba(37,211,102,0.2); font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; margin-bottom: 8px; }
  .btn-wa:hover { background: #1f4a2c; }
  .btn-ghost { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; border-radius: 12px; background: transparent; color: var(--text2); border: 1px solid var(--border); font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; }
  .btn-ghost:hover { border-color: var(--border2); color: var(--text); }

  .map-box { background: var(--surface2); border-radius: 10px; height: 110px; display: flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 14px; border: 1px solid var(--border); cursor: pointer; transition: border-color 0.2s; overflow: hidden; position: relative; }
  .map-box:hover { border-color: var(--border2); }
  .map-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 20px 20px; }
  .map-pin { font-size: 28px; position: relative; z-index: 1; }
  .loc-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
  .loc-sub { font-size: 11px; color: var(--text2); margin-bottom: 12px; }

  .share-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .share-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 10px; background: var(--surface2); color: var(--text2); border: 1px solid var(--border); font-size: 11px; font-weight: 600; cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; text-decoration: none; }
  .share-btn:hover { border-color: var(--border2); color: var(--text); }

  /* Claim card */
  .claim-card { background: var(--surface); border: 1px solid var(--border); border-left: 2px solid var(--red); border-radius: 12px; padding: 20px; margin-bottom: 14px; }
  .claim-title { font-size: 13px; font-weight: 700; margin-bottom: 5px; }
  .claim-sub { font-size: 11px; color: var(--text2); line-height: 1.6; margin-bottom: 14px; }
  .claim-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px; border-radius: 10px; background: var(--red-soft); color: var(--red); border: 1px solid var(--red-border); font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; text-decoration: none; }
  .claim-btn:hover { background: var(--red); color: #fff; border-color: var(--red); }
  .claim-success-msg { font-size: 12px; color: #27ae60; background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.2); border-radius: 10px; padding: 10px 12px; line-height: 1.5; }
  .claim-already { font-size: 12px; color: var(--text2); line-height: 1.5; }

  /* Claim modal */
  .claim-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.15s ease; }
  .claim-modal { background: var(--surface); border: 1px solid var(--border2); border-radius: 20px; padding: 28px; width: 100%; max-width: 420px; animation: fadeUp 0.2s cubic-bezier(0.22,1,0.36,1) both; }
  .cm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .cm-title { font-size: 15px; font-weight: 800; }
  .cm-close { background: none; border: none; color: var(--text2); font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 6px; line-height: 1; transition: color 0.15s; font-family: 'Sora', sans-serif; }
  .cm-close:hover { color: var(--text); }
  .cm-sub { font-size: 12px; color: var(--text2); line-height: 1.6; margin-bottom: 20px; }
  .cm-field { margin-bottom: 12px; }
  .cm-label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text3); margin-bottom: 6px; }
  .cm-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; font-size: 13px; color: var(--text); font-family: 'Sora', sans-serif; outline: none; transition: border-color 0.2s; }
  .cm-input:focus { border-color: rgba(255,255,255,0.2); }
  .cm-input::placeholder { color: var(--text3); }
  .cm-error { font-size: 12px; color: #e74c3c; background: rgba(231,76,60,0.08); border: 1px solid rgba(231,76,60,0.2); border-radius: 8px; padding: 9px 12px; margin-bottom: 12px; }
  .cm-submit { width: 100%; padding: 13px; background: var(--red); color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Sora', sans-serif; margin-top: 4px; transition: opacity 0.2s; }
  .cm-submit:hover:not(:disabled) { opacity: 0.85; }
  .cm-submit:disabled { opacity: 0.45; cursor: not-allowed; }

  /* Photos lightbox */
  .photos-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.15s ease; overflow-y: auto; }
  .photos-modal { background: var(--surface); border: 1px solid var(--border2); border-radius: 20px; padding: 28px; width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; animation: fadeUp 0.2s cubic-bezier(0.22,1,0.36,1) both; }
  .photos-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .photos-modal-title { font-size: 15px; font-weight: 800; }
  .photos-modal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
  .photos-modal-img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 10px; }

  /* Mobile */
  @media (max-width: 900px) {
    .content { grid-template-columns: 1fr; padding: 0 20px 80px; }
    .sidebar { display: none; }
    .mobile-cta { display: flex; }
    .biz-name { font-size: 28px; }
    .gallery { height: 50vw; min-height: 220px; }
    .gallery-grid { grid-template-columns: 1fr; }
    .gallery-side { display: none; }
    .gallery-duo { grid-template-columns: 1fr; }
    .gallery-duo-item:nth-child(2) { display: none; }
    .rf-grid { grid-template-columns: 1fr; }
    .nav { padding: 0 20px; }
    .nav-center { display: none; }
    .photos-modal-grid { grid-template-columns: 1fr 1fr; }
  }
`;
