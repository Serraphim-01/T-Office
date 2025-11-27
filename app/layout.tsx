import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { UIProvider } from '@/lib/ui-context';
import { Toaster } from '@/components/ui/toaster';
import '@/lib/theme-utils'; // Import theme utilities for early theme application

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Task Office',
  description: 'Modern workplace management platform',
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
            {children}
            <Toaster />
          </AuthProvider>
        </UIProvider>
      </body>
    </html>
  );
}