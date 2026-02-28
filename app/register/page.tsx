'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CITIES, CATEGORIES } from '@/types';

const STEPS = ['Business Info', 'Location', 'Contact', 'Description', 'Photos', 'Done'];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    category: '',
    city: '',
    address: '',
    landmark: '',
    phone: '',
    whatsapp: '',
    email: '',
    description: '',
    opening_hours: '',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const uploadPhotos = async (businessId: string) => {
    const urls: string[] = [];
    for (const photo of photos) {
      const ext = photo.name.split('.').pop();
      const path = `${businessId}/${Date.now()}.${ext}`;
      const { data } = await supabase.storage.from('business-photos').upload(path, photo);
      if (data) {
        const { data: urlData } = supabase.storage.from('business-photos').getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }

    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, owner_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create listing');

      if (photos.length > 0) {
        const photoUrls = await uploadPhotos(data.business.id);
        await fetch(`/api/businesses/${data.business.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: photoUrls }),
        });
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
    setLoading(false);
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (submitted) {
    return (
      <>
        <style>{globalStyles}</style>
        <main className="reg-page">
          <div className="reg-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#c9963a', marginBottom: '0.75rem' }}>
              You&apos;re Listed!
            </h1>
            <p style={{ color: '#8a9a8a', marginBottom: '2rem', lineHeight: '1.6' }}>
              Your business is now live on Discover Nagaland.
            </p>
            <a href="/dashboard" className="btn-next" style={{ display: 'inline-block', textDecoration: 'none', padding: '0.85rem 2rem' }}>
              Go to Dashboard →
            </a>
          </div>
        </main>
      </>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{globalStyles}</style>
      <main className="reg-page">

        {/* Brand */}
        <div className="reg-brand">
          <a href="/">Discover<span>Nagaland</span></a>
          <p>List Your Business</p>
        </div>

        {/* Stepper */}
        <div className="stepper">
          {STEPS.slice(0, -1).map((s, i) => (
            <div key={s} className={`step-item ${i < step ? 'done' : i === step ? 'active' : ''}`}>
              <div className="step-bubble">
                {i < step ? '✓' : i + 1}
              </div>
              <span className="step-label">{s}</span>
              {i < STEPS.length - 2 && <div className="step-line" />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="reg-card">
          <div className="step-heading">
            <h2>{STEPS[step]}</h2>
            <p>
              {step === 0 && 'What kind of business are you listing?'}
              {step === 1 && 'Where is your business located?'}
              {step === 2 && 'How can customers reach you?'}
              {step === 3 && 'Tell customers what makes you special.'}
              {step === 4 && 'Add photos to attract more customers.'}
            </p>
          </div>

          {/* Step 0 — Business Info */}
          {step === 0 && (
            <div className="step-content">
              <div className="form-group">
                <label className="form-label">Business Name *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. Naga Kitchen"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-select"
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 1 — Location */}
          {step === 1 && (
            <div className="step-content">
              <div className="form-group">
                <label className="form-label">District *</label>
                <select
                  className="form-select"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                >
                  <option value="">Select district</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Address *</label>
                <input
                  className="form-input"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  placeholder="e.g. Near DC Court, New NST Colony"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nearby Landmark</label>
                <input
                  className="form-input"
                  value={form.landmark}
                  onChange={(e) => update('landmark', e.target.value)}
                  placeholder="e.g. PR Hill, Naga Bazaar"
                />
              </div>
            </div>
          )}

          {/* Step 2 — Contact */}
          {step === 2 && (
            <div className="step-content">
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="9xxxxxxxxx"
                />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp Number</label>
                <input
                  className="form-input"
                  value={form.whatsapp}
                  onChange={(e) => update('whatsapp', e.target.value)}
                  placeholder="91xxxxxxxxxx (with country code)"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="business@email.com"
                />
              </div>
            </div>
          )}

          {/* Step 3 — Description */}
          {step === 3 && (
            <div className="step-content">
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  rows={4}
                  placeholder="Tell customers what makes your business special..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Opening Hours</label>
                <input
                  className="form-input"
                  value={form.opening_hours}
                  onChange={(e) => update('opening_hours', e.target.value)}
                  placeholder="e.g. Mon-Sat 9am–8pm"
                />
              </div>
            </div>
          )}

          {/* Step 4 — Photos */}
          {step === 4 && (
            <div className="step-content">
              <p style={{ color: '#8a9a8a', fontSize: '0.88rem', marginBottom: '1rem' }}>
                Upload photos of your business (optional)
              </p>
              <label className="photo-upload-label">
                <span>📷 Click to choose photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setPhotos(Array.from(e.target.files || []))}
                  style={{ display: 'none' }}
                />
              </label>
              {photos.length > 0 && (
                <p style={{ color: '#c9963a', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                  ✓ {photos.length} photo{photos.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}

          {/* Navigation buttons */}
          <div className="btn-row">
            {step > 0 && (
              <button className="btn-back" onClick={() => setStep(step - 1)}>
                ← Back
              </button>
            )}
            {step < 4 ? (
              <button
                className="btn-next"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 0 && (!form.name || !form.category)) ||
                  (step === 1 && (!form.city || !form.address)) ||
                  (step === 2 && !form.phone)
                }
              >
                Continue →
              </button>
            ) : (
              <button
                className="btn-next"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Creating…' : 'Create Listing 🎉'}
              </button>
            )}
          </div>
        </div>

        <div className="login-link">
          Already have an account? <a href="/login">Sign in →</a>
        </div>
      </main>
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #0d1a0d;
    color: #e8ddd0;
    font-family: 'Outfit', sans-serif;
    min-height: 100vh;
  }

  .reg-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 3rem 1.5rem 4rem;
    background:
      radial-gradient(ellipse at 20% 0%, rgba(201,150,58,0.06) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 100%, rgba(201,150,58,0.04) 0%, transparent 50%),
      #0d1a0d;
  }

  .reg-brand {
    text-align: center;
    margin-bottom: 2.5rem;
  }
  .reg-brand a {
    font-family: 'Playfair Display', serif;
    font-size: 1.7rem;
    color: #e8ddd0;
    text-decoration: none;
    letter-spacing: 0.02em;
  }
  .reg-brand a span { color: #c9963a; }
  .reg-brand p {
    font-size: 0.8rem;
    color: #8a9a8a;
    margin-top: 0.3rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .stepper {
    display: flex;
    align-items: flex-start;
    margin-bottom: 2rem;
    width: 100%;
    max-width: 520px;
    justify-content: center;
  }
  .step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    gap: 0.35rem;
    flex: 1;
  }
  .step-line {
    position: absolute;
    top: 17px;
    left: 50%;
    width: 100%;
    height: 2px;
    background: rgba(201,150,58,0.15);
    z-index: 0;
  }
  .step-item.done .step-line,
  .step-item.active .step-line {
    background: rgba(201,150,58,0.4);
  }
  .step-bubble {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2px solid rgba(201,150,58,0.2);
    background: #0d1a0d;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 600;
    color: #8a9a8a;
    z-index: 1;
    position: relative;
    transition: all 0.3s;
  }
  .step-item.active .step-bubble {
    border-color: #c9963a;
    color: #c9963a;
    background: rgba(201,150,58,0.1);
    box-shadow: 0 0 0 4px rgba(201,150,58,0.08);
  }
  .step-item.done .step-bubble {
    border-color: #c9963a;
    background: #c9963a;
    color: #000d00;
  }
  .step-label {
    font-size: 0.65rem;
    color: #6a7a6a;
    text-align: center;
    white-space: nowrap;
    transition: color 0.3s;
  }
  .step-item.active .step-label { color: #c9963a; }
  .step-item.done .step-label { color: #8a9a8a; }

  .reg-card {
    background: linear-gradient(145deg, #1a2e1a, #152515);
    border: 1px solid rgba(201,150,58,0.15);
    border-radius: 18px;
    padding: 2.25rem;
    width: 100%;
    max-width: 520px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    position: relative;
    overflow: hidden;
  }
  .reg-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #c9963a, transparent);
  }

  .step-heading { margin-bottom: 1.75rem; }
  .step-heading h2 {
    font-family: 'Playfair Display', serif;
    font-size: 1.5rem;
    color: #e8ddd0;
    margin-bottom: 0.3rem;
  }
  .step-heading p { color: #8a9a8a; font-size: 0.87rem; }

  @keyframes stepIn {
    from { opacity: 0; transform: translateX(12px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .step-content { animation: stepIn 0.22s ease; }

  .form-group { margin-bottom: 1.2rem; }
  .form-label {
    display: block;
    font-size: 0.74rem;
    color: #c9963a;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 0.45rem;
    font-weight: 600;
  }
  .form-input, .form-select, .form-textarea {
    width: 100%;
    padding: 0.8rem 1rem;
    background: rgba(0,0,0,0.25);
    border: 1.5px solid rgba(201,150,58,0.15);
    border-radius: 10px;
    color: #e8ddd0;
    font-family: 'Outfit', sans-serif;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .form-input::placeholder, .form-textarea::placeholder { color: #3a4a3a; }
  .form-input:focus, .form-select:focus, .form-textarea:focus {
    border-color: #c9963a;
    box-shadow: 0 0 0 3px rgba(201,150,58,0.1);
  }
  .form-select option { background: #1a2e1a; }
  .form-textarea { resize: vertical; min-height: 100px; line-height: 1.55; }

  .photo-upload-label {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 2rem;
    border: 2px dashed rgba(201,150,58,0.25);
    border-radius: 12px;
    color: #8a9a8a;
    cursor: pointer;
    font-size: 0.95rem;
    transition: border-color 0.2s, color 0.2s;
  }
  .photo-upload-label:hover { border-color: #c9963a; color: #c9963a; }

  .error-msg {
    background: rgba(180,40,40,0.12);
    border: 1px solid rgba(180,40,40,0.3);
    border-radius: 8px;
    padding: 0.7rem 1rem;
    font-size: 0.85rem;
    color: #ff8080;
    margin-top: 1rem;
  }

  .btn-row { display: flex; gap: 0.75rem; margin-top: 1.75rem; }
  .btn-back {
    flex: 0 0 auto;
    padding: 0.85rem 1.4rem;
    background: transparent;
    border: 1.5px solid rgba(201,150,58,0.2);
    border-radius: 10px;
    color: #8a9a8a;
    font-family: 'Outfit', sans-serif;
    font-size: 0.95rem;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }
  .btn-back:hover { border-color: #c9963a; color: #c9963a; }
  .btn-next {
    flex: 1;
    padding: 0.85rem;
    background: linear-gradient(135deg, #c9963a 0%, #a07020 100%);
    border: none;
    border-radius: 10px;
    color: #000d00;
    font-family: 'Outfit', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
  }
  .btn-next:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(201,150,58,0.35);
  }
  .btn-next:disabled { opacity: 0.45; cursor: not-allowed; }

  .login-link {
    margin-top: 1.5rem;
    font-size: 0.85rem;
    color: #8a9a8a;
  }
  .login-link a { color: #c9963a; text-decoration: none; }
  .login-link a:hover { text-decoration: underline; }

  @media (max-width: 480px) {
    .reg-card { padding: 1.5rem 1.1rem; }
    .step-label { display: none; }
    .reg-page { padding: 2rem 1rem 3rem; }
  }
`;
