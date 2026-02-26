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
      const { data, error } = await supabase.storage.from('business-photos').upload(path, photo);
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

  if (submitted) {
    return (
      <main className="min-h-screen bg-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Listing Created!</h1>
          <p className="text-gray-600 mb-6">Your business is now live on Discover Nagaland.</p>
          <a href="/dashboard" className="bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700">
            Go to Dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-orange-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <a href="/" className="text-xl font-bold text-orange-600 block text-center mb-6">🏔️ Discover Nagaland</a>

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {STEPS.slice(0, -1).map((s, i) => (
            <div key={s} className={`flex-1 h-2 rounded-full ${i <= step ? 'bg-orange-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{STEPS[step]}</h2>

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input value={form.name} onChange={(e) => update('name', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" placeholder="e.g. Naga Kitchen" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select value={form.category} onChange={(e) => update('category', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500">
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <select value={form.city} onChange={(e) => update('city', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500">
                  <option value="">Select city</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input value={form.address} onChange={(e) => update('address', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" placeholder="e.g. Near DC Court, New NST Colony" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nearby Landmark</label>
                <input value={form.landmark} onChange={(e) => update('landmark', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" placeholder="e.g. PR Hill, Naga Bazaar" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" placeholder="9xxxxxxxxx" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                <input value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" placeholder="91xxxxxxxxxx (with country code)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" placeholder="business@email.com" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={4} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" placeholder="Tell customers what makes your business special..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Hours</label>
                <input value={form.opening_hours} onChange={(e) => update('opening_hours', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" placeholder="e.g. Mon-Sat 9am-8pm" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">Upload photos of your business (optional)</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setPhotos(Array.from(e.target.files || []))}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl px-4 py-6 text-center text-gray-500"
              />
              {photos.length > 0 && <p className="text-green-600 text-sm">{photos.length} photo(s) selected</p>}
            </div>
          )}

          {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50">
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 0 && (!form.name || !form.category)) ||
                  (step === 1 && (!form.city || !form.address)) ||
                  (step === 2 && !form.phone)
                }
                className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Listing'}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
