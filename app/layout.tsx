import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { LangProvider } from '@/lib/LangContext'
import { Toaster } from 'react-hot-toast'
import AiAssistant from '@/components/AiAssistant'

export const metadata: Metadata = {
  title: {
    default: 'EDHA Academy – Éducation & Développement d\'Haïti',
    template: '%s | EDHA Academy',
  },
  description: 'Plateforme d\'apprentissage en ligne pour Haïti. Cours gratuits en français, créole et anglais. Obtenez des certificats reconnus.',
  keywords: 'cours en ligne, Haiti, education, certificats, apprentissage, kreyòl, EDHA, SYGECO',
  authors: [{ name: 'EDHA Academy' }],
  creator: 'EDHA Academy',
  metadataBase: new URL('https://edha.academy'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    alternateLocale: ['en_US', 'ht_HT'],
    url: 'https://edha.academy',
    siteName: 'EDHA Academy',
    title: 'EDHA Academy – Éducation & Développement d\'Haïti',
    description: 'Des cours gratuits de qualité en français, créole et anglais. Formez-vous avec des experts et obtenez des certificats reconnus.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EDHA Academy – Plateforme d\'apprentissage pour Haïti',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EDHA Academy – Éducation & Développement d\'Haïti',
    description: 'Des cours gratuits de qualité en français, créole et anglais.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="bg-bg text-text antialiased">
        <LangProvider>
          <AuthProvider>
            {children}
            <AiAssistant />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                duration: 3000,
              }}
            />
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  )
}
