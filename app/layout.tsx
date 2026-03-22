import type { Metadata } from 'next'
import './globals.css'
import ConsentBanner from '@/components/ConsentBanner'

export const metadata: Metadata = {
  title: 'Yana Nagaland — Find anything in Nagaland',
  description: 'Nagaland\'s first AI directory. Find PG rooms, gyms, turfs, cafés, study spaces, restaurants and more across all 17 districts.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}<ConsentBanner /></body>
    </html>
  )
}
