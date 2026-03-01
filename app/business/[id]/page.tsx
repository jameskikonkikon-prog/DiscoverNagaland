'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Business = {
  id: string;
  name: string;
  category: string;
  city: string;
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
  created_at?: string;
};

type Review = {
  id: string;
  rating: number;
  comment: string;
  reviewer_name: string;
  created_at: string;
};

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill={s <= rating ? '#c9963a' : 'none'} stroke={s <= rating ? '#c9963a' : '#4a5a4a'} strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

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

export default function BusinessPage() {
  const params = useParams();
  const router = useRouter();
  const [biz, setBiz] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: '', rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('businesses').select('*').eq('id', params.id).single();
      if (!data) { router.push('/'); return; }
      setBiz(data);
      // Load reviews
      const { data: revData } = await supabase.from('reviews').select('*').eq('business_id', params.id).order('created_at', { ascending: false });
      setReviews(revData || []);
      setLoading(false);
    }
    load();
  }, [params.id, router]);

  const submitReview = async () => {
    if (!reviewForm.name || !reviewForm.comment) return;
    setSubmittingReview(true);
    await supabase.from('reviews').insert({
      business_id: biz?.id,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
      reviewer_name: reviewForm.name,
    });
    const { data } = await supabase.from('reviews').select('*').eq('business_id', biz?.id).order('created_at', { ascending: false });
    setReviews(data || []);
    setReviewSuccess(true);
    setReviewForm({ name: '', rating: 5, comment: '' });
    setSubmittingReview(false);
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const openStatus = biz ? isOpenNow(biz.opening_hours || '') : null;
  const priceLabel = biz ? getPriceLabel(biz) : null;
  const amenitiesList = biz?.amenities?.split(',').map(a => a.trim()).filter(Boolean) || [];
  const tagsList = biz?.tags?.split(',').map(t => t.trim()).filter(Boolean) || [];
  const photos = biz?.photos?.length ? biz.photos : [];

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <main className="biz-page">
          <div className="loading-wrap">
            <div className="loading-spinner" />
            <p>Loading listing…</p>
          </div>
        </main>
      </>
    );
  }

  if (!biz) return null;

  return (
    <>
      <style>{styles}</style>
      <main className="biz-page">

        {/* Top nav */}
        <nav className="biz-nav">
          <Link href="/" className="nav-logo">Discover<span>Nagaland</span></Link>
          <Link href={`/search?q=${biz.city}`} className="nav-back">← {biz.city}</Link>
        </nav>

        {/* Photo gallery */}
        <div className="gallery">
          {photos.length > 0 ? (
            <>
              <img src={photos[activePhoto]} alt={biz.name} className="gallery-main" />
              {photos.length > 1 && (
                <>
                  <button className="gallery-arrow left" onClick={() => setActivePhoto((activePhoto - 1 + photos.length) % photos.length)}>‹</button>
                  <button className="gallery-arrow right" onClick={() => setActivePhoto((activePhoto + 1) % photos.length)}>›</button>
                  <div className="gallery-dots">
                    {photos.map((_, i) => (
                      <button key={i} className={`gallery-dot ${i === activePhoto ? 'active' : ''}`} onClick={() => setActivePhoto(i)} />
                    ))}
                  </div>
                  <div className="gallery-thumbs">
                    {photos.slice(0, 5).map((p, i) => (
                      <img key={i} src={p} alt="" className={`gallery-thumb ${i === activePhoto ? 'active' : ''}`} onClick={() => setActivePhoto(i)} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="gallery-placeholder">
              <span>🏔️</span>
              <p>No photos yet</p>
            </div>
          )}

          {/* Open/Closed badge */}
          {openStatus !== null && (
            <div className={`open-badge ${openStatus ? 'open' : 'closed'}`}>
              {openStatus ? '● Open Now' : '● Closed'}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="biz-content">
          <div className="biz-main">

            {/* Header */}
            <div className="biz-header">
              <div className="biz-category-tag">{biz.category}</div>
              <h1 className="biz-name">
                {biz.name}
                {biz.is_verified && <span className="verified-badge" title="Verified">✓</span>}
              </h1>

              {/* Rating row */}
              {avgRating && (
                <div className="rating-row">
                  <StarRating rating={Math.round(parseFloat(avgRating))} size={18} />
                  <span className="rating-num">{avgRating}</span>
                  <span className="rating-count">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                </div>
              )}

              {/* Price */}
              {priceLabel && (
                <div className="price-pill">{priceLabel}</div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="cta-buttons">
              <a href={`tel:${biz.phone}`} className="cta-btn call">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.33h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                Call Now
              </a>
              {biz.whatsapp && (
                <a href={`https://wa.me/${biz.whatsapp.replace(/\D/g, '')}?text=Hi!%20I%20found%20you%20on%20Discover%20Nagaland%20and%20wanted%20to%20enquire%20about%20your%20business.`} target="_blank" rel="noopener noreferrer" className="cta-btn whatsapp">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></svg>
                  WhatsApp
                </a>
              )}
              {biz.website && (
                <a href={biz.website} target="_blank" rel="noopener noreferrer" className="cta-btn website">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                  Website
                </a>
              )}
            </div>

            {/* Info cards */}
            <div className="info-cards">
              <div className="info-card">
                <div className="info-icon">📍</div>
                <div>
                  <div className="info-label">Address</div>
                  <div className="info-value">{biz.address}{biz.landmark && <>, near {biz.landmark}</>}</div>
                  <div className="info-value" style={{ color: '#c9963a', fontSize: '0.8rem' }}>{biz.city}, Nagaland</div>
                  <a href={`https://www.google.com/maps/search/${encodeURIComponent(biz.name + ' ' + biz.city + ' Nagaland')}`} target="_blank" rel="noopener noreferrer" className="maps-link">Open in Google Maps →</a>
                </div>
              </div>

              {biz.opening_hours && (
                <div className="info-card">
                  <div className="info-icon">🕐</div>
                  <div>
                    <div className="info-label">Opening Hours</div>
                    <div className="info-value">{biz.opening_hours}</div>
                    {openStatus !== null && (
                      <div className={`open-inline ${openStatus ? 'open' : 'closed'}`}>
                        {openStatus ? '● Open right now' : '● Currently closed'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {biz.phone && (
                <div className="info-card">
                  <div className="info-icon">📞</div>
                  <div>
                    <div className="info-label">Contact</div>
                    <div className="info-value">{biz.phone}</div>
                    {biz.email && <div className="info-value" style={{ fontSize: '0.82rem', color: '#8a9a8a' }}>{biz.email}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {biz.description && (
              <div className="section">
                <h3 className="section-title">About</h3>
                <p className="biz-desc">{biz.description}</p>
              </div>
            )}

            {/* Amenities for PG */}
            {amenitiesList.length > 0 && (
              <div className="section">
                <h3 className="section-title">Amenities</h3>
                <div className="amenities-grid">
                  {amenitiesList.map((a) => (
                    <div key={a} className="amenity-chip">✓ {a}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {tagsList.length > 0 && (
              <div className="section">
                <h3 className="section-title">Features</h3>
                <div className="tags-row">
                  {tagsList.map((t) => (
                    <span key={t} className="tag-chip">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Menu */}
            {biz.menu_url && (
              <div className="section">
                <h3 className="section-title">
                  {biz.category?.toLowerCase() === 'restaurant' || biz.category?.toLowerCase() === 'cafe' ? '📋 Menu' : '📄 Price List / Rate Card'}
                </h3>
                {biz.menu_url.endsWith('.pdf') ? (
                  <a href={biz.menu_url} target="_blank" rel="noopener noreferrer" className="menu-btn">
                    📄 View {biz.category?.toLowerCase() === 'restaurant' || biz.category?.toLowerCase() === 'cafe' ? 'Menu' : 'Rate Card'} (PDF)
                  </a>
                ) : (
                  <div className="menu-img-wrap">
                    <img
                      src={biz.menu_url}
                      alt="Menu"
                      className={`menu-img ${showMenu ? 'expanded' : ''}`}
                      onClick={() => setShowMenu(!showMenu)}
                    />
                    <button className="menu-expand-btn" onClick={() => setShowMenu(!showMenu)}>
                      {showMenu ? '↑ Collapse' : '↓ View Full Menu'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Reviews */}
            <div className="section">
              <h3 className="section-title">
                Reviews
                {avgRating && <span className="avg-rating-badge">⭐ {avgRating}</span>}
              </h3>

              {/* Write review */}
              {!reviewSuccess ? (
                <div className="review-form">
                  <div className="review-form-title">Leave a Review</div>
                  <div className="star-select">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="star-btn"
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill={s <= (hoverRating || reviewForm.rating) ? '#c9963a' : 'none'} stroke={s <= (hoverRating || reviewForm.rating) ? '#c9963a' : '#4a5a4a'} strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    ))}
                    <span className="star-label">{['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hoverRating || reviewForm.rating]}</span>
                  </div>
                  <input className="review-input" placeholder="Your name" value={reviewForm.name} onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })} />
                  <textarea className="review-textarea" placeholder="Share your experience..." rows={3} value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} />
                  <button className="review-submit" onClick={submitReview} disabled={submittingReview || !reviewForm.name || !reviewForm.comment}>
                    {submittingReview ? 'Submitting…' : 'Submit Review'}
                  </button>
                </div>
              ) : (
                <div className="review-success">🎉 Thanks for your review!</div>
              )}

              {/* Reviews list */}
              {reviews.length > 0 ? (
                <div className="reviews-list">
                  {reviews.map((r) => (
                    <div key={r.id} className="review-card">
                      <div className="review-top">
                        <div className="reviewer-avatar">{r.reviewer_name[0].toUpperCase()}</div>
                        <div>
                          <div className="reviewer-name">{r.reviewer_name}</div>
                          <StarRating rating={r.rating} size={13} />
                        </div>
                        <div className="review-date">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      </div>
                      <p className="review-comment">{r.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-reviews">No reviews yet — be the first!</p>
              )}
            </div>

          </div>

          {/* Sidebar */}
          <div className="biz-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-title">Quick Contact</div>
              <a href={`tel:${biz.phone}`} className="sidebar-cta call">
                📞 Call {biz.phone}
              </a>
              {biz.whatsapp && (
                <a href={`https://wa.me/${biz.whatsapp.replace(/\D/g, '')}?text=Hi!%20I%20found%20you%20on%20Discover%20Nagaland%20and%20wanted%20to%20enquire%20about%20your%20business.`} target="_blank" rel="noopener noreferrer" className="sidebar-cta whatsapp">
                  💬 Chat on WhatsApp
                </a>
              )}
              {biz.email && (
                <a href={`mailto:${biz.email}`} className="sidebar-cta email">
                  ✉️ Send Email
                </a>
              )}
            </div>

            {priceLabel && (
              <div className="sidebar-card">
                <div className="sidebar-title">Pricing</div>
                <div className="sidebar-price">{priceLabel}</div>
              </div>
            )}

            <div className="sidebar-card">
              <div className="sidebar-title">Location</div>
              <div className="sidebar-location">{biz.address}</div>
              {biz.landmark && <div className="sidebar-landmark">Near {biz.landmark}</div>}
              <div className="sidebar-city">{biz.city}, Nagaland</div>
              <a href={`https://www.google.com/maps/search/${encodeURIComponent(biz.name + ' ' + biz.city + ' Nagaland')}`} target="_blank" rel="noopener noreferrer" className="sidebar-cta maps">
                🗺️ Open in Google Maps
              </a>
            </div>

            <div className="sidebar-card share-card">
              <div className="sidebar-title">Share this listing</div>
              <div className="share-buttons">
                <a href={`https://wa.me/?text=Check out ${biz.name} on Discover Nagaland: ${typeof window !== 'undefined' ? window.location.href : ''}`} target="_blank" rel="noopener noreferrer" className="share-btn wa">WhatsApp</a>
                <button className="share-btn copy" onClick={() => { navigator.clipboard.writeText(window.location.href); }}>Copy Link</button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sticky CTA */}
        <div className="mobile-sticky">
          <a href={`tel:${biz.phone}`} className="sticky-call">📞 Call</a>
          {biz.whatsapp && (
            <a href={`https://wa.me/${biz.whatsapp.replace(/\D/g, '')}?text=Hi!%20I%20found%20you%20on%20Discover%20Nagaland%20and%20wanted%20to%20enquire%20about%20your%20business.`} target="_blank" rel="noopener noreferrer" className="sticky-whatsapp">💬 WhatsApp</a>
          )}
        </div>

      </main>
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1a0d; color: #e8ddd0; font-family: 'Outfit', sans-serif; }

  .biz-page { min-height: 100vh; background: #0d1a0d; padding-bottom: 80px; }

  /* Nav */
  .biz-nav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; background: rgba(13,26,13,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(201,150,58,0.1); }
  .nav-logo { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: #c9963a; text-decoration: none; font-weight: 700; }
  .nav-logo span { color: #e8ddd0; }
  .nav-back { color: #8a9a8a; text-decoration: none; font-size: 0.85rem; transition: color 0.2s; }
  .nav-back:hover { color: #c9963a; }

  /* Gallery */
  .gallery { position: relative; width: 100%; height: clamp(260px, 45vw, 500px); background: #1a2e1a; overflow: hidden; }
  .gallery-main { width: 100%; height: 100%; object-fit: cover; display: block; }
  .gallery-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; color: #4a5a4a; font-size: 3rem; }
  .gallery-placeholder p { font-size: 0.9rem; }
  .gallery-arrow { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); border: none; color: #e8ddd0; width: 44px; height: 44px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 5; }
  .gallery-arrow:hover { background: rgba(201,150,58,0.7); }
  .gallery-arrow.left { left: 1rem; }
  .gallery-arrow.right { right: 1rem; }
  .gallery-dots { position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 5; }
  .gallery-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.4); border: none; cursor: pointer; transition: background 0.2s; }
  .gallery-dot.active { background: #c9963a; }
  .gallery-thumbs { position: absolute; bottom: 0; left: 0; right: 0; display: flex; gap: 3px; height: 52px; background: rgba(0,0,0,0.4); z-index: 5; padding: 4px; }
  .gallery-thumb { height: 100%; aspect-ratio: 1; object-fit: cover; cursor: pointer; opacity: 0.6; transition: opacity 0.2s; border-radius: 4px; }
  .gallery-thumb.active { opacity: 1; outline: 2px solid #c9963a; }
  .open-badge { position: absolute; top: 1rem; right: 1rem; padding: 0.4rem 0.85rem; border-radius: 20px; font-size: 0.78rem; font-weight: 600; z-index: 5; }
  .open-badge.open { background: rgba(34,197,94,0.2); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
  .open-badge.closed { background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(248,113,113,0.3); }

  /* Content layout */
  .biz-content { max-width: 1200px; margin: 0 auto; padding: 2rem; display: grid; grid-template-columns: 1fr 320px; gap: 2rem; align-items: start; }
  .biz-main { min-width: 0; }

  /* Header */
  .biz-header { margin-bottom: 1.5rem; }
  .biz-category-tag { display: inline-block; font-size: 0.72rem; color: #c9963a; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem; }
  .biz-name { font-family: 'Playfair Display', serif; font-size: clamp(1.8rem, 4vw, 2.8rem); color: #e8ddd0; line-height: 1.15; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .verified-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #c9963a; color: #000d00; border-radius: 50%; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
  .rating-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
  .rating-num { font-size: 1rem; font-weight: 600; color: #c9963a; }
  .rating-count { font-size: 0.82rem; color: #8a9a8a; }
  .price-pill { display: inline-block; background: rgba(201,150,58,0.1); border: 1px solid rgba(201,150,58,0.25); color: #c9963a; padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: 500; margin-top: 0.25rem; }

  /* CTA Buttons */
  .cta-buttons { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.75rem; }
  .cta-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-family: 'Outfit', sans-serif; font-size: 0.9rem; font-weight: 600; text-decoration: none; transition: transform 0.15s, box-shadow 0.2s; cursor: pointer; border: none; }
  .cta-btn:hover { transform: translateY(-2px); }
  .cta-btn.call { background: linear-gradient(135deg, #c9963a, #a07020); color: #000d00; box-shadow: 0 4px 16px rgba(201,150,58,0.3); }
  .cta-btn.call:hover { box-shadow: 0 8px 24px rgba(201,150,58,0.4); }
  .cta-btn.whatsapp { background: #25d366; color: white; }
  .cta-btn.whatsapp:hover { box-shadow: 0 8px 24px rgba(37,211,102,0.3); }
  .cta-btn.website { background: rgba(255,255,255,0.06); border: 1px solid rgba(201,150,58,0.2); color: #e8ddd0; }

  /* Info cards */
  .info-cards { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem; }
  .info-card { display: flex; gap: 1rem; align-items: flex-start; background: rgba(26,46,26,0.6); border: 1px solid rgba(201,150,58,0.08); border-radius: 12px; padding: 1rem 1.25rem; }
  .info-icon { font-size: 1.3rem; flex-shrink: 0; margin-top: 2px; }
  .info-label { font-size: 0.72rem; color: #c9963a; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; margin-bottom: 0.3rem; }
  .info-value { font-size: 0.9rem; color: #e8ddd0; line-height: 1.5; }
  .maps-link { display: inline-block; margin-top: 0.4rem; font-size: 0.8rem; color: #c9963a; text-decoration: none; }
  .maps-link:hover { text-decoration: underline; }
  .open-inline { font-size: 0.78rem; margin-top: 0.35rem; font-weight: 500; }
  .open-inline.open { color: #4ade80; }
  .open-inline.closed { color: #f87171; }

  /* Sections */
  .section { margin-bottom: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(201,150,58,0.08); }
  .section-title { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: #e8ddd0; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem; }
  .avg-rating-badge { font-family: 'Outfit', sans-serif; font-size: 0.82rem; background: rgba(201,150,58,0.12); color: #c9963a; padding: 0.2rem 0.6rem; border-radius: 20px; }
  .biz-desc { color: rgba(232,221,208,0.7); font-size: 0.93rem; line-height: 1.75; }

  /* Amenities */
  .amenities-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .amenity-chip { background: rgba(201,150,58,0.08); border: 1px solid rgba(201,150,58,0.2); color: #c9963a; padding: 0.35rem 0.85rem; border-radius: 8px; font-size: 0.8rem; }

  /* Tags */
  .tags-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .tag-chip { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #8a9a8a; padding: 0.3rem 0.75rem; border-radius: 20px; font-size: 0.78rem; }

  /* Menu */
  .menu-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.85rem 1.5rem; background: rgba(201,150,58,0.08); border: 1px solid rgba(201,150,58,0.25); color: #c9963a; text-decoration: none; border-radius: 10px; font-size: 0.9rem; transition: background 0.2s; }
  .menu-btn:hover { background: rgba(201,150,58,0.15); }
  .menu-img-wrap { position: relative; }
  .menu-img { width: 100%; border-radius: 12px; cursor: pointer; max-height: 300px; object-fit: cover; transition: max-height 0.4s ease; }
  .menu-img.expanded { max-height: none; }
  .menu-expand-btn { width: 100%; margin-top: 0.5rem; padding: 0.6rem; background: rgba(201,150,58,0.08); border: 1px solid rgba(201,150,58,0.2); color: #c9963a; border-radius: 8px; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.82rem; }

  /* Reviews */
  .review-form { background: rgba(26,46,26,0.6); border: 1px solid rgba(201,150,58,0.12); border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem; }
  .review-form-title { font-size: 0.85rem; color: #c9963a; font-weight: 600; margin-bottom: 0.75rem; letter-spacing: 0.05em; text-transform: uppercase; }
  .star-select { display: flex; align-items: center; gap: 4px; margin-bottom: 0.75rem; }
  .star-btn { background: none; border: none; cursor: pointer; padding: 2px; transition: transform 0.1s; }
  .star-btn:hover { transform: scale(1.15); }
  .star-label { font-size: 0.82rem; color: #c9963a; margin-left: 0.5rem; min-width: 70px; }
  .review-input, .review-textarea { width: 100%; padding: 0.7rem 0.9rem; background: rgba(0,0,0,0.3); border: 1.5px solid rgba(201,150,58,0.15); border-radius: 8px; color: #e8ddd0; font-family: 'Outfit', sans-serif; font-size: 0.88rem; outline: none; margin-bottom: 0.6rem; transition: border-color 0.2s; }
  .review-input::placeholder, .review-textarea::placeholder { color: #3a4a3a; }
  .review-input:focus, .review-textarea:focus { border-color: #c9963a; }
  .review-textarea { resize: vertical; min-height: 80px; }
  .review-submit { width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #c9963a, #a07020); border: none; border-radius: 8px; color: #000d00; font-family: 'Outfit', sans-serif; font-size: 0.92rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s, transform 0.15s; }
  .review-submit:hover:not(:disabled) { transform: translateY(-1px); }
  .review-submit:disabled { opacity: 0.45; cursor: not-allowed; }
  .review-success { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.2); color: #4ade80; padding: 1rem; border-radius: 10px; text-align: center; margin-bottom: 1.5rem; }
  .reviews-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .review-card { background: rgba(26,46,26,0.5); border: 1px solid rgba(201,150,58,0.08); border-radius: 12px; padding: 1rem 1.25rem; }
  .review-top { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.6rem; }
  .reviewer-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(201,150,58,0.2); color: #c9963a; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; flex-shrink: 0; }
  .reviewer-name { font-size: 0.88rem; font-weight: 600; color: #e8ddd0; margin-bottom: 3px; }
  .review-date { margin-left: auto; font-size: 0.75rem; color: #6a7a6a; white-space: nowrap; }
  .review-comment { font-size: 0.87rem; color: rgba(232,221,208,0.7); line-height: 1.6; }
  .no-reviews { color: #6a7a6a; font-size: 0.88rem; font-style: italic; }

  /* Sidebar */
  .biz-sidebar { position: sticky; top: 80px; display: flex; flex-direction: column; gap: 1rem; }
  .sidebar-card { background: linear-gradient(145deg, #1a2e1a, #152515); border: 1px solid rgba(201,150,58,0.12); border-radius: 14px; padding: 1.25rem; }
  .sidebar-title { font-size: 0.72rem; color: #c9963a; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; margin-bottom: 0.85rem; }
  .sidebar-cta { display: block; padding: 0.7rem 1rem; border-radius: 8px; text-decoration: none; font-size: 0.87rem; font-weight: 500; text-align: center; margin-bottom: 0.5rem; transition: transform 0.15s, opacity 0.2s; }
  .sidebar-cta:hover { transform: translateY(-1px); }
  .sidebar-cta.call { background: linear-gradient(135deg, #c9963a, #a07020); color: #000d00; font-weight: 700; }
  .sidebar-cta.whatsapp { background: #25d366; color: white; }
  .sidebar-cta.email { background: rgba(255,255,255,0.05); border: 1px solid rgba(201,150,58,0.2); color: #e8ddd0; }
  .sidebar-cta.maps { background: rgba(255,255,255,0.05); border: 1px solid rgba(201,150,58,0.2); color: #e8ddd0; margin-top: 0.5rem; }
  .sidebar-price { font-size: 1rem; color: #c9963a; font-weight: 600; }
  .sidebar-location { font-size: 0.88rem; color: #e8ddd0; margin-bottom: 0.25rem; }
  .sidebar-landmark { font-size: 0.8rem; color: #8a9a8a; margin-bottom: 0.25rem; }
  .sidebar-city { font-size: 0.8rem; color: #c9963a; margin-bottom: 0.5rem; }
  .share-buttons { display: flex; gap: 0.5rem; }
  .share-btn { flex: 1; padding: 0.6rem; border-radius: 8px; text-decoration: none; font-size: 0.8rem; font-weight: 600; text-align: center; cursor: pointer; border: none; font-family: 'Outfit', sans-serif; transition: opacity 0.2s; }
  .share-btn.wa { background: #25d366; color: white; }
  .share-btn.copy { background: rgba(255,255,255,0.06); border: 1px solid rgba(201,150,58,0.2); color: #c9963a; }

  /* Mobile sticky */
  .mobile-sticky { display: none; position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; padding: 0.75rem 1rem; background: rgba(13,26,13,0.97); border-top: 1px solid rgba(201,150,58,0.15); gap: 0.75rem; }
  .sticky-call { flex: 1; padding: 0.85rem; background: linear-gradient(135deg, #c9963a, #a07020); color: #000d00; text-decoration: none; border-radius: 10px; text-align: center; font-weight: 700; font-size: 0.95rem; }
  .sticky-whatsapp { flex: 1; padding: 0.85rem; background: #25d366; color: white; text-decoration: none; border-radius: 10px; text-align: center; font-weight: 700; font-size: 0.95rem; }

  /* Loading */
  .loading-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 1rem; color: #8a9a8a; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(201,150,58,0.2); border-top-color: #c9963a; border-radius: 50%; animation: spin 0.8s linear infinite; }

  @media (max-width: 900px) {
    .biz-content { grid-template-columns: 1fr; padding: 1.25rem; }
    .biz-sidebar { position: static; }
    .mobile-sticky { display: flex; }
    .biz-page { padding-bottom: 90px; }
    .cta-buttons { display: none; }
    .biz-nav { padding: 0.9rem 1.25rem; }
  }
  @media (max-width: 480px) {
    .biz-name { font-size: 1.6rem; }
    .info-card { padding: 0.85rem 1rem; }
  }
`;

