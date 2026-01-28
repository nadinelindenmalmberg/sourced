import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hemköp Recipe Generator',
  description: 'Generate recipes from Hemköp deals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  )
}
