'use client';

import { useState, useEffect } from 'react';
import { useUI } from '@/lib/ui-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/dashboard-layout';

// Utility function to convert hex to HSL
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Utility function to convert HSL to hex
function hslToHex(hsl: string): string {
  const [h, s, l] = hsl.split(' ').map((val, i) => {
    if (i === 0) return parseFloat(val);
    return parseFloat(val.replace('%', '')) / 100;
  });

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function SettingsPage() {
  const { theme, updateTheme, resetTheme } = useUI();
  const [tempTheme, setTempTheme] = useState(theme);
  const [inputFormats, setInputFormats] = useState<Record<string, 'hsl' | 'hex' | 'rgb'>>(() =>
    Object.keys(theme).reduce((acc, key) => ({ ...acc, [key]: 'hsl' }), {})
  );
  
  // State for feature update countdown setting
  const [countdownSeconds, setCountdownSeconds] = useState(15);

  // Load countdown setting from localStorage on mount
  useEffect(() => {
    const storedCountdown = localStorage.getItem('featureUpdateCountdown');
    if (storedCountdown) {
      setCountdownSeconds(parseInt(storedCountdown, 10));
    }
  }, []);

  // Save countdown setting to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('featureUpdateCountdown', countdownSeconds.toString());
  }, [countdownSeconds]);

  const handleColorChange = (key: keyof typeof theme, value: string, format: 'hsl' | 'hex' | 'rgb') => {
    let hslValue = value;
    
    if (format === 'hex') {
      hslValue = hexToHsl(value);
    } else if (format === 'rgb') {
      // Convert RGB string like "255 255 255" to hex first, then to HSL
      const [r, g, b] = value.split(' ').map(Number);
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      hslValue = hexToHsl(hex);
    }
    
    setTempTheme(prev => ({ ...prev, [key]: hslValue }));
  };

  const handleFormatChange = (key: string, format: 'hsl' | 'hex' | 'rgb') => {
    setInputFormats(prev => ({ ...prev, [key]: format }));
  };

  const getDisplayValue = (key: keyof typeof theme, format: 'hsl' | 'hex' | 'rgb') => {
    const hsl = tempTheme[key];
    if (format === 'hsl') return hsl;
    if (format === 'hex') return hslToHex(hsl);
    if (format === 'rgb') {
      const hex = hslToHex(hsl);
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r} ${g} ${b}`;
    }
    return hsl;
  };

  const applyChanges = () => {
    Object.entries(tempTheme).forEach(([key, value]) => {
      updateTheme(key as keyof typeof theme, value);
    });
  };

  const themeKeys = [
    { key: 'primary', label: 'Primary Color' },
    { key: 'secondary', label: 'Secondary Color' },
    { key: 'background', label: 'Background Color' },
    { key: 'foreground', label: 'Foreground Color' },
    { key: 'card', label: 'Card Background' },
    { key: 'card-foreground', label: 'Card Foreground' },
    { key: 'muted', label: 'Muted Background' },
    { key: 'muted-foreground', label: 'Muted Foreground' },
    { key: 'accent', label: 'Accent Color' },
    { key: 'accent-foreground', label: 'Accent Foreground' },
    { key: 'border', label: 'Border Color' },
    { key: 'input', label: 'Input Background' },
    { key: 'ring', label: 'Ring Color' },
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        {/* Feature Update Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Feature Update Settings</CardTitle>
            <CardDescription>
              Configure how the application handles feature updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Label className="w-48">Auto-refresh Countdown</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="5"
                  max="60"
                  value={countdownSeconds}
                  onChange={(e) => setCountdownSeconds(Math.max(5, Math.min(60, parseInt(e.target.value) || 15)))}
                  className="w-24"
                />
                <span>seconds</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Time before automatic refresh when feature updates are detected (5-60 seconds)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Theme Customization */}
        <Card>
          <CardHeader>
            <CardTitle>Theme Customization</CardTitle>
            <CardDescription>
              Customize the colors used in the application. Choose your preferred input format for each color.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {themeKeys.map(({ key, label }) => {
              const format = inputFormats[key];
              return (
                <div key={key} className="flex items-center space-x-4">
                  <Label className="w-48">{label}</Label>
                  <Select value={format} onValueChange={(value: 'hsl' | 'hex' | 'rgb') => handleFormatChange(key, value)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hsl">HSL</SelectItem>
                      <SelectItem value="hex">Hex</SelectItem>
                      <SelectItem value="rgb">RGB</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type={format === 'hex' ? 'text' : format === 'rgb' ? 'text' : 'text'}
                    value={getDisplayValue(key as keyof typeof theme, format)}
                    onChange={(e) => handleColorChange(key as keyof typeof theme, e.target.value, format)}
                    className="w-48"
                  />
                </div>
              );
            })}
            
            <div className="flex space-x-2 pt-4">
              <Button onClick={applyChanges}>Apply Changes</Button>
              <Button variant="outline" onClick={() => setTempTheme(theme)}>Reset</Button>
              <Button variant="outline" onClick={resetTheme}>Reset to Default</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
