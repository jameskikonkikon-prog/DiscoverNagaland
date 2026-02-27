'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://discover-nagaland-bjtb.vercel.app/dashboard',
      },
    });
    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };
  if (sent) {
    return (
      <main className="min-h-screen bg-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email!</h1>
          <p className="text-gray-500">We sent a login link to <strong>{email}</strong>. Click the link in the email to log in.</p>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-orange-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md">
        <a href="/" className="text-2xl font-bold text-orange-600 block text-center mb-8">🏔️ Discover Nagaland</a>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Business Login</h1>
        <p className="text-gray-500 text-center mb-8">Enter your email to receive a login link</p>
        <form onSubmit={handleSendLink}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Login Link'}
          </button>
        </form>
        {message && <p className="mt-4 text-center text-sm text-red-600">{message}</p>}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have a listing? <a href="/register" className="text-orange-600 font-medium">Register your business</a>
        </p>
      </div>
    </main>
  );
}
