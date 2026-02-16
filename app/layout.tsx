import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sourced - Recept från veckans erbjudanden',
  description: 'Hitta recept baserat på veckans erbjudanden från Hemköp',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sourced',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sourced" />
      </head>
      <body>{children}</body>
    </html>
  )
}
