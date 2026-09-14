import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ServiceWorkerRegister } from './sw-register'

export const metadata: Metadata = {
  title: 'OficioYa',
  description: 'Conecta con plomeros, electricistas, cerrajeros y técnicos verificados en Guadalajara.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon.ico',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon.ico',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.ico',
        type: 'image/svg+xml',
      },
    ],
    apple: '/icon.ico',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ServiceWorkerRegister />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
