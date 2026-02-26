'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Business } from '@/types';
import { Suspense } from 'react';

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        setBusinesses(data.businesses || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Search bar */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex gap-3 items-center">
          <a href="/" className="text-orange-600 font-bold text-xl">🏔️</a>
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 px-4 py-2 border-2 border-orange-200 rounded-full focus:outline-none focus:border-orange-500"
            />
            <button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded-full hover:bg-orange-700">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <p>Searching...</p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              {businesses.length} result{businesses.length !== 1 ? 's' : ''} for &quot;{query}&quot;
            </p>
            {businesses.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">😕</div>
                <p className="text-xl text-gray-600">No businesses found</p>
                <p className="text-gray-500 mt-2">Try a different search term</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {businesses.map((b) => (
                  <a
                    key={b.id}
                    href={`/${b.city.toLowerCase()}/${b.slug}`}
                    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition border border-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-lg font-bold text-gray-900">{b.name}</h2>
                          {b.is_verified && <span className="text-blue-500 text-sm">✓ Verified</span>}
                          {b.plan === 'pro' && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">Pro</span>}
                        </div>
                        <p className="text-orange-600 text-sm capitalize">{b.category} • {b.city}</p>
                        <p className="text-gray-600 text-sm mt-1">{b.address}{b.landmark ? ` • Near ${b.landmark}` : ''}</p>
                        {b.description && <p className="text-gray-500 text-sm mt-2 line-clamp-2">{b.description}</p>}
                      </div>
                      {b.photos && b.photos[0] && (
                        <img src={b.photos[0]} alt={b.name} className="w-20 h-20 rounded-xl object-cover ml-4" />
                      )}
                    </div>
                    <div className="flex gap-3 mt-4">
                      <a
                        href={`tel:${b.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-center bg-green-50 text-green-700 py-2 rounded-xl text-sm font-medium hover:bg-green-100"
                      >
                        📞 Call
                      </a>
                      {b.whatsapp && (
                        <a
                          href={`https://wa.me/${b.whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-center bg-green-50 text-green-700 py-2 rounded-xl text-sm font-medium hover:bg-green-100"
                        >
                          💬 WhatsApp
                        </a>
                      )}
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(b.name + ' ' + b.address + ' ' + b.city)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-center bg-blue-50 text-blue-700 py-2 rounded-xl text-sm font-medium hover:bg-blue-100"
                      >
                        🗺️ Maps
                      </a>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
