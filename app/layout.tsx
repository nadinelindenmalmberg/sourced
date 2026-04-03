import type { Metadata, Viewport } from 'next'
import { Fredoka } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/lib/i18n-context'

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-fredoka',
})

/** App Router: avoid a manual head element so Next can inject stylesheets. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#FFFBF7',
}

export const metadata: Metadata = {
  title: 'Sourced',
  description: 'Recipes from this week\'s Hemköp deals',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sourced',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={fredoka.className}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}
