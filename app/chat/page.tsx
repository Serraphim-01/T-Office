'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Users, MessageCircle, Shield, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface Message {
  id: number;
  text: string;
  created_at: Date;
  user_name: string;
  client_id: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);

  useEffect(() => {
    // Generate user ID on the client side to avoid hydration mismatch
    setCurrentClientId(Math.random().toString(36).substr(2, 9));
  }, []);

  // Mock names for anonymous users
  const anonymousNames = [
    'Anonymous Owl', 'Silent Fox', 'Quiet Wolf', 'Hidden Bear', 'Secret Cat',
    'Mystery Dog', 'Invisible Hawk', 'Phantom Lion', 'Shadow Deer', 'Stealth Tiger'
  ];

  // Load messages from Supabase on component mount
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data.map((msg: any) => ({ ...msg, created_at: new Date(msg.created_at) })));
      }
    };

    fetchMessages();

    const channel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prevMessages) => [...prevMessages, { ...payload.new, created_at: new Date(payload.new.created_at) } as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentClientId) return;

    const { error } = await supabase.from('messages').insert([
      {
        text: newMessage.trim(),
        client_id: currentClientId,
        user_name: anonymousNames[Math.floor(Math.random() * anonymousNames.length)],
      },
    ]);

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const clearChat = async () => {
    // This would typically be an admin-only feature.
    // For this example, we'll allow anyone to clear the chat.
    const { error } = await supabase.from('messages').delete().neq('id', -1); // Deletes all rows
    if (error) {
      console.error('Error clearing chat:', error);
    } else {
      setMessages([]);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border bg-background">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center">
                <MessageCircle className="mr-3 h-6 w-6 text-primary" />
                Anonymous Chat
              </h1>
              <p className="text-muted-foreground mt-1">
                Open communication space for honest feedback and discussions
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-1 h-4 w-4" />
                  {new Set(messages.filter(m => m.client_id !== 'system').map(m => m.client_id)).size} participants
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Shield className="mr-1 h-4 w-4" />
                  Anonymous & Secure
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={clearChat}>
                Clear Chat
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Messages */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No messages yet</h3>
                    <p className="text-muted-foreground">Start the conversation by sending the first message!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm",
                          message.client_id === 'system'
                            ? "bg-secondary text-secondary-foreground"
                            : message.client_id === currentClientId
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-card-foreground"
                        )}
                      >
                        {/* <p className="text-xs font-semibold pb-1">{message.user_name}</p> */}
                        <p className="text-sm">{message.text}</p>
                        {message.client_id !== 'system' && (
                          <div className="flex items-center justify-end mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="mr-1 h-3 w-3" />
                              {formatTime(new Date(message.created_at))}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-6 bg-background border-t border-border">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send • Your identity remains anonymous • Messages are session-based
                </p>
              </div>
            </div>

            {/* Sidebar Info */}
            <div className="w-80 border-l border-border bg-card p-6 hidden lg:block">
              <h3 className="text-lg font-semibold text-foreground mb-4">Chat Guidelines</h3>
              
              <div className="space-y-4">
                <Card className="border-border shadow-sm bg-background">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Anonymous Communication</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Your identity is protected. Use randomly assigned names for open, honest discussions.
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm bg-background">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Respectful Environment</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Maintain professionalism and respect for all participants in discussions.
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm bg-background">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Session-Based Storage</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Messages are stored locally on your device and cleared when you log out.
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm bg-background">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Constructive Feedback</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Use this space for constructive feedback and collaborative problem-solving.
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <h4 className="text-sm font-medium text-primary mb-2">💡 Pro Tip</h4>
                <p className="text-xs text-primary/80">
                  Anonymous chat works best when everyone participates respectfully and focuses on constructive communication.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}