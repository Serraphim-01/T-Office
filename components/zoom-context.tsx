'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ZoomContextType {
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  increaseZoom: () => void;
  decreaseZoom: () => void;
  resetZoom: () => void;
}

const ZoomContext = createContext<ZoomContextType | undefined>(undefined);

export function ZoomProvider({ children }: { children: ReactNode }) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true on mount to ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedZoomLevel = localStorage.getItem('zoomLevel');
      if (savedZoomLevel) {
        const level = parseInt(savedZoomLevel, 10);
        if (!isNaN(level) && level >= 50 && level <= 200) {
          setZoomLevel(level);
        }
      }
    }
  }, []);

  // Apply zoom level to the document
  useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      // Apply zoom using CSS zoom property (works well with most browsers)
      (document.body.style as any).zoom = `${zoomLevel}%`;
      
      // Save to localStorage
      localStorage.setItem('zoomLevel', zoomLevel.toString());
    }
  }, [zoomLevel, isClient]);

  const increaseZoom = () => {
    setZoomLevel(prev => Math.min(prev + 10, 200));
  };

  const decreaseZoom = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  };

  const resetZoom = () => {
    setZoomLevel(100);
  };

  // Only render children on the client side to avoid document access during SSR
  if (typeof window === 'undefined' || !isClient) {
    return (
      <ZoomContext.Provider value={{ 
        zoomLevel: 100, // Default zoom level during SSR
        setZoomLevel, 
        increaseZoom, 
        decreaseZoom, 
        resetZoom 
      }}>
        {children}
      </ZoomContext.Provider>
    );
  }

  return (
    <ZoomContext.Provider value={{ 
      zoomLevel, 
      setZoomLevel, 
      increaseZoom, 
      decreaseZoom, 
      resetZoom 
    }}>
      {children}
    </ZoomContext.Provider>
  );
}

export function useZoom() {
  const context = useContext(ZoomContext);
  if (context === undefined) {
    throw new Error('useZoom must be used within a ZoomProvider');
  }
  return context;
}