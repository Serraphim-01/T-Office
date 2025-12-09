'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotification } from '@/lib/notification-context';
import { MessageCircle, Bell, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationTestPage() {
  const { addNotification } = useNotification();
  const router = useRouter();

  const sendTestNotification = async () => {
    await addNotification({
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification from the notification system',
      timestamp: new Date().toISOString()
    });
  };

  const sendChatNotification = async () => {
    await addNotification({
      type: 'chat_message',
      title: 'New Chat Message',
      message: 'You have a new message in the chat room',
      timestamp: new Date().toISOString()
    });
  };

  const sendSuccessNotification = async () => {
    await addNotification({
      type: 'success',
      title: 'Operation Successful',
      message: 'Your action was completed successfully',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Notification System Test</CardTitle>
            <CardDescription>
              Test the notification system functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={sendTestNotification}
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <Bell className="h-6 w-6" />
                <span>Send Test Notification</span>
              </Button>
              
              <Button 
                onClick={sendChatNotification}
                className="h-24 flex flex-col items-center justify-center gap-2"
                variant="secondary"
              >
                <MessageCircle className="h-6 w-6" />
                <span>Send Chat Notification</span>
              </Button>
              
              <Button 
                onClick={sendSuccessNotification}
                className="h-24 flex flex-col items-center justify-center gap-2"
                variant="outline"
              >
                <CheckCircle className="h-6 w-6" />
                <span>Send Success Notification</span>
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <Button onClick={() => router.push('/chat')}>
                Go to Chat Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}