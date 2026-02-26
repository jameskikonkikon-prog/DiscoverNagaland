'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setStep('otp');
      setMessage('Check your email for the OTP code!');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    if (error) {
      setMessage('Invalid OTP. Try again.');
    } else {
      window.location.href = '/dashboard';
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-orange-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md">
        <a href="/" className="text-2xl font-bold text-orange-600 block text-center mb-8">🏔️ Discover Nagaland</a>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Business Login</h1>
        <p className="text-gray-500 text-center mb-8">Enter your email to receive a login code</p>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp}>
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
              {loading ? 'Sending...' : 'Send Login Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <p className="text-center text-gray-600 mb-4">Code sent to {email}</p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit code"
              required
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 mb-4 text-center text-2xl tracking-widest focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full mt-3 text-gray-500 hover:text-gray-700"
            >
              Use different email
            </button>
          </form>
        )}

        {message && (
          <p className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have a listing? <a href="/register" className="text-orange-600 font-medium">Register your business</a>
        </p>
      </div>
    </main>
  );
}
