'use client';

import { useState, useEffect } from 'react';
import { X, MessageCircle, CheckCircle, AlertCircle, Pause, Play, Shield, BookOpen, LogIn, LogOut, User, UserPlus, UserMinus, UserX } from 'lucide-react';
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

// Define our own notification interface to avoid conflicts with browser Notification API
interface AppNotification {
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
  const hasReadNotifications = notifications.some(n => !n.read);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

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
    } else if (notification.type === 'user_onboarded' || 
               notification.type === 'user_offboarded' || 
               notification.type === 'support_assigned' || 
               notification.type === 'support_removed' ||
               notification.type === 'support_reassigned') {
      // Navigate to user details page
      if (notification.user_id && !isNaN(notification.user_id)) {
        router.push(`/hr/users/${notification.user_id}`);
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

  // Group notifications by type and user for display
  const groupedNotifications: Record<string, any[]> = notifications.reduce((groups: Record<string, any[]>, notification) => {
    // Create a unique key for grouping similar notifications
    let groupKey = notification.type;
    
    // For certain notification types, group by user
    if (['clock_in', 'clock_out', 'lesson_completed'].includes(notification.type) && notification.user_name) {
      groupKey += `_${notification.user_name}`;
    }
    
    // For feature updates, group by department
    if (notification.type === 'feature_update' && notification.department) {
      groupKey += `_${notification.department}`;
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
    return groups;
  }, {});

  // Convert grouped notifications to display format
  const displayNotifications: AppNotification[] = Object.entries(groupedNotifications).map(([groupKey, group]) => {
    if (group.length > 1) {
      // Create a group notification for multiple similar notifications
      const firstNotification = group[0];
      return {
        ...firstNotification,
        isGroup: true,
        count: group.length,
        title: `${firstNotification.title} (${group.length} new)`,
      };
    } else {
      // Single notification
      return {
        ...group[0],
        isGroup: false,
      };
    }
  });

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose}>
          <div className="absolute top-16 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[calc(100vh-4rem)] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <Card className="flex-1 flex flex-col h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
                <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                  <span className="text-sm text-gray-500">{displayNotifications.filter(n => !n.read).length} unread</span>
                  {hasReadNotifications && (
                    <div className="space-x-2">
                      <Button variant="outline" size="sm" onClick={markAllAsRead}>Mark all as read</Button>
                      <Button variant="outline" size="sm" onClick={clearReadNotifications}>Clear read</Button>
                    </div>
                  )}
                </div>
                <ScrollArea className="flex-1">
                  {displayNotifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {displayNotifications.map((notification) => (
                        <li 
                          key={notification.id} 
                          className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start">
                            {notification.type === 'chat_message' ? (
                              <MessageCircle className="h-4 w-4 mr-2 text-blue-500 mt-0.5" />
                            ) : notification.type === 'location_created' || notification.type === 'location_deleted' ? (
                              <AlertCircle className="h-4 w-4 mr-2 text-purple-500 mt-0.5" />
                            ) : notification.type === 'chat_status' ? (
                              notification.message.includes('paused') ? (
                                <Pause className="h-4 w-4 mr-2 text-yellow-500 mt-0.5" />
                              ) : (
                                <Play className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                              )
                            ) : notification.type === 'feature_update' ? (
                              <AlertCircle className="h-4 w-4 mr-2 text-purple-500 mt-0.5" />
                            ) : notification.type === 'lesson_completed' ? (
                              <BookOpen className="h-4 w-4 mr-2 text-blue-500 mt-0.5" />
                            ) : notification.type === 'clock_in' ? (
                              <LogIn className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                            ) : notification.type === 'clock_out' ? (
                              <LogOut className="h-4 w-4 mr-2 text-red-500 mt-0.5" />
                            ) : notification.type === 'user_onboarded' ? (
                              <UserPlus className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                            ) : notification.type === 'user_offboarded' ? (
                              <UserX className="h-4 w-4 mr-2 text-red-500 mt-0.5" />
                            ) : notification.type === 'support_assigned' || notification.type === 'support_reassigned' ? (
                              <UserPlus className="h-4 w-4 mr-2 text-blue-500 mt-0.5" />
                            ) : notification.type === 'support_removed' ? (
                              <UserMinus className="h-4 w-4 mr-2 text-orange-500 mt-0.5" />
                            ) : notification.type === 'success' ? (
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                            ) : (
                              <AlertCircle className="h-4 w-4 mr-2 text-yellow-500 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {notification.isGroup && notification.count && notification.count > 1 ? (
                                  <span>{notification.title} ({notification.count} new)</span>
                                ) : (
                                  notification.title
                                )}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-400">
                                  {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {!notification.read && (
                                  <Badge variant="secondary" className="h-2 w-2 p-0 bg-blue-500">
                                    <span className="sr-only">Unread</span>
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}