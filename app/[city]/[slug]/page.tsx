import { getServiceClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';

export default async function BusinessPage({
  params,
}: {
  params: { city: string; slug: string };
}) {
  const serviceClient = getServiceClient();
  const { data: business } = await serviceClient
    .from('businesses')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single();

  if (!business) notFound();

  // Track profile view
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/businesses/${business.id}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'profile_view' }),
  }).catch(() => {});

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href={`/search?q=${business.city}`} className="text-orange-600">← Back</a>
          <a href="/" className="text-lg font-bold text-orange-600 ml-auto">🏔️ Discover Nagaland</a>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Photos */}
        {business.photos && business.photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto mb-6">
            {business.photos.map((photo: string, i: number) => (
              <img key={i} src={photo} alt={business.name} className="h-48 w-64 object-cover rounded-2xl flex-shrink-0" />
            ))}
          </div>
        )}

        {/* Business Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            <div className="flex gap-2">
              {business.is_verified && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">✓ Verified</span>}
              {business.plan === 'pro' && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">Pro</span>}
            </div>
          </div>
          <p className="text-orange-600 capitalize">{business.category}</p>
          <p className="text-gray-600 mt-2">{business.address}{business.landmark ? ` • Near ${business.landmark}` : ''}, {business.city}</p>
          {business.opening_hours && (
            <p className="text-gray-600 mt-1">🕐 {business.opening_hours}</p>
          )}
          {business.description && (
            <p className="text-gray-700 mt-4 leading-relaxed">{business.description}</p>
          )}
        </div>

        {/* Contact buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <a
            href={`tel:${business.phone}`}
            className="bg-green-600 text-white py-4 rounded-2xl text-center font-semibold hover:bg-green-700 transition"
          >
            📞 Call Now
          </a>
          {business.whatsapp ? (
            <a
              href={`https://wa.me/${business.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 text-white py-4 rounded-2xl text-center font-semibold hover:bg-green-600 transition"
            >
              💬 WhatsApp
            </a>
          ) : (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(business.name + ' ' + business.city)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white py-4 rounded-2xl text-center font-semibold hover:bg-blue-700 transition"
            >
              🗺️ Get Directions
            </a>
          )}
        </div>

        {business.whatsapp && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(business.name + ' ' + business.city)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-blue-600 text-white py-4 rounded-2xl text-center font-semibold hover:bg-blue-700 transition mb-4"
          >
            🗺️ Get Directions on Google Maps
          </a>
        )}

        {business.email && (
          <a
            href={`mailto:${business.email}`}
            className="block bg-gray-100 text-gray-700 py-4 rounded-2xl text-center font-semibold hover:bg-gray-200 transition"
          >
            ✉️ {business.email}
          </a>
        )}
      </div>
    </main>
  );
}
