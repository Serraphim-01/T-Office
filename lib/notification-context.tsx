'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import io from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';
import { hasPageAccess } from '@/lib/page-access';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  messageId?: number; // For chat messages
  department?: string; // For feature update notifications
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read'>) => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  clearReadNotifications: () => void; // Add this method
  fetchNotifications: () => Promise<void>; // Add fetch method
  setCurrentPage: (page: string) => void; // Add method to set current page
  playNotificationSound: () => void; // Add method to play notification sound
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<string>(''); // Track current page
  const { user } = useAuth(); // Get user from auth context
  const { toast } = useToast(); // Use toast hook for global notifications

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        try {
          const parsed = JSON.parse(savedNotifications);
          setNotifications(parsed);
          setUnreadCount(parsed.filter((n: Notification) => !n.read).length);
        } catch (e) {
          console.error('Failed to parse notifications from localStorage', e);
        }
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications', JSON.stringify(notifications));
      setUnreadCount(notifications.filter(n => !n.read).length);
    }
  }, [notifications]);

  // Function to play notification sound
  const playNotificationSound = () => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
      }, 200);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Fetch notifications from backend when user changes
  const fetchNotifications = async () => {
    if (!user) return;
    
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    
    try {
      const response = await fetch(`/api/notifications/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Include the auth token
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const backendNotifications = await response.json();
        // Convert backend notifications to our format
        let formattedNotifications = backendNotifications.map((n: any) => ({
          id: n.id.toString(), // Database IDs are strings
          type: n.type,
          title: n.title,
          message: n.message,
          timestamp: n.timestamp,
          read: n.read,
          messageId: n.messageId,
          department: n.department // Add department information
        }));
        
        // Filter notifications based on feature access and department (if user is available)
        if (user) {
          // We need to filter notifications asynchronously
          const filteredNotifications = [];
          
          for (const notification of formattedNotifications) {
            let shouldInclude = true;
            
            // Check chat notification access
            if (notification.type === 'chat_message' || notification.type === 'chat_status') {
              const hasChatNotificationAccess = await hasPageAccess(user.id.toString(), 'chat/notifications');
              if (!hasChatNotificationAccess) {
                shouldInclude = false;
              }
            }
            
            // Check clock notification access
            if (notification.type === 'location_created' || notification.type === 'location_deleted') {
              const hasClockNotificationAccess = await hasPageAccess(user.id.toString(), 'clock/notifications');
              if (!hasClockNotificationAccess) {
                shouldInclude = false;
              }
            }
            
            // Check department for feature update notifications
            if (notification.type === 'feature_update') {
              // Only include feature update notifications if they're for the user's department
              // If department is not specified, we include it for backward compatibility
              if (notification.department && user.department && notification.department !== user.department) {
                shouldInclude = false;
              }
            }
            
            if (shouldInclude) {
              filteredNotifications.push(notification);
            }
          }
          
          formattedNotifications = filteredNotifications;
        }
        
        // Merge with existing notifications, prioritizing newer ones
        setNotifications(prev => {
          // Keep temporary notifications that don't exist in the backend
          const temporaryNotifications = prev.filter(tempNotification => {
            // Only keep temporary notifications (non-numeric IDs) that aren't duplicates of backend notifications
            if (!isNaN(Number(tempNotification.id))) {
              return false; // Skip database notifications
            }
            
            // Check if this temporary notification is a duplicate of any backend notification
            const isDuplicate = formattedNotifications.some((dbNotification: Notification) => 
              dbNotification.title === tempNotification.title && 
              dbNotification.message === tempNotification.message &&
              dbNotification.type === tempNotification.type &&
              Math.abs(new Date(dbNotification.timestamp).getTime() - new Date(tempNotification.timestamp).getTime()) < 5000
            );
            
            return !isDuplicate;
          });
          
          // Combine backend notifications with non-duplicate temporary notifications
          const merged = [...formattedNotifications, ...temporaryNotifications];
          
          // Sort by read status first (unread first), then by timestamp descending (newest first)
          return merged.sort((a, b) => {
            // Unread notifications come first
            if (a.read === b.read) {
              // If both have same read status, sort by timestamp (newest first)
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            }
            return a.read ? 1 : -1;
          });
        });
      } else if (response.status === 401) {
        console.warn('Unauthorized access to notifications API - user may need to log in again');
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Initialize WebSocket connection and fetch notifications
  useEffect(() => {
    if (user) {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      
      // Fetch notifications from backend
      fetchNotifications();
      
      const newSocket = io('http://localhost:4000', {
        auth: {
          token: token // Pass the token to the WebSocket connection
        }
      });
      setSocket(newSocket);

      // Register user with the server
      newSocket.emit('register_user', user.id);

      // Listen for notifications
      newSocket.on('notification', async (notificationData) => {
        // Check feature access for chat notifications
        let hasChatNotificationAccess = true;
        if (user && (notificationData.type === 'chat_message' || notificationData.type === 'chat_status')) {
          hasChatNotificationAccess = await hasPageAccess(user.id.toString(), 'chat/notifications');
        }
        
        // Check feature access for clock notifications
        let hasClockNotificationAccess = true;
        if (user && (notificationData.type === 'location_created' || notificationData.type === 'location_deleted')) {
          hasClockNotificationAccess = await hasPageAccess(user.id.toString(), 'clock/notifications');
        }
        
        // Check department for feature update notifications
        let isRelevantFeatureUpdate = true;
        if (user && notificationData.type === 'feature_update') {
          // Only show feature update notifications if they're for the user's department
          // If department is not specified, we include it for backward compatibility
          if (notificationData.department && user.department && notificationData.department !== user.department) {
            isRelevantFeatureUpdate = false;
          }
        }
        
        // Check feature access for HR users notifications (lesson completed, clock in/out)
        let hasHRUsersAccess = true;
        if (user && (notificationData.type === 'lesson_completed' || notificationData.type === 'clock_in' || notificationData.type === 'clock_out')) {
          hasHRUsersAccess = await hasPageAccess(user.id.toString(), 'hr/users');
        }
        
        // Show toast notification for location-related, chat, HR users, and relevant feature update notifications
        if ((hasClockNotificationAccess && (notificationData.type === 'location_created' || notificationData.type === 'location_deleted')) || 
            (hasChatNotificationAccess && (notificationData.type === 'chat_message' || notificationData.type === 'chat_status')) ||
            (hasHRUsersAccess && (notificationData.type === 'lesson_completed' || notificationData.type === 'clock_in' || notificationData.type === 'clock_out')) ||
            (notificationData.type === 'feature_update' && isRelevantFeatureUpdate)) {
          toast({
            title: notificationData.title,
            description: notificationData.message,
          });
        }
        
        // Dispatch a custom event to notify components about chat status changes (if user has access)
        if (hasChatNotificationAccess && notificationData.type === 'chat_status') {
          window.dispatchEvent(new CustomEvent('chatStatusChanged', {
            detail: {
              isPaused: notificationData.title === 'Chat Paused'
            }
          }));
        }
        
        // Dispatch a custom event for feature update notifications
        if (notificationData.type === 'feature_update' && isRelevantFeatureUpdate) {
          window.dispatchEvent(new CustomEvent('feature-update-notification'));
        }
        
        // Only add notification to the panel if user has access to the corresponding feature
        // Exception: feature_update notifications are added if they're for the user's department
        const shouldAddNotification = 
          (hasChatNotificationAccess && (notificationData.type === 'chat_message' || notificationData.type === 'chat_status')) ||
          (hasClockNotificationAccess && (notificationData.type === 'location_created' || notificationData.type === 'location_deleted')) ||
          (hasHRUsersAccess && (notificationData.type === 'lesson_completed' || notificationData.type === 'clock_in' || notificationData.type === 'clock_out')) ||
          (notificationData.type === 'feature_update' && isRelevantFeatureUpdate);
        
        if (!shouldAddNotification) {
          return; // Don't add notification to panel if user doesn't have access or it's not relevant
        }
        
        // Use functional update to get the latest notifications state
        setNotifications(prevNotifications => {
          // Check if this notification already exists in our list
          // Only check against database notifications (permanent ones with numeric IDs)
          const exists = prevNotifications.some(n => 
            n.title === notificationData.title && 
            n.message === notificationData.message &&
            n.type === notificationData.type &&
            !isNaN(Number(n.id)) && // Only check against permanent notifications
            Math.abs(new Date(n.timestamp).getTime() - new Date(notificationData.timestamp).getTime()) < 5000 // Within 5 seconds
          );
          
          // Only add if it doesn't already exist as a permanent notification
          if (!exists) {
            const newNotification: Notification = {
              ...notificationData,
              id: Math.random().toString(36).substr(2, 9),
              read: false
            };
            
            // Play notification sound for new notifications
            playNotificationSound();
            
            // Add new notification at the beginning and re-sort
            const updatedNotifications = [newNotification, ...prevNotifications];
            
            // Sort by read status first (unread first), then by timestamp descending (newest first)
            return updatedNotifications.sort((a, b) => {
              // Unread notifications come first
              if (a.read === b.read) {
                // If both have same read status, sort by timestamp (newest first)
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
              }
              return a.read ? 1 : -1;
            });
          }
          
          // Return unchanged if duplicate
          return prevNotifications;
        });
      });

      return () => {
        newSocket.close();
      };
    }
  }, [user, toast]); // Depend only on user changes, not notifications

  // Update current page on the backend when it changes
  useEffect(() => {
    if (user && currentPage) {
      // Also update via WebSocket if connected
      if (socket) {
        socket.emit('set_current_page', { userId: user.id, page: currentPage });
      }
      
      // Update via API as backup
      const updatePageViaAPI = async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        
        try {
          await fetch('/api/set-current-page', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({ page: currentPage })
          });
        } catch (error) {
          console.error('Failed to update current page via API:', error);
        }
      };
      
      updatePageViaAPI();
    }
  }, [currentPage, user, socket]);

  const addNotification = async (notification: Omit<Notification, 'id' | 'read'>) => {
    // Check feature access for chat notifications
    let hasChatNotificationAccess = true;
    if (user && (notification.type === 'chat_message' || notification.type === 'chat_status')) {
      hasChatNotificationAccess = await hasPageAccess(user.id.toString(), 'chat/notifications');
    }
    
    // Check feature access for clock notifications
    let hasClockNotificationAccess = true;
    if (user && (notification.type === 'location_created' || notification.type === 'location_deleted')) {
      hasClockNotificationAccess = await hasPageAccess(user.id.toString(), 'clock/notifications');
    }
    
    // Check department for feature update notifications
    let isRelevantFeatureUpdate = true;
    if (user && notification.type === 'feature_update') {
      // Only add feature update notifications if they're for the user's department
      // If department is not specified, we include it for backward compatibility
      const department = (notification as any).department;
      if (department && user.department && department !== user.department) {
        isRelevantFeatureUpdate = false;
      }
    }
    
    // Check feature access for HR users notifications (lesson completed, clock in/out)
    let hasHRUsersAccess = true;
    if (user && (notification.type === 'lesson_completed' || notification.type === 'clock_in' || notification.type === 'clock_out')) {
      hasHRUsersAccess = await hasPageAccess(user.id.toString(), 'hr/users');
    }
    
    // If user doesn't have access to chat notifications, don't add them
    if (!hasChatNotificationAccess && (notification.type === 'chat_message' || notification.type === 'chat_status')) {
      return;
    }
    
    // If user doesn't have access to clock notifications, don't add them
    if (!hasClockNotificationAccess && (notification.type === 'location_created' || notification.type === 'location_deleted')) {
      return;
    }
    
    // If user doesn't have access to HR users features, don't add those notifications
    if (!hasHRUsersAccess && (notification.type === 'lesson_completed' || notification.type === 'clock_in' || notification.type === 'clock_out')) {
      return;
    }
    
    // If feature update notification is not relevant to the user's department, don't add it
    if (!isRelevantFeatureUpdate && notification.type === 'feature_update') {
      return;
    }
    
    // Check if a similar notification already exists (to prevent duplicates)
    // But only check against database notifications (permanent ones with numeric IDs)
    const isDuplicate = notifications.some(n => 
      n.title === notification.title && 
      n.message === notification.message &&
      n.type === notification.type &&
      !isNaN(Number(n.id)) && // Only check against permanent notifications
      Math.abs(new Date(n.timestamp).getTime() - new Date(notification.timestamp).getTime()) < 5000 // Within 5 seconds
    );
    
    if (isDuplicate) {
      console.log('Skipping duplicate notification:', notification);
      return;
    }
    
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      read: false
    };
    
    // Play notification sound for new notifications
    playNotificationSound();
    
    setNotifications(prev => {
      const updatedNotifications = [newNotification, ...prev];
      
      // Sort by read status first (unread first), then by timestamp descending (newest first)
      return updatedNotifications.sort((a, b) => {
        // Unread notifications come first
        if (a.read === b.read) {
          // If both have same read status, sort by timestamp (newest first)
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        return a.read ? 1 : -1;
      });
    });
  };

  const markAsRead = async (id: string) => {
    // Update local state
    setNotifications(prev => {
      const updatedNotifications = prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      );
      
      // Re-sort to move newly read notifications to the bottom
      return updatedNotifications.sort((a, b) => {
        // Unread notifications come first
        if (a.read === b.read) {
          // If both have same read status, sort by timestamp (newest first)
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        return a.read ? 1 : -1;
      });
    });
    
    // Update backend if user is logged in and this is a database notification
    if (user && !isNaN(Number(id))) {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      
      try {
        await fetch(`/api/notifications/${id}/read`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Include the auth token
          },
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const markAllAsRead = async () => {
    // Update local state
    setNotifications(prev => {
      const updatedNotifications = prev.map(notification => ({ ...notification, read: true }));
      
      // Re-sort to move all notifications to the bottom
      return updatedNotifications.sort((a, b) => {
        // Unread notifications come first
        if (a.read === b.read) {
          // If both have same read status, sort by timestamp (newest first)
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        return a.read ? 1 : -1;
      });
    });
    
    // Update backend if user is logged in
    if (user) {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      
      try {
        await fetch('/api/notifications/read-all', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Include the auth token
          },
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
      }
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // New method to clear only read notifications
  const clearReadNotifications = async () => {
    // Update local state
    setNotifications(prev => prev.filter(notification => !notification.read));
    
    // Update backend if user is logged in
    if (user) {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      
      try {
        await fetch('/api/notifications/read', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Include the auth token
          },
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to clear read notifications:', error);
      }
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount,
      addNotification, 
      markAsRead, 
      markAllAsRead,
      clearNotifications,
      clearReadNotifications,
      fetchNotifications,
      setCurrentPage, // Expose setCurrentPage method
      playNotificationSound // Expose playNotificationSound method
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}