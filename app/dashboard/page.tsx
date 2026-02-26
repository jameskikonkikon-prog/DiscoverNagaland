'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Business, BusinessAnalytics } from '@/types';

export default function DashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [analytics, setAnalytics] = useState<BusinessAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (!biz) { window.location.href = '/register'; return; }
      setBusiness(biz);

      // Get last 7 days analytics
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: stats } = await supabase
        .from('business_analytics')
        .select('*')
        .eq('business_id', biz.id)
        .gte('date', since);

      setAnalytics(stats || []);
      setLoading(false);
    };
    load();
  }, []);

  const totals = analytics.reduce(
    (acc, a) => ({
      views: acc.views + (a.profile_views || 0),
      searches: acc.searches + (a.search_appearances || 0),
      whatsapp: acc.whatsapp + (a.whatsapp_clicks || 0),
      calls: acc.calls + (a.call_clicks || 0),
      maps: acc.maps + (a.maps_clicks || 0),
    }),
    { views: 0, searches: 0, whatsapp: 0, calls: 0, maps: 0 }
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="text-xl font-bold text-orange-600">🏔️ Discover Nagaland</a>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Logout</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Business header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{business?.name}</h1>
              <p className="text-orange-600 capitalize">{business?.category} • {business?.city}</p>
              <div className="flex gap-2 mt-2">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  business?.plan === 'pro' ? 'bg-orange-100 text-orange-700' :
                  business?.plan === 'basic' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {business?.plan?.toUpperCase()} Plan
                </span>
                {business?.is_verified && <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700">✓ Verified</span>}
              </div>
            </div>
            <a href="/dashboard/upgrade" className="bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-700">
              Upgrade Plan
            </a>
          </div>
        </div>

        {/* Analytics */}
        <h2 className="text-lg font-bold text-gray-800 mb-4">Last 7 Days</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Profile Views', value: totals.views, icon: '👁️' },
            { label: 'Search Appearances', value: totals.searches, icon: '🔍' },
            { label: 'WhatsApp Clicks', value: totals.whatsapp, icon: '💬' },
            { label: 'Calls', value: totals.calls, icon: '📞' },
            { label: 'Maps Clicks', value: totals.maps, icon: '🗺️' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Business details */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Your Listing</h2>
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{business?.phone}</span></div>
            {business?.whatsapp && <div><span className="text-gray-500">WhatsApp:</span> <span className="font-medium">{business?.whatsapp}</span></div>}
            <div><span className="text-gray-500">Address:</span> <span className="font-medium">{business?.address}</span></div>
            {business?.opening_hours && <div><span className="text-gray-500">Hours:</span> <span className="font-medium">{business?.opening_hours}</span></div>}
            {business?.description && <div><span className="text-gray-500">Description:</span> <p className="font-medium mt-1">{business?.description}</p></div>}
          </div>
          <div className="mt-6 pt-6 border-t">
            <a
              href={`/${business?.city?.toLowerCase()}/${business?.slug}`}
              className="text-orange-600 hover:underline text-sm font-medium"
              target="_blank"
            >
              View your public listing →
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
