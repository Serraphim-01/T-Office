'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUI } from '@/lib/ui-context';

interface RefreshCountdownProps {
  onRefresh: () => void;
}

export function RefreshCountdown({ onRefresh }: RefreshCountdownProps) {
  const [countdown, setCountdown] = useState(15); // Default 15 seconds
  const [isVisible, setIsVisible] = useState(false);
  const { theme } = useUI();

  // Get countdown duration from localStorage or default to 15
  useEffect(() => {
    const storedCountdown = localStorage.getItem('featureUpdateCountdown');
    if (storedCountdown) {
      setCountdown(parseInt(storedCountdown, 10));
    }
  }, []);

  // Listen for feature update notifications
  useEffect(() => {
    const handleFeatureUpdate = () => {
      setIsVisible(true);
      setCountdown(15); // Reset to 15 seconds
    };

    // Listen for custom event from notification system
    window.addEventListener('feature-update-notification', handleFeatureUpdate);

    return () => {
      window.removeEventListener('feature-update-notification', handleFeatureUpdate);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleRefresh();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, onRefresh]);

  const handleRefresh = () => {
    setIsVisible(false);
    onRefresh();
  };

  const handleCancel = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Card className="shadow-lg border-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-foreground">Feature Update Detected</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The page will refresh automatically in {countdown} seconds to apply the new features.
              </p>
              <div className="w-full bg-secondary rounded-full h-2 mt-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-1000 ease-linear"
                  style={{ 
                    width: `${((15 - countdown) / 15) * 100}%`,
                    backgroundColor: `hsl(${theme.primary})`
                  }}
                ></div>
              </div>
            </div>
            <div className="flex space-x-2 ml-4">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCancel}
                className="h-8"
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleRefresh}
                className="h-8"
              >
                Refresh Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}