import type { Metadata } from 'next'
import './globals.css'
import ConsentBanner from '@/components/ConsentBanner'
import Footer from '@/components/Footer'
import { ToastProvider } from '@/components/Toast'

export const metadata: Metadata = {
  title: {
    default: "Yana Nagaland — Nagaland's Business & Property Directory",
    template: '%s | Yana Nagaland',
  },
  description: 'Find and list businesses, restaurants, hotels, PGs, rentals, and real estate across Nagaland. Kohima, Dimapur, and all 17 districts.',
  openGraph: {
    title: "Yana Nagaland — Nagaland's Business & Property Directory",
    description: 'Find and list businesses, restaurants, hotels, PGs, rentals, and real estate across Nagaland.',
    type: 'website',
    url: 'https://yananagaland.com',
    siteName: 'Yana Nagaland',
    images: [{ url: 'https://yananagaland.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Yana Nagaland — Nagaland's Business & Property Directory",
    description: 'Find and list businesses, restaurants, hotels, PGs, rentals, and real estate across Nagaland.',
    images: ['https://yananagaland.com/og-image.png'],
  },
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
      <body>
        <ToastProvider>
          {children}
          <Footer />
          <ConsentBanner />
        </ToastProvider>
      </body>
    </html>
  )
}
