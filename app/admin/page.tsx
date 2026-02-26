'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types';

// Add your email here to access admin
const ADMIN_EMAIL = 'your-admin@email.com';

export default function AdminPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = '/';
        return;
      }
      setAuthorized(true);
      const res = await fetch('/api/businesses');
      const data = await res.json();
      setBusinesses(data.businesses || []);
      setLoading(false);
    };
    load();
  }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/businesses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    setBusinesses((bs) => bs.map((b) => b.id === id ? { ...b, is_active: !current } : b));
  };

  const filtered = businesses.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.city.toLowerCase().includes(search.toLowerCase()) ||
    b.category.toLowerCase().includes(search.toLowerCase())
  );

  if (!authorized) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <a href="/" className="text-orange-600">← Home</a>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search businesses..."
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:border-orange-500"
        />

        <p className="text-gray-600 mb-4">{filtered.length} businesses</p>

        {loading ? (
          <p className="text-center text-gray-500 py-10">Loading...</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => (
              <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{b.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${b.plan === 'pro' ? 'bg-orange-100 text-orange-700' : b.plan === 'basic' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.plan}
                    </span>
                    {!b.is_active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Hidden</span>}
                  </div>
                  <p className="text-sm text-gray-500 capitalize">{b.category} • {b.city}</p>
                  <p className="text-sm text-gray-500">{b.phone}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/${b.city.toLowerCase()}/${b.slug}`}
                    target="_blank"
                    className="text-sm text-blue-600 hover:underline px-3 py-1"
                  >
                    View
                  </a>
                  <button
                    onClick={() => toggleActive(b.id, b.is_active)}
                    className={`text-sm px-3 py-1 rounded-lg ${b.is_active ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                  >
                    {b.is_active ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
