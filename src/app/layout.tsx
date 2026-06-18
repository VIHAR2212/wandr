import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Toaster } from 'sonner';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Wandr — AI Travel Planner',
    template: '%s | Wandr',
  },
  description:
    'Your intelligent travel companion. Plan, book, and explore with AI-powered precision. Personalized itineraries, real-time tracking, and budget-perfect trips.',
  keywords: ['AI travel planner', 'trip planning', 'itinerary generator', 'travel AI', 'budget travel', 'India travel'],
  authors: [{ name: 'Wandr' }],
  openGraph: {
    type: 'website',
    title: 'Wandr — AI Travel Planner',
    description: 'Plan perfect trips with AI. Day-by-day itineraries, real-time tracking, budget management.',
    siteName: 'Wandr',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wandr — AI Travel Planner',
    description: 'Plan perfect trips with AI.',
  },
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdf8f3' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
          {children}
          <Toaster
            position="top-right"
            expand
            richColors
            toastOptions={{ style: { borderRadius: '16px', backdropFilter: 'blur(24px)' } }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
