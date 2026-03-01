'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CITIES, CATEGORIES } from '@/types';

const STEPS = ['Business Info', 'Location', 'Contact', 'Details', 'Media', 'Account'];

// Category-specific field definitions
const CATEGORY_FIELDS: Record<string, { label: string; fields: FieldDef[] }> = {
  restaurant: {
    label: '🍽️ Restaurant Details',
    fields: [
      { key: 'price_range', label: 'Price Range', type: 'select', options: ['Budget (under ₹500)', 'Affordable (₹500–₹2000)', 'Mid-range (₹2000–₹5000)'] },
      { key: 'food_type', label: 'Food Type', type: 'select', options: ['Veg only', 'Non-veg', 'Both veg & non-veg'] },
      { key: 'services', label: 'Services', type: 'multicheck', options: ['Delivery', 'Dine-in', 'Takeaway', 'Open late'] },
    ],
  },
  cafe: {
    label: '☕ Cafe Details',
    fields: [
      { key: 'price_range', label: 'Price Range', type: 'select', options: ['Budget (under ₹500)', 'Affordable (₹500–₹2000)', 'Mid-range (₹2000–₹5000)'] },
      { key: 'food_type', label: 'Food Type', type: 'select', options: ['Veg only', 'Non-veg', 'Both veg & non-veg'] },
      { key: 'services', label: 'Services', type: 'multicheck', options: ['Delivery', 'Dine-in', 'Takeaway', 'Open late', 'WiFi'] },
    ],
  },
  pg: {
    label: '🏠 PG Details',
    fields: [
      { key: 'price_per_month', label: 'Price per Month (₹)', type: 'number', placeholder: 'e.g. 4000' },
      { key: 'gender', label: 'For', type: 'select', options: ['Boys only', 'Girls only', 'Both'] },
      { key: 'amenities', label: 'Amenities', type: 'multicheck', options: ['AC', 'WiFi', 'Meals included', 'Attached bathroom', 'Hot water', 'Laundry', 'Parking', 'CCTV'] },
    ],
  },
  hostel: {
    label: '🏠 Hostel Details',
    fields: [
      { key: 'price_per_month', label: 'Price per Month (₹)', type: 'number', placeholder: 'e.g. 4000' },
      { key: 'gender', label: 'For', type: 'select', options: ['Boys only', 'Girls only', 'Both'] },
      { key: 'amenities', label: 'Amenities', type: 'multicheck', options: ['AC', 'WiFi', 'Meals included', 'Attached bathroom', 'Hot water', 'Laundry', 'Parking', 'CCTV'] },
    ],
  },
  hotel: {
    label: '🏨 Hotel Details',
    fields: [
      { key: 'price_per_night', label: 'Price per Night (₹)', type: 'number', placeholder: 'e.g. 1500' },
      { key: 'amenities', label: 'Amenities', type: 'multicheck', options: ['AC', 'Parking', 'WiFi', 'Room service', 'Hot water', 'Restaurant', 'Conference room'] },
    ],
  },
  turf: {
    label: '⚽ Turf Details',
    fields: [
      { key: 'price_per_hour', label: 'Price per Hour (₹)', type: 'number', placeholder: 'e.g. 600' },
      { key: 'sport_type', label: 'Sport Type', type: 'multicheck', options: ['Football', 'Cricket', 'Badminton', 'Multi-sport'] },
      { key: 'type', label: 'Type', type: 'select', options: ['Indoor', 'Outdoor'] },
    ],
  },
  coaching: {
    label: '📚 Coaching Details',
    fields: [
      { key: 'subjects', label: 'Subjects Taught', type: 'text', placeholder: 'e.g. Maths, Science, English' },
      { key: 'board', label: 'Board', type: 'select', options: ['CBSE', 'NBSE', 'NPSC', 'Other'] },
      { key: 'fee_range', label: 'Fee Range', type: 'select', options: ['Budget', 'Affordable', 'Mid-range'] },
      { key: 'batch_timing', label: 'Batch Timing', type: 'multicheck', options: ['Morning', 'Afternoon', 'Evening'] },
    ],
  },
  hospital: {
    label: '🏥 Hospital Details',
    fields: [
      { key: 'speciality', label: 'Speciality', type: 'multicheck', options: ['General', 'Dental', 'Eye', 'Ortho', 'Paediatric', 'Maternity', 'Surgery', 'Other'] },
      { key: 'hours', label: 'Hours', type: 'select', options: ['24 hours', 'Day only'] },
      { key: 'emergency', label: 'Emergency Services', type: 'select', options: ['Yes', 'No'] },
    ],
  },
  clinic: {
    label: '🏥 Clinic Details',
    fields: [
      { key: 'speciality', label: 'Speciality', type: 'multicheck', options: ['General', 'Dental', 'Eye', 'Ortho', 'Paediatric', 'Skin', 'Other'] },
      { key: 'hours', label: 'Hours', type: 'select', options: ['24 hours', 'Day only'] },
      { key: 'emergency', label: 'Emergency Services', type: 'select', options: ['Yes', 'No'] },
    ],
  },
  salon: {
    label: '💈 Salon Details',
    fields: [
      { key: 'for', label: 'For', type: 'select', options: ['Men only', 'Women only', 'Both'] },
      { key: 'services', label: 'Services', type: 'multicheck', options: ['Haircut', 'Facial', 'Bridal', 'Spa', 'Threading', 'Hair color', 'Makeup', 'Nail art'] },
    ],
  },
  school: {
    label: '🏫 School Details',
    fields: [
      { key: 'board', label: 'Board', type: 'select', options: ['CBSE', 'NBSE', 'State board'] },
      { key: 'type', label: 'Type', type: 'select', options: ['Private', 'Government'] },
      { key: 'classes', label: 'Classes', type: 'multicheck', options: ['Nursery to 5', '6 to 10', '11 to 12', 'All classes'] },
    ],
  },
  rental: {
    label: '🚗 Rental Details',
    fields: [
      { key: 'rental_type', label: 'Vehicle Type', type: 'multicheck', options: ['Car', 'Bike', 'Scooter', 'Bicycle', 'Equipment'] },
      { key: 'price_per_day', label: 'Price per Day (₹)', type: 'number', placeholder: 'e.g. 800' },
      { key: 'with_driver', label: 'With Driver', type: 'select', options: ['Yes', 'No', 'Both options'] },
      { key: 'deposit_required', label: 'Deposit Required', type: 'select', options: ['Yes', 'No'] },
      { key: 'availability', label: 'Availability', type: 'select', options: ['Available now', 'Fully booked'] },
    ],
  },
  pharmacy: {
    label: '💊 Pharmacy Details',
    fields: [
      { key: 'hours', label: 'Hours', type: 'select', options: ['24 hours', 'Day only', 'Night only'] },
      { key: 'services', label: 'Services', type: 'multicheck', options: ['Home delivery', 'Online orders', 'Medical equipment'] },
      { key: 'speciality', label: 'Speciality', type: 'select', options: ['General', 'Ayurvedic', 'Homeopathic', 'All'] },
      { key: 'emergency', label: 'Emergency', type: 'select', options: ['Yes', 'No'] },
    ],
  },
  shop: {
    label: '🛍️ Shop Details',
    fields: [
      { key: 'shop_type', label: 'Shop Type', type: 'select', options: ['Clothing', 'Electronics', 'Grocery', 'Furniture', 'Stationery', 'Sports', 'Hardware', 'Other'] },
      { key: 'price_range', label: 'Price Range', type: 'select', options: ['Budget', 'Affordable', 'Mid-range', 'Premium'] },
      { key: 'services', label: 'Services', type: 'multicheck', options: ['Home delivery', 'Custom orders', 'Wholesale available'] },
    ],
  },
};

type FieldDef = {
  key: string;
  label: string;
  type: 'select' | 'multicheck' | 'number' | 'text';
  options?: string[];
  placeholder?: string;
};

function CategoryFields({ category, values, onChange }: {
  category: string;
  values: Record<string, string | string[]>;
  onChange: (key: string, val: string | string[]) => void;
}) {
  const cat = category.toLowerCase();
  const config = CATEGORY_FIELDS[cat];
  if (!config) return null;

  const toggleMulti = (key: string, option: string) => {
    const current = (values[key] as string[]) || [];
    const updated = current.includes(option) ? current.filter(o => o !== option) : [...current, option];
    onChange(key, updated);
  };

  return (
    <div className="cat-fields-wrap">
      <div className="cat-fields-title">{config.label}</div>
      {config.fields.map(field => (
        <div key={field.key} className="form-group">
          <label className="form-label">{field.label}</label>
          {field.type === 'select' && (
            <select className="form-select" value={(values[field.key] as string) || ''} onChange={e => onChange(field.key, e.target.value)}>
              <option value="">Select…</option>
              {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {field.type === 'multicheck' && (
            <div className="tags-wrap">
              {field.options?.map(o => {
                const selected = ((values[field.key] as string[]) || []).includes(o);
                return (
                  <button key={o} type="button" className={`tag-btn ${selected ? 'selected' : ''}`} onClick={() => toggleMulti(field.key, o)}>
                    {selected ? '✓ ' : '+ '}{o}
                  </button>
                );
              })}
            </div>
          )}
          {field.type === 'number' && (
            <input className="form-input" type="number" value={(values[field.key] as string) || ''} onChange={e => onChange(field.key, e.target.value)} placeholder={field.placeholder} />
          )}
          {field.type === 'text' && (
            <input className="form-input" type="text" value={(values[field.key] as string) || ''} onChange={e => onChange(field.key, e.target.value)} placeholder={field.placeholder} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', category: '', city: '', address: '', landmark: '',
    phone: '', whatsapp: '', website: '',
    description: '', opening_hours: '',
  });
  const [customFields, setCustomFields] = useState<Record<string, string | string[]>>({});
  const [account, setAccount] = useState({ email: '', password: '', confirm: '' });
  const [photos, setPhotos] = useState<File[]>([]);
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));
  const updateCustom = (key: string, val: string | string[]) => setCustomFields(f => ({ ...f, [key]: val }));

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

  const uploadMenu = async (businessId: string) => {
    if (!menuFile) return null;
    const ext = menuFile.name.split('.').pop();
    const path = `menus/${businessId}/menu.${ext}`;
    const { data } = await supabase.storage.from('business-photos').upload(path, menuFile);
    if (data) {
      const { data: urlData } = supabase.storage.from('business-photos').getPublicUrl(path);
      return urlData.publicUrl;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (account.password !== account.confirm) { setError("Passwords don't match!"); return; }
    if (account.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError('');
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email: account.email, password: account.password });
      if (authErr) throw authErr;
      const user = authData.user;
      if (!user) throw new Error('Account creation failed');

      const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slug, email: account.email, owner_id: user.id, custom_fields: customFields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create listing');

      const businessId = data.business.id;
      const updates: Record<string, unknown> = {};
      if (photos.length > 0) updates.photos = await uploadPhotos(businessId);
      if (menuFile) updates.menu_url = await uploadMenu(businessId);
      if (Object.keys(updates).length > 0) {
        await fetch(`/api/businesses/${businessId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
    setLoading(false);
  };

  const canNext = [
    !!(form.name && form.category),
    !!(form.city && form.address),
    !!form.phone,
    true, true,
    !!(account.email && account.password && account.confirm),
  ];

  if (submitted) return (
    <>
      <style>{styles}</style>
      <main className="reg-page">
        <div className="reg-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#c9963a', marginBottom: '0.75rem' }}>You&apos;re Listed!</h1>
          <p style={{ color: '#8a9a8a', marginBottom: '2rem', lineHeight: '1.6' }}>Your business is now live on Discover Nagaland. Use your email and password to log in and manage your listing anytime.</p>
          <a href="/login" className="btn-next" style={{ display: 'inline-block', textDecoration: 'none', padding: '0.85rem 2rem' }}>Go to Login →</a>
        </div>
      </main>
    </>
  );

  return (
    <>
      <style>{styles}</style>
      <main className="reg-page">
        <div className="reg-brand">
          <a href="/">Discover<span>Nagaland</span></a>
          <p>List Your Business — It&apos;s Free</p>
        </div>

        <div className="stepper">
          {STEPS.map((s, i) => (
            <div key={s} className={`step-item ${i < step ? 'done' : i === step ? 'active' : ''}`}>
              <div className="step-bubble">{i < step ? '✓' : i + 1}</div>
              <span className="step-label">{s}</span>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>

        <div className="reg-card">
          <div className="step-heading">
            <h2>{STEPS[step]}</h2>
            <p>
              {step === 0 && 'Tell us about your business.'}
              {step === 1 && 'Where is your business located?'}
              {step === 2 && 'How can customers reach you?'}
              {step === 3 && 'Fill in details specific to your business type.'}
              {step === 4 && 'Add photos to attract more customers.'}
              {step === 5 && 'Create your account to manage your listing.'}
            </p>
          </div>

          {step === 0 && (
            <div className="step-content">
              <div className="form-group">
                <label className="form-label">Business Name *</label>
                <input className="form-input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Naga Kitchen" />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-select" value={form.category} onChange={e => { update('category', e.target.value); setCustomFields({}); }}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="Tell customers what makes your business special..." />
              </div>
              <div className="form-group">
                <label className="form-label">Opening Hours</label>
                <input className="form-input" value={form.opening_hours} onChange={e => update('opening_hours', e.target.value)} placeholder="e.g. Mon–Sat 9am–8pm, Sun Closed" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="step-content">
              <div className="form-group">
                <label className="form-label">District *</label>
                <select className="form-select" value={form.city} onChange={e => update('city', e.target.value)}>
                  <option value="">Select district</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Address *</label>
                <input className="form-input" value={form.address} onChange={e => update('address', e.target.value)} placeholder="e.g. New NST Colony, Kohima" />
              </div>
              <div className="form-group">
                <label className="form-label">Nearby Landmark</label>
                <input className="form-input" value={form.landmark} onChange={e => update('landmark', e.target.value)} placeholder="e.g. Opposite NST Bus Stand" />
                <p className="form-note">Landmarks help customers find you faster!</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input className="form-input" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="9xxxxxxxxx" />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp Number</label>
                <input className="form-input" value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="91xxxxxxxxxx (with country code)" />
              </div>
              <div className="form-group">
                <label className="form-label">Website / Facebook / Instagram</label>
                <input className="form-input" value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://facebook.com/yourbusiness" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-content">
              {CATEGORY_FIELDS[form.category.toLowerCase()] ? (
                <CategoryFields category={form.category} values={customFields} onChange={updateCustom} />
              ) : (
                <div className="no-fields-msg">
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                  <p>No extra details needed for <strong>{form.category}</strong>.</p>
                  <p style={{ fontSize: '0.82rem', color: '#6a7a6a', marginTop: '0.3rem' }}>Click Continue to add photos.</p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="step-content">
              <div className="form-group">
                <label className="form-label">📷 Business Photos</label>
                <p className="form-note" style={{ marginBottom: '0.75rem' }}>Businesses with photos get <strong style={{ color: '#c9963a' }}>3× more views</strong>!</p>
                <label className="upload-box" style={{ borderColor: photos.length > 0 ? '#c9963a' : undefined, color: photos.length > 0 ? '#c9963a' : undefined }}>
                  <span className="upload-icon">{photos.length > 0 ? '✓' : '📷'}</span>
                  <span>{photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''} selected` : 'Click to choose photos'}</span>
                  <span className="upload-sub">JPG or PNG · Max 10MB each</span>
                  <input type="file" multiple accept="image/*" onChange={e => setPhotos(Array.from(e.target.files || []))} style={{ display: 'none' }} />
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">📄 Menu / Price List / Rate Card</label>
                <label className="upload-box" style={{ borderColor: menuFile ? '#c9963a' : undefined, color: menuFile ? '#c9963a' : undefined }}>
                  <span className="upload-icon">{menuFile ? '✓' : '📄'}</span>
                  <span>{menuFile ? menuFile.name : 'Upload PDF or photo (optional)'}</span>
                  <span className="upload-sub">PDF, JPG or PNG · Max 20MB</span>
                  <input type="file" accept=".pdf,image/*" onChange={e => setMenuFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="step-content">
              <div className="account-info-box">
                <div>🔐</div>
                <div><strong>Almost done!</strong> Create an account to manage your listing — edit details, update photos, and see who&apos;s finding you.</div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-input" type="email" value={account.email} onChange={e => setAccount({ ...account, email: e.target.value })} placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={account.password} onChange={e => setAccount({ ...account, password: e.target.value })} placeholder="At least 6 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input className="form-input" type="password" value={account.confirm} onChange={e => setAccount({ ...account, confirm: e.target.value })} placeholder="Same password again" />
                {account.confirm && account.password !== account.confirm && (
                  <p className="form-note" style={{ color: '#f87171', marginTop: '0.4rem' }}>⚠ Passwords don&apos;t match</p>
                )}
              </div>
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}

          <div className="btn-row">
            {step > 0 && <button className="btn-back" onClick={() => setStep(step - 1)}>← Back</button>}
            {step < 5 ? (
              <button className="btn-next" onClick={() => setStep(step + 1)} disabled={!canNext[step]}>Continue →</button>
            ) : (
              <button className="btn-next" onClick={handleSubmit} disabled={loading || !canNext[5] || account.password !== account.confirm}>
                {loading ? 'Creating listing…' : 'Create Listing 🎉'}
              </button>
            )}
          </div>
        </div>
        <div className="login-link">Already have an account? <a href="/login">Sign in →</a></div>
      </main>
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1a0d; color: #e8ddd0; font-family: 'Outfit', sans-serif; min-height: 100vh; }
  .reg-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 3rem 1.5rem 4rem; background: radial-gradient(ellipse at 20% 0%, rgba(201,150,58,0.06) 0%, transparent 50%), #0d1a0d; }
  .reg-brand { text-align: center; margin-bottom: 2.5rem; }
  .reg-brand a { font-family: 'Playfair Display', serif; font-size: 1.7rem; color: #e8ddd0; text-decoration: none; }
  .reg-brand a span { color: #c9963a; }
  .reg-brand p { font-size: 0.8rem; color: #8a9a8a; margin-top: 0.3rem; letter-spacing: 0.1em; text-transform: uppercase; }
  .stepper { display: flex; align-items: flex-start; margin-bottom: 2rem; width: 100%; max-width: 600px; }
  .step-item { display: flex; flex-direction: column; align-items: center; position: relative; gap: 0.35rem; flex: 1; }
  .step-line { position: absolute; top: 17px; left: 50%; width: 100%; height: 2px; background: rgba(201,150,58,0.15); z-index: 0; }
  .step-item.done .step-line, .step-item.active .step-line { background: rgba(201,150,58,0.4); }
  .step-bubble { width: 34px; height: 34px; border-radius: 50%; border: 2px solid rgba(201,150,58,0.2); background: #0d1a0d; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 600; color: #8a9a8a; z-index: 1; position: relative; transition: all 0.3s; }
  .step-item.active .step-bubble { border-color: #c9963a; color: #c9963a; background: rgba(201,150,58,0.1); box-shadow: 0 0 0 4px rgba(201,150,58,0.08); }
  .step-item.done .step-bubble { border-color: #c9963a; background: #c9963a; color: #000d00; }
  .step-label { font-size: 0.62rem; color: #6a7a6a; text-align: center; white-space: nowrap; transition: color 0.3s; }
  .step-item.active .step-label { color: #c9963a; }
  .step-item.done .step-label { color: #8a9a8a; }
  .reg-card { background: linear-gradient(145deg, #1a2e1a, #152515); border: 1px solid rgba(201,150,58,0.15); border-radius: 18px; padding: 2.25rem; width: 100%; max-width: 600px; box-shadow: 0 24px 64px rgba(0,0,0,0.5); position: relative; overflow: hidden; }
  .reg-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #c9963a, transparent); }
  .step-heading { margin-bottom: 1.75rem; }
  .step-heading h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: #e8ddd0; margin-bottom: 0.3rem; }
  .step-heading p { color: #8a9a8a; font-size: 0.87rem; }
  @keyframes stepIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
  .step-content { animation: stepIn 0.22s ease; }
  .form-group { margin-bottom: 1.2rem; }
  .form-label { display: block; font-size: 0.74rem; color: #c9963a; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.45rem; font-weight: 600; }
  .form-note { font-size: 0.76rem; color: #6a7a6a; margin-top: 0.35rem; line-height: 1.4; }
  .form-input, .form-select, .form-textarea { width: 100%; padding: 0.8rem 1rem; background: rgba(0,0,0,0.25); border: 1.5px solid rgba(201,150,58,0.15); border-radius: 10px; color: #e8ddd0; font-family: 'Outfit', sans-serif; font-size: 0.95rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
  .form-input::placeholder, .form-textarea::placeholder { color: #3a4a3a; }
  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: #c9963a; box-shadow: 0 0 0 3px rgba(201,150,58,0.1); }
  .form-select option { background: #1a2e1a; }
  .form-textarea { resize: vertical; min-height: 90px; line-height: 1.55; }
  .cat-fields-wrap { background: rgba(201,150,58,0.05); border: 1px solid rgba(201,150,58,0.15); border-radius: 12px; padding: 1.25rem; }
  .cat-fields-title { font-size: 0.88rem; font-weight: 600; color: #c9963a; margin-bottom: 1.25rem; }
  .tags-wrap { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .tag-btn { padding: 0.4rem 0.85rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(201,150,58,0.15); border-radius: 20px; color: #8a9a8a; font-family: 'Outfit', sans-serif; font-size: 0.78rem; cursor: pointer; transition: all 0.2s; }
  .tag-btn:hover { border-color: rgba(201,150,58,0.4); color: #c9963a; }
  .tag-btn.selected { background: rgba(201,150,58,0.12); border-color: #c9963a; color: #c9963a; }
  .no-fields-msg { text-align: center; padding: 2rem 1rem; color: #8a9a8a; }
  .no-fields-msg strong { color: #e8ddd0; }
  .upload-box { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.4rem; width: 100%; padding: 1.75rem 1rem; border: 2px dashed rgba(201,150,58,0.25); border-radius: 12px; color: #8a9a8a; cursor: pointer; transition: border-color 0.2s, color 0.2s; text-align: center; }
  .upload-box:hover { border-color: #c9963a; color: #c9963a; }
  .upload-icon { font-size: 1.8rem; }
  .upload-sub { font-size: 0.72rem; color: #4a5a4a; margin-top: 0.2rem; }
  .account-info-box { display: flex; gap: 0.75rem; background: rgba(201,150,58,0.07); border: 1px solid rgba(201,150,58,0.15); border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem; font-size: 0.85rem; color: #8a9a8a; line-height: 1.5; }
  .account-info-box strong { color: #e8ddd0; }
  .error-msg { background: rgba(180,40,40,0.12); border: 1px solid rgba(180,40,40,0.3); border-radius: 8px; padding: 0.7rem 1rem; font-size: 0.85rem; color: #ff8080; margin-top: 1rem; }
  .btn-row { display: flex; gap: 0.75rem; margin-top: 1.75rem; }
  .btn-back { flex: 0 0 auto; padding: 0.85rem 1.4rem; background: transparent; border: 1.5px solid rgba(201,150,58,0.2); border-radius: 10px; color: #8a9a8a; font-family: 'Outfit', sans-serif; font-size: 0.95rem; cursor: pointer; transition: border-color 0.2s, color 0.2s; }
  .btn-back:hover { border-color: #c9963a; color: #c9963a; }
  .btn-next { flex: 1; padding: 0.85rem; background: linear-gradient(135deg, #c9963a 0%, #a07020 100%); border: none; border-radius: 10px; color: #000d00; font-family: 'Outfit', sans-serif; font-size: 1rem; font-weight: 700; cursor: pointer; transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s; }
  .btn-next:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(201,150,58,0.35); }
  .btn-next:disabled { opacity: 0.45; cursor: not-allowed; }
  .login-link { margin-top: 1.5rem; font-size: 0.85rem; color: #8a9a8a; }
  .login-link a { color: #c9963a; text-decoration: none; }
  .login-link a:hover { text-decoration: underline; }
  @media (max-width: 480px) {
    .reg-card { padding: 1.5rem 1.1rem; }
    .step-label { display: none; }
    .reg-page { padding: 2rem 1rem 3rem; }
  }
`;
