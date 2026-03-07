import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Yana Nagaland — Find Local Businesses',
  description: 'The first hyperlocal business directory for Nagaland. Find restaurants, hotels, shops and more in Kohima, Dimapur and across Nagaland.',
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Inter', sans-serif" }}>{children}</body>
    </html>
  )
}
