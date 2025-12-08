import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { UIProvider } from '@/lib/ui-context';
import { NotificationProvider } from '@/lib/notification-context'; // Import our notification provider
import { Toaster } from '@/components/ui/toaster';
import { PWAProvider } from '@/components/pwa-provider';
import '@/lib/theme-utils'; // Import theme utilities for early theme application

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Task Office',
  description: 'Modern workplace management platform',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192x192.png',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: '#3B82F6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <UIProvider>
          <AuthProvider>
            <NotificationProvider> {/* Wrap with our notification provider */}
              <PWAProvider>
                {children}
                <Toaster />
              </PWAProvider>
            </NotificationProvider>
          </AuthProvider>
        </UIProvider>
      </body>
    </html>
  );
}