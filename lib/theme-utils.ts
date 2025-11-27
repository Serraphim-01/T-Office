// Utility functions for theme management

// Apply theme early to prevent flickering
export function applyStoredTheme() {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    return;
  }
  
  const stored = localStorage.getItem('customTheme');
  if (stored) {
    try {
      const theme = JSON.parse(stored);
      Object.entries(theme).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value as string);
      });
    } catch (e) {
      console.error('Failed to apply stored theme:', e);
    }
  }
}

// Apply theme immediately when module is imported
applyStoredTheme();