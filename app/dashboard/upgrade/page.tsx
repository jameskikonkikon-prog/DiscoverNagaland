'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UpgradePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pricing');
  }, [router]);

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'Sora, sans-serif' }}>
      Redirecting to pricing...
    </div>
  );
}
