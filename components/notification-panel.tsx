'use client';

import { useState, useEffect } from 'react';
import { X, MessageCircle, CheckCircle, AlertCircle, Pause, Play, Shield, BookOpen, LogIn, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useNotification } from '@/lib/notification-context';
import { useRouter } from 'next/navigation';
import { Badge } from './ui/badge';

interface NotificationPanelProps {
  isOpen: boolean; 
  onClose: () => void; 
}

interface DisplayNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  messageId?: number;
  department?: string;
  isGroup?: boolean;
  count?: number;
  user_name?: string; // For HR notifications
  lesson_name?: string; // For lesson completion notifications
  location?: string; // For clock notifications
  user_id?: number; // For navigation to user details
  comment?: {
    text: string;
    commenter: string;
  }; // For lesson completion notifications with comments
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

  // Group notifications by type and title for merging (only unread messages)
  const groupedNotifications = (() => {
    const groups: Record<string, any> = {};
    
    notifications.forEach(notification => {
      // For chat messages, group them together only if they are unread
      if (notification.type === 'chat_message' && !notification.read) {
        // Create separate groups for regular and moderator messages
        const key = notification.title.includes('Moderator') ? 'moderator_message_group' : 'chat_message_group';
        if (!groups[key]) {
          groups[key] = {
            ...notification,
            count: 1,
            isGroup: true,
            // Only track database notifications (those with numeric IDs) for counting
            groupedIds: !isNaN(Number(notification.id)) ? [notification.id] : []
          };
        } else {
          // Update timestamp to the newest one
          if (new Date(notification.timestamp) > new Date(groups[key].timestamp)) {
            groups[key].timestamp = notification.timestamp;
          }
          
          // Only count database notifications (those with numeric IDs)
          if (!isNaN(Number(notification.id))) {
            // Add to grouped IDs if not already there
            if (!groups[key].groupedIds.includes(notification.id)) {
              groups[key].groupedIds.push(notification.id);
              groups[key].count = groups[key].groupedIds.length;
            }
          }
        }
      } else {
        // For other notifications or read chat messages, keep them individual
        groups[notification.id] = notification;
      }
    });
    
    return groups;
  })();

  // Convert grouped notifications back to array and sort by read status
  const displayNotifications = Object.values(groupedNotifications).map(item => {
    // Remove the groupedIds property as it's only used for internal tracking
    const { groupedIds, ...displayItem } = item as any;
    return displayItem;
  }).sort((a, b) => {
    // Unread notifications come first (read = false), then read notifications (read = true)
    if (a.read === b.read) {
      // If both have same read status, sort by timestamp (newest first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    return a.read ? 1 : -1;
  });

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'chat_message') {
      router.push('/chat');
    } else if (notification.type === 'location_created' || notification.type === 'location_deleted') {
      router.push('/clock');
    } else if (notification.type === 'clock_in' || notification.type === 'clock_out') {
      // Navigate to user details page with attendance tab
      if (notification.user_id && !isNaN(notification.user_id)) {
        router.push(`/hr/users/${notification.user_id}?tab=attendance`);
      } else {
        router.push('/hr/users');
      }
    } else if (notification.type === 'lesson_completed') {
      // Navigate to user details page with wiki tab
      if (notification.user_id && !isNaN(notification.user_id)) {
        router.push(`/hr/users/${notification.user_id}?tab=wiki`);
      } else {
        router.push('/hr/users');
      }
    } else if (notification.type === 'feature_update') {
      // Feature update notifications are department-specific and should not navigate
      // The cursor is already set to default for these notifications
    }
    
    // Only close the panel for actionable notifications
    if (notification.type !== 'feature_update') {
      onClose();
    }
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
              {displayNotifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No notifications
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {displayNotifications.map((notification) => (
                    <li 
                      key={notification.id} 
                      className={`p-4 hover:bg-accent ${!notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''} ${notification.type === 'feature_update' ? 'cursor-default' : 'cursor-pointer'}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex justify-between">
                        <h3 className="font-medium text-foreground flex items-center">
                          {notification.type === 'chat_message' ? (
                            notification.title.includes('Moderator') ? (
                              <Shield className="h-4 w-4 mr-2 text-red-500" />
                            ) : (
                              <MessageCircle className="h-4 w-4 mr-2 text-blue-500" />
                            )
                          ) : notification.type === 'chat_status' ? (
                            notification.title.includes('Paused') ? (
                              <Pause className="h-4 w-4 mr-2 text-yellow-500" />
                            ) : (
                              <Play className="h-4 w-4 mr-2 text-green-500" />
                            )
                          ) : notification.type === 'feature_update' ? (
                            <AlertCircle className="h-4 w-4 mr-2 text-purple-500" />
                          ) : notification.type === 'lesson_completed' ? (
                            <BookOpen className="h-4 w-4 mr-2 text-blue-500" />
                          ) : notification.type === 'clock_in' ? (
                            <LogIn className="h-4 w-4 mr-2 text-green-500" />
                          ) : notification.type === 'clock_out' ? (
                            <LogOut className="h-4 w-4 mr-2 text-red-500" />
                          ) : notification.type === 'success' ? (
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
                          )}
                          {notification.isGroup && notification.count > 1 ? (
                            <span>{notification.title} ({notification.count} new)</span>
                          ) : (
                            notification.title
                          )}
                        </h3>
                        {!notification.read && (
                          <span className="flex h-2 w-2 rounded-full bg-blue-600 mt-1.5"></span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.isGroup && notification.count > 1 ? (
                          notification.title.includes('Moderator') ? (
                            <span>{notification.count} new moderator messages in chat</span>
                          ) : (
                            <span>{notification.count} new messages in chat</span>
                          )
                        ) : (
                          <>
                            {notification.message}
                            {notification.type === 'lesson_completed' && notification.comment && (
                              <span className="block mt-1 text-xs italic">
                                Latest comment: "{notification.comment.text}" by {notification.comment.commenter}
                              </span>
                            )}
                            {notification.type === 'clock_in' && (
                              <span className="block mt-1 text-xs">
                                {notification.user_name} clocked in at {notification.location}
                              </span>
                            )}
                            {notification.type === 'clock_out' && (
                              <span className="block mt-1 text-xs">
                                {notification.user_name} clocked out at {notification.location}
                              </span>
                            )}
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                      {notification.isGroup && notification.count > 1 && (
                        <Badge variant="secondary" className="mt-2">
                          {notification.title.includes('Moderator') ? (
                            <span>{notification.count} new moderator messages</span>
                          ) : (
                            <span>{notification.count} new messages</span>
                          )}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </ScrollArea>
          
          {displayNotifications.length > 0 && (
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
