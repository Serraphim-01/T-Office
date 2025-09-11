import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { PWAProvider } from '@/components/pwa-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Task Office - Internal Office Management',
  description: 'Modern internal office management system for enhanced productivity and collaboration',
  keywords: 'office management, productivity, collaboration, internal tools',
  authors: [{ name: 'Task Office Team' }],
  creator: 'Task Office',
  publisher: 'Task Office',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/manifest.json',
  themeColor: '#3B82F6',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Task Office',
  },
  openGraph: {
    type: 'website',
    siteName: 'Task Office',
    title: 'Task Office - Internal Office Management',
    description: 'Modern internal office management system for enhanced productivity and collaboration',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Task Office - Internal Office Management',
    description: 'Modern internal office management system for enhanced productivity and collaboration',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Task Office" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#3B82F6" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <PWAProvider>
            {children}
          </PWAProvider>
        </AuthProvider>
      </body>
    </html>
  );
}