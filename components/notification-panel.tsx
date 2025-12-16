'use client';

import { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, CheckCircle, AlertCircle, Pause, Play, Shield, BookOpen, LogIn, LogOut, User, UserPlus, UserMinus, UserX, Package, Truck, Archive, Send } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useNotification } from '@/lib/notification-context';
import { useRouter } from 'next/navigation';
import { Badge } from './ui/badge';
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess } from '@/lib/page-access';

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
  const { user } = useAuth();
  const hasReadNotifications = notifications.some(n => !n.read);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Handle click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleNotificationClick = async (notification: any) => {
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
      // Check if user has access to HR features before navigating
      if (user?.id) {
        const hasOnboardingAccess = await hasPageAccess(user.id.toString(), 'hr/onboarding');
        const hasUsersAccess = await hasPageAccess(user.id.toString(), 'hr/users');
        
        // Only navigate if user has access to HR features
        if (hasOnboardingAccess || hasUsersAccess) {
          if (notification.user_id && !isNaN(notification.user_id)) {
            router.push(`/hr/users/${notification.user_id}`);
          } else {
            router.push('/hr/users');
          }
        }
      }
    } else if (notification.type === 'feature_update') {
      // Feature update notifications are department-specific and should not navigate
      // The cursor is already set to default for these notifications
    } else if (notification.type.startsWith('inventory_')) {
      // Navigate to the appropriate inventory page based on notification type
      if (notification.type.includes('export')) {
        // For export notifications, go to products page
        router.push('/inventory/products');
      } else if (notification.type.includes('import')) {
        // For import notifications, go to products page
        router.push('/inventory/products');
      } else if (notification.type.includes('inbound')) {
        // For inbound notifications, go to inbound page
        router.push('/inventory/inbound');
      } else {
        // For other inventory notifications, go to products page
        router.push('/inventory/products');
      }
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

  // Determine if notification should have clickable cursor based on user access
  const isNotificationClickable = (notification: any) => {
    // These notification types should always be clickable
    const alwaysClickableTypes = [
      'chat_message',
      'location_created',
      'location_deleted',
      'clock_in',
      'clock_out',
      'lesson_completed',
      'feature_update'
    ];
    
    if (alwaysClickableTypes.includes(notification.type)) {
      return true;
    }
    
    // For HR-related notifications, check access
    const hrTypes = [
      'user_onboarded',
      'user_offboarded',
      'support_assigned',
      'support_removed',
      'support_reassigned'
    ];
    
    if (hrTypes.includes(notification.type)) {
      // For users with HR access, make clickable
      if (user?.id) {
        // In a real implementation, we would check access here
        // For now, we'll make it clickable for everyone and handle access in the click handler
        return true;
      }
      return false;
    }
    
    return true;
  };

  return (
    <>
      {/* Slide-out panel */}
      <div className={`fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Backdrop - only show when panel is open */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40" 
            onClick={onClose}
          />
        )}
        
        {/* Panel */}
        <div 
          ref={panelRef}
          className="relative h-full w-96 bg-white shadow-xl border-l border-gray-200 flex flex-col z-50"
        >
          <Card className="flex-1 flex flex-col h-full rounded-none border-0 border-l">
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
                        className={`p-4 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''} ${isNotificationClickable(notification) ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => isNotificationClickable(notification) && handleNotificationClick(notification)}
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
                          ) : notification.type === 'inventory_provider_created' || notification.type === 'inventory_product_created' ? (
                            <Package className="h-4 w-4 mr-2 text-blue-500 mt-0.5" />
                          ) : notification.type === 'inventory_inbound_created' ? (
                            <Truck className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                          ) : notification.type === 'inventory_import_completed' || notification.type === 'inventory_comprehensive_import_completed' ? (
                            <Archive className="h-4 w-4 mr-2 text-purple-500 mt-0.5" />
                          ) : notification.type === 'inventory_export_completed' ? (
                            <Send className="h-4 w-4 mr-2 text-indigo-500 mt-0.5" />
                          ) : notification.type === 'success' ? (
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-4 w-4 mr-2 text-yellow-500 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {notification.isGroup && notification.count && notification.count > 1 ? (
                                <span className="text-gray-700 font-medium">
                                  {notification.title}
                                </span>
                              ) : (
                                <span className="text-gray-900 font-medium">
                                  {notification.title}
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {notification.isGroup && notification.count && notification.count > 1 ? (
                                <span className="text-gray-500 font-normal">
                                  {notification.count} similar notifications
                                </span>
                              ) : (
                                <span className="text-gray-500 font-normal">
                                  {notification.message}
                                </span>
                              )}
                            </p>
                            {notification.comment && (
                              <div className="mt-2 flex items-center space-x-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-500 font-normal">
                                  {notification.comment.commenter}:
                                </span>
                                <span className="text-sm text-gray-500 font-normal">
                                  "{notification.comment.text}"
                                </span>
                              </div>
                            )}
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
    </>
  );
}
