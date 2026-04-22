'use client';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isSearch = pathname.startsWith('/search');
  const isRE = pathname.startsWith('/real-estate');
  const isRegister = pathname.startsWith('/register');
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/account') || pathname.startsWith('/real-estate/dashboard');
  const isSaved = pathname.startsWith('/saved');

  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    let mounted = true;
    client.auth.getSession().then(({ data }) => {
      if (mounted) setLoggedIn(!!data.session);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_e, session) => {
      if (mounted) setLoggedIn(!!session);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  return (
    <>
      <style>{`
        .gnav{
          display:none;
          position:fixed;bottom:0;left:0;right:0;z-index:600;
          grid-template-columns:repeat(4,1fr);
          height:62px;background:#0d0d0d;border-top:1px solid #1e1e1e;
          box-shadow:0 -6px 32px rgba(0,0,0,0.6);
          font-family:'Sora',sans-serif;
        }
        .gnav.gnav-5{grid-template-columns:repeat(5,1fr);}
        @media(max-width:767px){.gnav{display:grid;}}
        .gnav-item{
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:3px;text-decoration:none;color:#666;
          font-size:10px;font-weight:600;letter-spacing:0.3px;
          transition:color 0.15s;padding:0 4px;
        }
        .gnav-active{color:#e5383b;}
        .gnav-icon{font-size:19px;line-height:1;}
        .gnav-label{font-size:10px;}
        .gnav-cta{
          margin:8px 6px;border-radius:10px;
          background:rgba(229,56,59,0.14);border:1px solid rgba(229,56,59,0.28);
          color:#e5383b;font-weight:700;
        }
      `}</style>
      <nav className={`gnav${loggedIn ? ' gnav-5' : ''}`} aria-label="Mobile navigation">
        <a href="/" className={`gnav-item${isHome ? ' gnav-active' : ''}`}>
          <span className="gnav-icon">🏠</span>
          <span className="gnav-label">Home</span>
        </a>
        <a href="/search" className={`gnav-item${isSearch ? ' gnav-active' : ''}`}>
          <span className="gnav-icon">🔍</span>
          <span className="gnav-label">Search</span>
        </a>
        <a href="/real-estate" className={`gnav-item${isRE ? ' gnav-active' : ''}`}>
          <span className="gnav-icon">🏘️</span>
          <span className="gnav-label">Real Estate</span>
        </a>
        {loggedIn ? (
          <>
            <a href="/saved" className={`gnav-item${isSaved ? ' gnav-active' : ''}`}>
              <span className="gnav-icon">🔖</span>
              <span className="gnav-label">Saved</span>
            </a>
            <a href="/dashboard/select" className={`gnav-item${isDashboard ? ' gnav-active' : ''}`}>
              <span className="gnav-icon">📊</span>
              <span className="gnav-label">Dashboard</span>
            </a>
          </>
        ) : (
          <a href="/register" className={`gnav-item${isRegister ? ' gnav-cta gnav-active' : ''}`}>
            <span className="gnav-icon">+</span>
            <span className="gnav-label">List Business</span>
          </a>
        )}
      </nav>
    </>
  );
}
