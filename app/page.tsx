'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CITIES, CATEGORIES } from '@/types';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 max-w-6xl mx-auto">
        <div className="text-2xl font-bold text-orange-600">🏔️ Discover Nagaland</div>
        <div className="flex gap-3">
          <a href="/login" className="text-sm text-gray-600 hover:text-orange-600 px-3 py-2">Login</a>
          <a href="/register" className="text-sm bg-orange-600 text-white px-4 py-2 rounded-full hover:bg-orange-700">List Your Business</a>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center px-4 py-16 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
          Find anything in <span className="text-orange-600">Nagaland</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10">
          AI-powered search for restaurants, hotels, shops, clinics and more across 8 cities
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl mx-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "best momos near NST Kohima" or "pharmacy Dimapur"'
            className="flex-1 px-5 py-4 text-lg border-2 border-orange-200 rounded-full focus:outline-none focus:border-orange-500 shadow-sm"
          />
          <button
            type="submit"
            className="bg-orange-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-orange-700 transition shadow-sm"
          >
            Search
          </button>
        </form>

        {/* Quick searches */}
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          {['Restaurants Kohima', 'Hotels Dimapur', 'Pharmacy near me', 'PG Kohima', 'Coaching centre'].map((s) => (
            <button
              key={s}
              onClick={() => router.push(`/search?q=${encodeURIComponent(s)}`)}
              className="bg-white border border-orange-200 text-orange-700 px-4 py-2 rounded-full text-sm hover:bg-orange-50 transition"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* Cities */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Browse by City</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CITIES.map((city) => (
            <a
              key={city}
              href={`/search?q=${city}`}
              className="bg-white border border-gray-200 rounded-2xl p-5 text-center hover:border-orange-300 hover:shadow-md transition cursor-pointer"
            >
              <div className="text-3xl mb-2">🏙️</div>
              <div className="font-semibold text-gray-800">{city}</div>
            </a>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Browse by Category</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {CATEGORIES.map((cat) => (
            <a
              key={cat}
              href={`/search?q=${cat}`}
              className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-orange-300 hover:shadow-md transition capitalize"
            >
              <div className="text-2xl mb-1">
                {cat === 'restaurant' ? '🍽️' : cat === 'cafe' ? '☕' : cat === 'hotel' ? '🏨' : cat === 'hospital' ? '🏥' : cat === 'pharmacy' ? '💊' : cat === 'salon' ? '✂️' : cat === 'school' ? '🏫' : cat === 'clinic' ? '🩺' : cat === 'turf' ? '⚽' : cat === 'pg' ? '🏠' : cat === 'coaching' ? '📚' : cat === 'rental' ? '🚗' : cat === 'shop' ? '🛍️' : '🔧'}
              </div>
              <div className="text-sm font-medium text-gray-700">{cat}</div>
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-orange-600 text-white text-center py-16 px-4">
        <h2 className="text-3xl font-bold mb-4">Own a business in Nagaland?</h2>
        <p className="text-xl mb-8 opacity-90">Get discovered by thousands of customers. Free to list!</p>
        <a
          href="/register"
          className="bg-white text-orange-600 px-8 py-4 rounded-full text-lg font-bold hover:bg-orange-50 transition"
        >
          List Your Business — Free
        </a>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500 text-sm">
        <p>© 2025 Discover Nagaland. Made with ❤️ for Nagaland.</p>
      </footer>
    </main>
  );
}
