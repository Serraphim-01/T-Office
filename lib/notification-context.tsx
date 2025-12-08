'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import io from 'socket.io-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  messageId?: number; // For chat messages
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  clearReadNotifications: () => void; // Add this method
  fetchNotifications: () => Promise<void>; // Add fetch method
  setCurrentPage: (page: string) => void; // Add method to set current page
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<string>(''); // Track current page
  const { user } = useAuth(); // Get user from auth context

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
        const formattedNotifications = backendNotifications.map((n: any) => ({
          id: n.id.toString(), // Database IDs are strings
          type: n.type,
          title: n.title,
          message: n.message,
          timestamp: n.timestamp,
          read: n.read,
          messageId: n.messageId
        }));
        
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
          
          // Sort by timestamp descending (newest first)
          return merged.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
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
      newSocket.on('notification', (notificationData) => {
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
            return [newNotification, ...prevNotifications];
          }
          
          // Return unchanged if duplicate
          return prevNotifications;
        });
      });

      return () => {
        newSocket.close();
      };
    }
  }, [user]); // Depend only on user changes, not notifications

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

  const addNotification = (notification: Omit<Notification, 'id' | 'read'>) => {
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
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = async (id: string) => {
    // Update local state
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    
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
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    
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
      setCurrentPage // Expose setCurrentPage method
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