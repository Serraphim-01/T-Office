'use client';

import { useState, useEffect } from 'react';
import { X, MessageCircle, CheckCircle, AlertCircle, Pause, Play } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useNotification } from '@/lib/notification-context';
import { useRouter } from 'next/navigation';

interface NotificationPanelProps {
  isOpen: boolean; 
  onClose: () => void; 
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, markAsRead, markAllAsRead, clearReadNotifications, fetchNotifications } = useNotification();
  const router = useRouter();
  const hasReadNotifications = notifications.some(n => n.read);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    // Navigate to chat page if it's a chat message notification
    if (notification.type === 'chat_message') {
      router.push('/chat');
    }
    
    onClose();
  };

  // Close panel when pressing Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border">
            <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
              >
                Mark all as read
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1">
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No notifications
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <li 
                      key={notification.id} 
                      className={`p-4 hover:bg-accent cursor-pointer ${!notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex justify-between">
                        <h3 className="font-medium text-foreground flex items-center">
                          {notification.type === 'chat_message' ? (
                            <MessageCircle className="h-4 w-4 mr-2 text-blue-500" />
                          ) : notification.type === 'chat_status' ? (
                            notification.title.includes('Paused') ? (
                              <Pause className="h-4 w-4 mr-2 text-yellow-500" />
                            ) : (
                              <Play className="h-4 w-4 mr-2 text-green-500" />
                            )
                          ) : notification.type === 'success' ? (
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
                          )}
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="flex h-2 w-2 rounded-full bg-blue-600 mt-1.5"></span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </ScrollArea>
          
          {notifications.length > 0 && (
            <div className="p-4 border-t border-border flex justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearReadNotifications}
                disabled={!hasReadNotifications}
                className={hasReadNotifications ? "" : "opacity-50"}
              >
                Clear read notifications
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}