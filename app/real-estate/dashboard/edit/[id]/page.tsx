'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useParams } from 'next/navigation'

const FIELDS = {
  title: '', property_type: '', listing_type: '', city: '', locality: '',
  landmark: '', price: '', price_unit: '', area: '', area_unit: '',
  description: '', posted_by_name: '', phone: '', whatsapp: '',
}
type FormKey = keyof typeof FIELDS

const MAX_PHOTOS = 10

export default function EditPropertyPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [form, setForm] = useState(FIELDS)
  const [errors, setErrors] = useState<Partial<typeof FIELDS>>({})
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [brokenThumbs, setBrokenThumbs] = useState<Set<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .eq('owner_id', session.user.id)
        .single()

      if (!data) { setNotFound(true); setLoading(false); return }

      setForm({
        title: data.title ?? '',
        property_type: data.property_type ?? '',
        listing_type: data.listing_type ?? '',
        city: data.city ?? '',
        locality: data.locality ?? '',
        landmark: data.landmark ?? '',
        price: data.price != null ? String(data.price) : '',
        price_unit: data.price_unit ?? '',
        area: data.area != null ? String(data.area) : '',
        area_unit: data.area_unit ?? '',
        description: data.description ?? '',
        posted_by_name: data.posted_by_name ?? '',
        phone: data.phone ?? '',
        whatsapp: data.whatsapp ?? '',
      })
      setPhotos(Array.isArray(data.photos) ? data.photos : [])
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handlePhotoFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    if (photos.length + files.length > MAX_PHOTOS) { setUploadError(`Max ${MAX_PHOTOS} photos allowed`); return }
    setUploading(true)
    setUploadError('')
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) setUploadError(json.error ?? 'Upload failed. Please try again.')
      else setPhotos(prev => [...prev, ...json.urls])
    } catch { setUploadError('Network error during upload. Please try again.') }
    finally { setUploading(false) }
  }

  function set(field: FormKey, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  function validate() {
    const next: Partial<typeof FIELDS> = {}
    if (!form.title.trim()) next.title = 'Required'
    if (!form.property_type) next.property_type = 'Select a type'
    if (!form.listing_type) next.listing_type = 'Select sale or rent'
    if (!form.city.trim()) next.city = 'Required'
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) next.price = 'Enter a valid price'
    return next
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)
    setApiError('')
    try {
      const res = await fetch('/api/real-estate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...form, photos: photos.length ? photos : undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return }
        setApiError(json.error ?? 'Something went wrong. Please try again.')
      } else {
        setSuccess(true)
      }
    } catch { setApiError('Network error. Please check your connection and try again.') }
    finally { setSubmitting(false) }
  }

  const inp = (field: FormKey, extra?: React.InputHTMLAttributes<HTMLInputElement>) => ({
    className: 'aw-input' + (errors[field] ? ' aw-input-err' : ''),
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(field, e.target.value),
    ...extra,
  })
  const sel = (field: FormKey) => ({
    className: 'aw-select' + (errors[field] ? ' aw-input-err' : ''),
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => set(field, e.target.value),
  })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: "'Sora', sans-serif", color: 'var(--white)' }}>
      <style>{`
        :root{--bg:#0a0a0a;--bg2:#111111;--bg3:#161616;--bg4:#1e1e1e;--border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);--white:#ffffff;--off:rgba(255,255,255,0.85);--muted:rgba(255,255,255,0.38);--red:#c0392b;--red2:#a93226;--red-bg:rgba(192,57,43,0.08);--teal:rgba(59,168,143,0.9);}
        body{background:var(--bg);margin:0;padding:0;}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 60% 50% at 20% 0%,rgba(139,0,0,0.08) 0%,transparent 60%);pointer-events:none;z-index:0;}
        .an{position:sticky;top:0;z-index:50;background:rgba(10,10,10,0.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;}
        .an-left{display:flex;align-items:center;gap:8px;}
        .an-logo{font-size:14px;font-weight:700;color:var(--white);text-decoration:none;}
        .an-sep{color:var(--muted);font-size:12px;}
        .an-crumb{font-size:13px;color:var(--muted);text-decoration:none;transition:color 0.15s;}
        .an-crumb:hover{color:var(--off);}
        .an-tag{font-size:11.5px;font-weight:600;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.25);padding:3px 10px;border-radius:999px;}
        .an-back{font-size:13px;color:var(--muted);text-decoration:none;transition:color 0.15s;}
        .an-back:hover{color:var(--off);}
        .aw{position:relative;z-index:1;max-width:720px;margin:0 auto;padding:48px 24px 80px;}
        .aw-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.2);padding:5px 13px;border-radius:999px;margin-bottom:16px;}
        .aw-title{font-size:clamp(22px,3.5vw,30px);font-weight:800;letter-spacing:-0.025em;color:var(--white);margin-bottom:6px;}
        .aw-sub{font-size:13.5px;color:var(--muted);line-height:1.6;margin-bottom:36px;}
        .aw-group{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;}
        .aw-group-label{font-size:10.5px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:16px;}
        .aw-row{display:grid;gap:14px;margin-bottom:14px;}
        .aw-row:last-child{margin-bottom:0;}
        .aw-row.cols2{grid-template-columns:1fr 1fr;}
        .aw-field{display:flex;flex-direction:column;gap:5px;}
        .aw-label{font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.55);letter-spacing:0.02em;}
        .aw-hint{font-size:11px;color:rgba(255,255,255,0.25);margin-top:2px;}
        .aw-err{font-size:11px;color:#e05a4a;margin-top:3px;}
        .aw-input{background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;font-size:14px;font-family:'Sora',sans-serif;color:var(--white);outline:none;transition:border-color 0.15s;width:100%;box-sizing:border-box;}
        .aw-input::placeholder{color:var(--muted);}
        .aw-input:focus{border-color:rgba(192,57,43,0.4);}
        .aw-input-err{border-color:rgba(224,90,74,0.5) !important;}
        .aw-select{background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;font-size:14px;font-family:'Sora',sans-serif;color:var(--white);outline:none;transition:border-color 0.15s;width:100%;box-sizing:border-box;cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.3)' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;}
        .aw-select:focus{border-color:rgba(192,57,43,0.4);}
        .aw-select option{background:var(--bg3);}
        .aw-textarea{background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;font-size:14px;font-family:'Sora',sans-serif;color:var(--white);outline:none;transition:border-color 0.15s;width:100%;box-sizing:border-box;resize:vertical;min-height:96px;line-height:1.6;}
        .aw-textarea::placeholder{color:var(--muted);}
        .aw-textarea:focus{border-color:rgba(192,57,43,0.4);}
        .aw-photo-area{background:var(--bg3);border:1.5px dashed var(--border2);border-radius:12px;padding:22px 20px;text-align:center;transition:border-color 0.15s;cursor:pointer;display:block;}
        .aw-photo-area:hover{border-color:rgba(192,57,43,0.35);}
        .aw-photo-icon{font-size:24px;margin-bottom:8px;}
        .aw-photo-label{font-size:13px;font-weight:600;color:var(--off);margin-bottom:4px;}
        .aw-photo-sub{font-size:11.5px;color:var(--muted);}
        .aw-photo-btn{display:inline-block;margin-top:12px;font-size:12px;font-weight:600;color:#fff;background:var(--red);border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-family:'Sora',sans-serif;transition:background 0.15s;pointer-events:none;}
        .aw-photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px;margin-bottom:12px;}
        .aw-thumb{position:relative;border-radius:8px;overflow:hidden;aspect-ratio:1;background:var(--bg4);border:1px solid var(--border);}
        .aw-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
        .aw-thumb-rm{position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:999px;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:11px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.12s;}
        .aw-thumb-rm:hover{background:rgba(192,57,43,0.85);}
        .aw-upload-err{font-size:11.5px;color:#e05a4a;margin-top:8px;}
        .aw-upload-spin{font-size:12px;color:var(--muted);margin-top:8px;}
        .aw-footer{margin-top:28px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
        .aw-footer-note{font-size:12px;color:rgba(255,255,255,0.2);line-height:1.5;}
        .aw-submit{background:var(--red);color:#fff;font-size:14px;font-weight:700;letter-spacing:0.02em;padding:12px 32px;border-radius:10px;border:none;cursor:pointer;font-family:'Sora',sans-serif;transition:background 0.15s;}
        .aw-submit:hover{background:var(--red2);}
        .aw-submit:disabled{opacity:0.5;cursor:default;}
        .aw-notice{background:rgba(232,169,8,0.07);border:1px solid rgba(232,169,8,0.2);border-radius:12px;padding:14px 18px;display:flex;align-items:flex-start;gap:10px;margin-top:20px;}
        .aw-notice-text{font-size:13px;color:rgba(232,169,8,0.85);line-height:1.55;}
        .aw-center{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:12px;text-align:center;}
        @media(max-width:600px){.aw{padding:36px 16px 60px;}.aw-row.cols2{grid-template-columns:1fr;}}
      `}</style>

      <nav className="an">
        <div className="an-left">
          <a href="/" className="an-logo">Yana Nagaland</a>
          <span className="an-sep">/</span>
          <a href="/real-estate" className="an-crumb">Real Estate</a>
          <span className="an-sep">/</span>
          <a href="/real-estate/dashboard" className="an-crumb">Dashboard</a>
          <span className="an-sep">/</span>
          <span className="an-tag">Edit Listing</span>
        </div>
        <a href="/real-estate/dashboard" className="an-back">← Dashboard</a>
      </nav>

      {loading ? (
        <div className="aw aw-center" style={{color:'var(--muted)',fontSize:14}}>Loading…</div>
      ) : notFound ? (
        <div className="aw aw-center">
          <div style={{fontSize:32}}>🏚️</div>
          <div style={{fontSize:16,fontWeight:700}}>Listing not found</div>
          <div style={{fontSize:13,color:'var(--muted)'}}>This property doesn&apos;t exist or you don&apos;t own it.</div>
          <a href="/real-estate/dashboard" style={{marginTop:8,fontSize:13,color:'var(--red)'}}>← Back to dashboard</a>
        </div>
      ) : (
        <div className="aw">
          <div className="aw-eyebrow"><span>✏️</span><span>Edit Listing</span></div>
          <h1 className="aw-title">Edit Property</h1>
          <p className="aw-sub">Update your listing details below and save.</p>

          <form onSubmit={handleSubmit} noValidate>

            <div className="aw-group">
              <div className="aw-group-label">Basic Info</div>
              <div className="aw-row">
                <div className="aw-field">
                  <label className="aw-label">Listing Title *</label>
                  <input {...inp('title')} type="text" placeholder="e.g. 3BHK House for Sale in Kohima" />
                  {errors.title && <div className="aw-err">{errors.title}</div>}
                </div>
              </div>
              <div className="aw-row cols2">
                <div className="aw-field">
                  <label className="aw-label">Property Type *</label>
                  <select {...sel('property_type')}>
                    <option value="">Select type</option>
                    <option value="land">Land</option>
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="commercial">Commercial</option>
                  </select>
                  {errors.property_type && <div className="aw-err">{errors.property_type}</div>}
                </div>
                <div className="aw-field">
                  <label className="aw-label">Listing Type *</label>
                  <select {...sel('listing_type')}>
                    <option value="">Select</option>
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>
                  {errors.listing_type && <div className="aw-err">{errors.listing_type}</div>}
                </div>
              </div>
            </div>

            <div className="aw-group">
              <div className="aw-group-label">Location</div>
              <div className="aw-row cols2">
                <div className="aw-field">
                  <label className="aw-label">City / District *</label>
                  <input {...inp('city')} type="text" placeholder="e.g. Kohima" />
                  {errors.city && <div className="aw-err">{errors.city}</div>}
                </div>
                <div className="aw-field">
                  <label className="aw-label">Locality / Area</label>
                  <input {...inp('locality')} type="text" placeholder="e.g. Midland" />
                </div>
              </div>
              <div className="aw-row">
                <div className="aw-field">
                  <label className="aw-label">Landmark <span style={{fontWeight:400,opacity:0.5}}>(optional)</span></label>
                  <input {...inp('landmark')} type="text" placeholder="e.g. Near DC Office" />
                </div>
              </div>
            </div>

            <div className="aw-group">
              <div className="aw-group-label">Pricing & Size</div>
              <div className="aw-row cols2">
                <div className="aw-field">
                  <label className="aw-label">Price (₹) *</label>
                  <input {...inp('price')} type="number" placeholder="e.g. 2800000" min="0" />
                  <div className="aw-hint">Enter total amount in rupees</div>
                  {errors.price && <div className="aw-err">{errors.price}</div>}
                </div>
                <div className="aw-field">
                  <label className="aw-label">Price Unit</label>
                  <select {...sel('price_unit')}>
                    <option value="">Select</option>
                    <option value="total">Total</option>
                    <option value="per month">Per Month</option>
                    <option value="per sqft">Per Sqft</option>
                  </select>
                </div>
              </div>
              <div className="aw-row cols2">
                <div className="aw-field">
                  <label className="aw-label">Area</label>
                  <input {...inp('area')} type="number" placeholder="e.g. 1200" min="0" />
                </div>
                <div className="aw-field">
                  <label className="aw-label">Area Unit</label>
                  <select {...sel('area_unit')}>
                    <option value="">Select</option>
                    <option value="sqft">Sqft</option>
                    <option value="bigha">Bigha</option>
                    <option value="acre">Acre</option>
                    <option value="gaj">Gaj</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="aw-group">
              <div className="aw-group-label">Description</div>
              <div className="aw-row">
                <div className="aw-field">
                  <label className="aw-label">About this property</label>
                  <textarea
                    className="aw-textarea"
                    placeholder="Describe the property — location highlights, condition, road access, etc."
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="aw-group">
              <div className="aw-group-label">Photos <span style={{fontWeight:400,opacity:0.4}}>({photos.length}/{MAX_PHOTOS})</span></div>
              {photos.length > 0 && (
                <div className="aw-photo-grid">
                  {photos.map((url, i) => (
                    <div key={url} className="aw-thumb">
                      {brokenThumbs.has(i) ? (
                        <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,opacity:0.35}}>🖼️</div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={`Photo ${i + 1}`}
                          onError={() => setBrokenThumbs(prev => new Set(prev).add(i))}
                        />
                      )}
                      <button
                        type="button"
                        className="aw-thumb-rm"
                        onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                        aria-label="Remove photo"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length < MAX_PHOTOS && (
                <label className="aw-photo-area">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    style={{display:'none'}}
                    onChange={handlePhotoFiles}
                    disabled={uploading}
                  />
                  <div className="aw-photo-icon">📷</div>
                  <div className="aw-photo-label">{photos.length === 0 ? 'Add photos' : 'Add more photos'}</div>
                  <div className="aw-photo-sub">JPG, PNG, WebP · Max 5 MB each · Up to {MAX_PHOTOS} total</div>
                  <div className="aw-photo-btn">{uploading ? 'Uploading…' : 'Choose Files'}</div>
                </label>
              )}
              {uploading && <div className="aw-upload-spin">Uploading photos…</div>}
              {uploadError && <div className="aw-upload-err">{uploadError}</div>}
            </div>

            <div className="aw-group">
              <div className="aw-group-label">Contact Details</div>
              <div className="aw-row">
                <div className="aw-field">
                  <label className="aw-label">Your Name</label>
                  <input {...inp('posted_by_name')} type="text" placeholder="e.g. Vizolie Angami" />
                </div>
              </div>
              <div className="aw-row cols2">
                <div className="aw-field">
                  <label className="aw-label">Phone</label>
                  <input {...inp('phone')} type="tel" placeholder="e.g. 9862000000" />
                </div>
                <div className="aw-field">
                  <label className="aw-label">WhatsApp <span style={{fontWeight:400,opacity:0.5}}>(optional)</span></label>
                  <input {...inp('whatsapp')} type="tel" placeholder="e.g. 9862000000" />
                </div>
              </div>
            </div>

            <div className="aw-footer">
              <div className="aw-footer-note">Changes are saved immediately.</div>
              <button type="submit" className="aw-submit" disabled={submitting || uploading}>
                {submitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>

            {apiError && (
              <div className="aw-notice" style={{background:'rgba(192,57,43,0.07)',borderColor:'rgba(192,57,43,0.25)',marginTop:20}}>
                <span>⚠️</span>
                <div className="aw-notice-text" style={{color:'rgba(220,80,70,0.9)'}}>{apiError}</div>
              </div>
            )}

            {success && (
              <div className="aw-notice" style={{background:'rgba(59,168,143,0.07)',borderColor:'rgba(59,168,143,0.25)',marginTop:20}}>
                <span>✅</span>
                <div className="aw-notice-text" style={{color:'rgba(59,168,143,0.9)'}}>
                  <strong>Changes saved!</strong>{' '}
                  <a href="/real-estate/dashboard" style={{color:'inherit',textDecoration:'underline'}}>Back to dashboard →</a>
                </div>
              </div>
            )}

          </form>
        </div>
      )}
    </div>
  )
}
