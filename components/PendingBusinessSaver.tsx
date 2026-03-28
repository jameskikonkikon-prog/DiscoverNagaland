'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Runs on every page load. After email verification the user lands on /
 * with a session but their business details are still in localStorage.
 * This component detects that, saves the business to the DB, then redirects
 * to /dashboard.
 */
export default function PendingBusinessSaver() {
  useEffect(() => {
    const pending = localStorage.getItem('yana_pending_business');
    if (!pending) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      try {
        const payload = JSON.parse(pending);
        const res = await fetch('/api/register-business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, signup_user_id: session.user.id }),
        });
        if (res.ok) {
          localStorage.removeItem('yana_pending_business');
          window.location.href = '/dashboard';
        } else {
          const data = await res.json();
          console.error('[PendingBusinessSaver] API error:', data.error);
        }
      } catch (e) {
        console.error('[PendingBusinessSaver] failed:', e);
      }
    });
  }, []);

  return null;
}
