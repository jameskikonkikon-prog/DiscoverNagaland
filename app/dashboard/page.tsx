'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { CITIES, CATEGORIES } from '@/types';

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
  is_active?: boolean;
  views?: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [form, setForm] = useState<Partial<Business>>({});
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newMenu, setNewMenu] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'photos'>('overview');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single();
      if (data) { setBusiness(data); setForm(data); }
      setLoading(false);
    }
    load();
  }, [router]);

  const update = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    const updates = { ...form };
    if (newPhotos.length > 0) {
      const urls: string[] = [...(business?.photos || [])];
      for (const photo of newPhotos) {
        const ext = photo.name.split('.').pop();
        const path = `${business?.id}/${Date.now()}.${ext}`;
        const { data } = await supabase.storage.from('business-photos').upload(path, photo);
        if (data) {
          const { data: urlData } = supabase.storage.from('business-photos').getPublicUrl(path);
          urls.push(urlData.publicUrl);
        }
      }
      updates.photos = urls;
    }
    if (newMenu) {
      const ext = newMenu.name.split('.').pop();
      const path = `menus/${business?.id}/menu.${ext}`;
      const { data } = await supabase.storage.from('business-photos').upload(path, newMenu, { upsert: true });
      if (data) {
        const { data: urlData } = supabase.storage.from('business-photos').getPublicUrl(path);
        updates.menu_url = urlData.publicUrl;
      }
    }
    const { data } = await supabase.from('businesses').update(updates).eq('id', business?.id).select().single();
    if (data) { setBusiness(data); setForm(data); }
    setNewPhotos([]); setNewMenu(null);
    setSaving(false); setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const removePhoto = async (url: string) => {
    const updated = (business?.photos || []).filter(p => p !== url);
    await supabase.from('businesses').update({ photos: updated }).eq('id', business?.id);
    setBusiness(b => b ? { ...b, photos: updated } : b);
    setForm(f => ({ ...f, photos: updated }));
  };

  if (loading) return (
    <><style>{styles}</style>
    <main className="dash-page"><div className="loading-wrap"><div className="spinner" /><p>Loading…</p></div></main></>
  );

  if (!business) return (
    <><style>{styles}</style>
    <main className="dash-page"><div className="no-listing">
      <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🏪</div>
      <h2>No listing found</h2><p>You haven&apos;t listed a business yet.</p>
      <a href="/register" className="dash-btn primary">List Your Business →</a>
    </div></main></>
  );

  return (
    <><style>{styles}</style>
    <main className="dash-page">
      <div className="dash-topbar">
        <a href="/" className="dash-logo">Discover<span>Nagaland</span></a>
        <div className="dash-topbar-right">
          <a href={`/business/${business.id}`} target="_blank" rel="noopener noreferrer" className="preview-link">View Listing →</a>
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      <div className="dash-content">
        <div className="dash-sidebar">
          <div className="biz-card">
            <div className="biz-card-icon">{business.category?.[0]?.toUpperCase() || '🏪'}</div>
            <div className="biz-card-name">{business.name}</div>
            <div className="biz-card-cat">{business.category} · {business.city}</div>
            {business.is_verified && <div className="verified-tag">✓ Verified</div>}
            <div className={`status-tag ${business.is_active ? 'active' : 'inactive'}`}>
              {business.is_active ? '● Live' : '● Inactive'}
            </div>
          </div>
          <nav className="dash-nav">
            {(['overview','edit','photos'] as const).map((tab) => (
              <button key={tab} className={`dash-nav-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'overview' && '📊 Overview'}
                {tab === 'edit' && '✏️ Edit Details'}
                {tab === 'photos' && '📷 Photos & Menu'}
              </button>
            ))}
          </nav>
        </div>

        <div className="dash-main">

          {activeTab === 'overview' && (
            <div>
              <h2 className="panel-title">Overview</h2>
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon">👁️</div><div className="stat-num">{business.views || 0}</div><div className="stat-label">Total Views</div></div>
                <div className="stat-card"><div className="stat-icon">📷</div><div className="stat-num">{business.photos?.length || 0}</div><div className="stat-label">Photos</div></div>
                <div className="stat-card"><div className="stat-icon">📋</div><div className="stat-num">{business.menu_url ? '✓' : '✗'}</div><div className="stat-label">Menu/Rate Card</div></div>
              </div>
              <div className="checklist">
                <div className="checklist-title">Profile Completeness</div>
                {[
                  {label:'Business name', done:!!business.name},
                  {label:'Address & landmark', done:!!business.address},
                  {label:'Phone number', done:!!business.phone},
                  {label:'WhatsApp number', done:!!business.whatsapp},
                  {label:'Description', done:!!business.description},
                  {label:'Opening hours', done:!!business.opening_hours},
                  {label:'Photos added', done:(business.photos?.length||0)>0},
                  {label:'Menu/rate card uploaded', done:!!business.menu_url},
                  {label:'Pricing set', done:!!(business.price_range||business.price_min)},
                  {label:'Tags/keywords added', done:!!business.tags},
                ].map((item) => (
                  <div key={item.label} className={`check-item ${item.done ? 'done' : ''}`}>
                    <span className="check-icon">{item.done ? '✓' : '○'}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="quick-actions">
                <button className="dash-btn primary" onClick={() => setActiveTab('edit')}>✏️ Edit Details</button>
                <button className="dash-btn secondary" onClick={() => setActiveTab('photos')}>📷 Update Photos</button>
                <a href={`/business/${business.id}`} target="_blank" rel="noopener noreferrer" className="dash-btn secondary">👁️ View Live Listing</a>
              </div>
            </div>
          )}

          {activeTab === 'edit' && (
            <div>
              <h2 className="panel-title">Edit Business Details</h2>
              <div className="edit-grid">
                <div className="form-group"><label className="form-label">Business Name</label><input className="form-input" value={form.name||''} onChange={(e)=>update('name',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.category||''} onChange={(e)=>update('category',e.target.value)}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div className="form-group"><label className="form-label">District</label><select className="form-select" value={form.city||''} onChange={(e)=>update('city',e.target.value)}>{CITIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone||''} onChange={(e)=>update('phone',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">WhatsApp</label><input className="form-input" value={form.whatsapp||''} onChange={(e)=>update('whatsapp',e.target.value)} placeholder="91xxxxxxxxxx" /></div>
                <div className="form-group"><label className="form-label">Website / Social</label><input className="form-input" value={form.website||''} onChange={(e)=>update('website',e.target.value)} /></div>
                <div className="form-group full"><label className="form-label">Address</label><input className="form-input" value={form.address||''} onChange={(e)=>update('address',e.target.value)} /></div>
                <div className="form-group full"><label className="form-label">Landmark</label><input className="form-input" value={form.landmark||''} onChange={(e)=>update('landmark',e.target.value)} /></div>
                <div className="form-group full"><label className="form-label">Opening Hours</label><input className="form-input" value={form.opening_hours||''} onChange={(e)=>update('opening_hours',e.target.value)} placeholder="e.g. Mon–Sat 9am–8pm, Sun Closed" /></div>
                <div className="form-group full"><label className="form-label">Description</label><textarea className="form-textarea" rows={4} value={form.description||''} onChange={(e)=>update('description',e.target.value)} /></div>
                <div className="form-group full"><label className="form-label">Tags / Keywords</label><input className="form-input" value={form.tags||''} onChange={(e)=>update('tags',e.target.value)} placeholder="e.g. veg, delivery, ac, parking" /></div>
              </div>
              {saveSuccess && <div className="success-msg">✓ Changes saved successfully!</div>}
              <button className="dash-btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          )}

          {activeTab === 'photos' && (
            <div>
              <h2 className="panel-title">Photos & Menu</h2>
              <div className="section-subtitle">Current Photos ({business.photos?.length || 0})</div>
              {(business.photos?.length||0) > 0 ? (
                <div className="photos-grid">
                  {business.photos?.map((url,i)=>(
                    <div key={i} className="photo-item">
                      <img src={url} alt={`Photo ${i+1}`} />
                      <button className="photo-remove" onClick={()=>removePhoto(url)}>✕</button>
                    </div>
                  ))}
                </div>
              ) : <p className="no-photos">No photos yet — add some to get 3× more views!</p>}

              <div className="section-subtitle" style={{marginTop:'1.5rem'}}>Add New Photos</div>
              <label className="upload-box" style={{borderColor:newPhotos.length>0?'#c9963a':undefined}}>
                <span style={{fontSize:'1.8rem'}}>{newPhotos.length>0?'✓':'📷'}</span>
                <span style={{color:newPhotos.length>0?'#c9963a':undefined}}>{newPhotos.length>0?`${newPhotos.length} photo${newPhotos.length>1?'s':''} ready`:'Click to choose photos'}</span>
                <span style={{fontSize:'0.72rem',color:'#4a5a4a'}}>JPG or PNG · Max 10MB each</span>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e)=>setNewPhotos(Array.from(e.target.files||[]))} style={{display:'none'}} />
              </label>

              <div className="section-subtitle" style={{marginTop:'1.5rem'}}>
                Menu / Rate Card {business.menu_url && <span style={{color:'#4ade80',fontSize:'0.78rem',marginLeft:'0.5rem'}}>✓ Uploaded</span>}
              </div>
              {business.menu_url && <div style={{marginBottom:'0.75rem'}}><a href={business.menu_url} target="_blank" rel="noopener noreferrer" className="menu-preview-link">View current menu →</a></div>}
              <label className="upload-box" style={{borderColor:newMenu?'#c9963a':undefined}}>
                <span style={{fontSize:'1.8rem'}}>{newMenu?'✓':'📄'}</span>
                <span style={{color:newMenu?'#c9963a':undefined}}>{newMenu?newMenu.name:business.menu_url?'Replace menu':'Upload menu PDF or photo'}</span>
                <span style={{fontSize:'0.72rem',color:'#4a5a4a'}}>PDF, JPG or PNG · Max 20MB</span>
                <input type="file" accept=".pdf,image/*" onChange={(e)=>setNewMenu(e.target.files?.[0]||null)} style={{display:'none'}} />
              </label>

              {saveSuccess && <div className="success-msg">✓ Saved successfully!</div>}
              {(newPhotos.length>0||newMenu) && (
                <button className="dash-btn primary" style={{marginTop:'1rem'}} onClick={handleSave} disabled={saving}>
                  {saving?'Uploading…':'Save & Upload'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </main></>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Outfit:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{background:#0d1a0d;color:#e8ddd0;font-family:'Outfit',sans-serif;min-height:100vh;}
  .dash-page{min-height:100vh;background:#0d1a0d;}
  .dash-topbar{display:flex;align-items:center;justify-content:space-between;padding:1rem 2rem;background:rgba(13,26,13,0.97);border-bottom:1px solid rgba(201,150,58,0.1);position:sticky;top:0;z-index:50;backdrop-filter:blur(12px);}
  .dash-logo{font-family:'Playfair Display',serif;font-size:1.2rem;color:#c9963a;text-decoration:none;font-weight:700;}
  .dash-logo span{color:#e8ddd0;}
  .dash-topbar-right{display:flex;align-items:center;gap:1rem;}
  .preview-link{font-size:0.85rem;color:#c9963a;text-decoration:none;}
  .preview-link:hover{text-decoration:underline;}
  .logout-btn{background:transparent;border:1px solid rgba(201,150,58,0.2);color:#8a9a8a;padding:0.4rem 0.9rem;border-radius:8px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:0.82rem;transition:all 0.2s;}
  .logout-btn:hover{border-color:#c9963a;color:#c9963a;}
  .dash-content{display:grid;grid-template-columns:260px 1fr;min-height:calc(100vh - 57px);}
  .dash-sidebar{background:#1a2e1a;border-right:1px solid rgba(201,150,58,0.08);padding:1.5rem 1rem;}
  .biz-card{background:rgba(0,0,0,0.2);border:1px solid rgba(201,150,58,0.12);border-radius:12px;padding:1.25rem;margin-bottom:1.5rem;text-align:center;}
  .biz-card-icon{width:52px;height:52px;background:rgba(201,150,58,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;color:#c9963a;margin:0 auto 0.75rem;}
  .biz-card-name{font-family:'Playfair Display',serif;font-size:1rem;color:#e8ddd0;margin-bottom:0.3rem;}
  .biz-card-cat{font-size:0.75rem;color:#8a9a8a;margin-bottom:0.75rem;}
  .verified-tag{display:inline-block;background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.2);border-radius:20px;padding:0.2rem 0.6rem;font-size:0.72rem;margin-bottom:0.4rem;}
  .status-tag{display:inline-block;border-radius:20px;padding:0.2rem 0.6rem;font-size:0.72rem;}
  .status-tag.active{background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.2);}
  .status-tag.inactive{background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(248,113,113,0.2);}
  .dash-nav{display:flex;flex-direction:column;gap:0.25rem;}
  .dash-nav-item{background:transparent;border:none;color:#8a9a8a;padding:0.75rem 1rem;border-radius:10px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:0.88rem;text-align:left;transition:all 0.2s;}
  .dash-nav-item:hover{background:rgba(201,150,58,0.06);color:#e8ddd0;}
  .dash-nav-item.active{background:rgba(201,150,58,0.1);color:#c9963a;font-weight:600;}
  .dash-main{padding:2rem;}
  .panel-title{font-family:'Playfair Display',serif;font-size:1.5rem;color:#e8ddd0;margin-bottom:1.5rem;}
  .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem;}
  .stat-card{background:linear-gradient(145deg,#1a2e1a,#152515);border:1px solid rgba(201,150,58,0.12);border-radius:14px;padding:1.25rem;text-align:center;}
  .stat-icon{font-size:1.5rem;margin-bottom:0.5rem;}
  .stat-num{font-family:'Playfair Display',serif;font-size:1.8rem;color:#c9963a;font-weight:700;margin-bottom:0.25rem;}
  .stat-label{font-size:0.75rem;color:#8a9a8a;}
  .checklist{background:linear-gradient(145deg,#1a2e1a,#152515);border:1px solid rgba(201,150,58,0.12);border-radius:14px;padding:1.25rem;margin-bottom:1.5rem;}
  .checklist-title{font-size:0.78rem;color:#c9963a;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;margin-bottom:0.85rem;}
  .check-item{display:flex;align-items:center;gap:0.6rem;padding:0.45rem 0;font-size:0.87rem;color:#6a7a6a;border-bottom:1px solid rgba(255,255,255,0.03);}
  .check-item:last-child{border-bottom:none;}
  .check-item.done{color:#e8ddd0;}
  .check-icon{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;flex-shrink:0;background:rgba(201,150,58,0.05);color:#4a5a4a;}
  .check-item.done .check-icon{background:rgba(74,222,128,0.15);color:#4ade80;}
  .quick-actions{display:flex;gap:0.75rem;flex-wrap:wrap;}
  .dash-btn{padding:0.75rem 1.4rem;border-radius:10px;font-family:'Outfit',sans-serif;font-size:0.88rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;text-align:center;transition:transform 0.15s,opacity 0.2s;border:none;}
  .dash-btn:hover:not(:disabled){transform:translateY(-1px);}
  .dash-btn:disabled{opacity:0.5;cursor:not-allowed;}
  .dash-btn.primary{background:linear-gradient(135deg,#c9963a,#a07020);color:#000d00;}
  .dash-btn.secondary{background:rgba(255,255,255,0.05);border:1px solid rgba(201,150,58,0.2);color:#e8ddd0;}
  .edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;}
  .form-group{}
  .form-group.full{grid-column:1 / -1;}
  .form-label{display:block;font-size:0.74rem;color:#c9963a;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.45rem;font-weight:600;}
  .form-input,.form-select,.form-textarea{width:100%;padding:0.75rem 1rem;background:rgba(0,0,0,0.25);border:1.5px solid rgba(201,150,58,0.15);border-radius:10px;color:#e8ddd0;font-family:'Outfit',sans-serif;font-size:0.92rem;outline:none;transition:border-color 0.2s;}
  .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:#c9963a;}
  .form-select option{background:#1a2e1a;}
  .form-textarea{resize:vertical;line-height:1.55;}
  .success-msg{background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.2);color:#4ade80;padding:0.75rem 1rem;border-radius:8px;font-size:0.85rem;margin-bottom:1rem;}
  .section-subtitle{font-size:0.8rem;color:#c9963a;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:0.75rem;}
  .photos-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:0.5rem;margin-bottom:1rem;}
  .photo-item{position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;}
  .photo-item img{width:100%;height:100%;object-fit:cover;}
  .photo-remove{position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.7);border:none;color:white;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:0.7rem;display:flex;align-items:center;justify-content:center;}
  .no-photos{color:#6a7a6a;font-size:0.87rem;font-style:italic;margin-bottom:1rem;}
  .upload-box{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.4rem;width:100%;padding:1.75rem 1rem;border:2px dashed rgba(201,150,58,0.25);border-radius:12px;color:#8a9a8a;cursor:pointer;transition:border-color 0.2s;text-align:center;}
  .upload-box:hover{border-color:#c9963a;}
  .menu-preview-link{color:#c9963a;text-decoration:none;font-size:0.85rem;}
  .menu-preview-link:hover{text-decoration:underline;}
  .loading-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:1rem;color:#8a9a8a;}
  @keyframes spin{to{transform:rotate(360deg);}}
  .spinner{width:40px;height:40px;border:3px solid rgba(201,150,58,0.2);border-top-color:#c9963a;border-radius:50%;animation:spin 0.8s linear infinite;}
  .no-listing{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;gap:0.75rem;color:#8a9a8a;padding:2rem;}
  .no-listing h2{font-family:'Playfair Display',serif;color:#e8ddd0;font-size:1.5rem;}
  @media(max-width:768px){
    .dash-content{grid-template-columns:1fr;}
    .dash-sidebar{border-right:none;border-bottom:1px solid rgba(201,150,58,0.08);padding:1rem;}
    .dash-nav{flex-direction:row;overflow-x:auto;}
    .stats-grid{grid-template-columns:repeat(3,1fr);gap:0.5rem;}
    .edit-grid{grid-template-columns:1fr;}
    .dash-main{padding:1.25rem;}
  }
`;
