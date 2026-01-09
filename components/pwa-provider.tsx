'use client';

import { useEffect, useState } from 'react';
import { InstallPrompt } from '@/components/install-prompt';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }

    // Dynamically add manifest link with the new URL to bypass Vercel SSO
    if ('manifest' in document.createElement('link')) {
      const existingLink = document.querySelector('link[rel="manifest"]');
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/app-manifest.json';
        document.head.appendChild(link);
      }
    }
  }, []);

  return (
    <>
      {children}
      <InstallPrompt />
    </>
  );
}
