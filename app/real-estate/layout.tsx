import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Real Estate' };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
