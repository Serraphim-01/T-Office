'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler as any);

    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  const installApp = () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsVisible(false);
    });
  };

  const closePrompt = () => {
    setIsVisible(false);
  };

  if (!isVisible || !isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute top-2 right-2 h-6 w-6 p-0"
          onClick={closePrompt}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Install Task Office</CardTitle>
          <CardDescription>
            Add to your home screen for quick access and offline functionality.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={installApp} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Install App
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}