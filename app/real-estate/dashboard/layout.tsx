import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Property Dashboard' };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
