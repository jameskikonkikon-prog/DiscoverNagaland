import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Business Dashboard' };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
