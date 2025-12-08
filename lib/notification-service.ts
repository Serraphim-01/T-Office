// Simple notification service for testing
export const showNotification = (title: string, message: string) => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    // Browser supports Push API
    // In a real implementation, we would send a push notification
    console.log('Showing notification:', title, message);
  } else {
    // Fallback to a simple alert or toast notification
    console.log('Notification:', title, '-', message);
  }
};