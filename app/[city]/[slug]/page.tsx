'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function BusinessPage() {
  const params = useParams();
  const [business, setBusiness] = useState<Record<string, string & string[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch(`/api/businesses/slug/${params.slug}`)
      .then(r => r.json())
      .then(data => {
        setBusiness(data.business);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.slug]);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setLoggedIn(!!data.session);
      })
      .catch(() => {
        if (!mounted) return;
        setLoggedIn(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  if (!business) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Business not found</p></div>;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="javascript:history.back()" className="text-orange-600">← Back</a>
          <div className="ml-auto flex items-center gap-3">
            <a href="/" className="text-lg font-bold text-orange-600">🏔️ Yana Nagaland</a>
            {!mounted ? (
              <span className="w-9 h-9 rounded-full inline-block invisible pointer-events-none" aria-hidden style={{ minWidth: 36, minHeight: 36 }} />
            ) : loggedIn ? (
              <a
                href="/dashboard"
                aria-label="Open dashboard"
                className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-semibold"
              >
                👤
              </a>
            ) : null}
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {business.photos && (business.photos as unknown as string[]).length > 0 && (
          <div className="flex gap-2 overflow-x-auto mb-6">
            {(business.photos as unknown as string[]).map((photo: string, i: number) => (
              <img key={i} src={photo} alt={business.name} className="h-48 w-64 object-cover rounded-2xl flex-shrink-0" />
            ))}
          </div>
        )}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            <div className="flex gap-2">
              {business.plan === 'plus' && <span className="text-xs px-2 py-1 rounded-full font-bold text-white" style={{ background: 'linear-gradient(135deg, #c0392b, #8B1a1a)', boxShadow: '0 2px 8px rgba(192,57,43,0.4)' }}>✓ Verified Business</span>}
              {business.is_verified && business.plan !== 'plus' && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">✓ Verified</span>}
              {business.plan === 'pro' && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">Pro</span>}
            </div>
          </div>
          <p className="text-orange-600 capitalize">{business.category}</p>
          <p className="text-gray-600 mt-2">{business.address}{business.landmark ? ` • Near ${business.landmark}` : ''}, {business.city}</p>
          {business.opening_hours && <p className="text-gray-600 mt-1">🕐 {business.opening_hours}</p>}
          {business.description && <p className="text-gray-700 mt-4 leading-relaxed">{business.description}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <a href={`tel:${business.phone}`} className="bg-green-600 text-white py-4 rounded-2xl text-center font-semibold hover:bg-green-700">📞 Call Now</a>
          {business.whatsapp
            ? <a href={`https://wa.me/${business.whatsapp}`} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white py-4 rounded-2xl text-center font-semibold hover:bg-green-600">💬 WhatsApp</a>
            : <a href={`https://maps.google.com/?q=${encodeURIComponent(business.name + ' ' + business.city)}`} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white py-4 rounded-2xl text-center font-semibold">🗺️ Maps</a>
          }
        </div>
        <a href={`https://maps.google.com/?q=${encodeURIComponent(business.name + ' ' + business.city)}`} target="_blank" rel="noopener noreferrer" className="block bg-blue-600 text-white py-4 rounded-2xl text-center font-semibold hover:bg-blue-700 mb-4">🗺️ Get Directions</a>
      </div>
    </main>
  );
}
