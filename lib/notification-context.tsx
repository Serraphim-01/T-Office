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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<any>(null);
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
          id: n.id.toString(),
          type: n.type,
          title: n.title,
          message: n.message,
          timestamp: n.timestamp,
          read: n.read,
          messageId: n.messageId
        }));
        
        // Merge with existing notifications, prioritizing newer ones
        setNotifications(prev => {
          const merged = [...formattedNotifications];
          const existingIds = new Set(formattedNotifications.map((n: Notification) => n.id));
          
          // Add existing notifications that aren't in the backend response
          prev.forEach(notification => {
            // Only add temporary notifications that don't have a database ID
            if (!existingIds.has(notification.id) && isNaN(Number(notification.id))) {
              merged.push(notification);
            }
          });
          
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

      // Listen for notifications
      newSocket.on('notification', (notificationData) => {
        // Check if this notification already exists in our list
        const exists = notifications.some(n => 
          n.title === notificationData.title && 
          n.message === notificationData.message &&
          Math.abs(new Date(n.timestamp).getTime() - new Date(notificationData.timestamp).getTime()) < 5000 // Within 5 seconds
        );
        
        // Only add if it doesn't already exist
        if (!exists) {
          addNotification({
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            timestamp: notificationData.timestamp,
            messageId: notificationData.messageId
          });
        }
      });

      return () => {
        newSocket.close();
      };
    }
  }, [user, notifications]); // Depend on user and notifications changes

  const addNotification = (notification: Omit<Notification, 'id' | 'read'>) => {
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
      fetchNotifications
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