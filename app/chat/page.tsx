'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Send, Users, MessageCircle, Shield, Clock, FileText, ChevronDown, Pause, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useNotification } from '@/lib/notification-context';
import { hasPageAccess } from '@/lib/page-access';

interface Message {
  id: number;
  text: string;
  created_at: Date;
  is_moderator?: boolean;
}

interface GlobalPauseStatus {
  is_chat_paused: boolean;
  paused_by: number | null;
  paused_at: string | null;
}

export default function ChatPage() {
  const { user, loading } = useAuth();
  const { notifications, markAsRead } = useNotification();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCheckingToxicity, setIsCheckingToxicity] = useState(false);
  const [toxicityWarning, setToxicityWarning] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [timeRange, setTimeRange] = useState('last_7_days');
  const [isModeratorMode, setIsModeratorMode] = useState(false);
  const [isChatPaused, setIsChatPaused] = useState(false);
  const [isChatGloballyPaused, setIsChatGloballyPaused] = useState(false);
  const [globalPauseInfo, setGlobalPauseInfo] = useState<GlobalPauseStatus | null>(null);
  const [canUseChat, setCanUseChat] = useState(false);
  const [canUseModerator, setCanUseModerator] = useState(false);
  const [canPauseChat, setCanPauseChat] = useState(false);
  const [canUseSummarizer, setCanUseSummarizer] = useState(false);
  const [canClearChat, setCanClearChat] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<number>(0);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Check feature access when user loads
  useEffect(() => {
    if (user) {
      checkFeatureAccess();
    }
  }, [user]);

  // Show guidelines modal only on first visit
  useEffect(() => {
    if (user && canUseChat) {
      const hasSeenGuidelines = localStorage.getItem('chatGuidelinesShown');
      if (!hasSeenGuidelines) {
        setShowGuidelines(true);
        localStorage.setItem('chatGuidelinesShown', 'true');
      }
    }
  }, [user, canUseChat]);

  // Track unread messages
  useEffect(() => {
    if (user && messages.length > 0) {
      // Find the highest message ID
      const maxMessageId = Math.max(...messages.map(m => m.id));
      
      // If this is the first load or we have new messages
      if (maxMessageId > lastMessageIdRef.current) {
        // Count unread messages (messages newer than last seen)
        const newUnreadCount = messages.filter(m => m.id > lastMessageIdRef.current).length;
        setUnreadMessageCount(newUnreadCount);
        lastMessageIdRef.current = maxMessageId;
      }
    }
  }, [messages, user]);

  // Mark chat notifications as read when entering the chat page
  useEffect(() => {
    if (user) {
      // Filter chat notifications and mark them as read
      notifications
        .filter(n => n.type === 'chat_message' && !n.read)
        .forEach(n => markAsRead(n.id));
        
      // Reset unread count when entering chat
      setUnreadMessageCount(0);
    }
  }, [user, notifications, markAsRead]);

  const checkFeatureAccess = async () => {
    if (!user) return;
    
    // Check access to main chat page first
    const chatAccess = await hasPageAccess(user.id.toString(), 'chat');
    
    if (!chatAccess) {
      // If no access to main chat page, disable all chat features
      setCanUseChat(false);
      setCanUseModerator(false);
      setCanPauseChat(false);
      setCanUseSummarizer(false);
      setCanClearChat(false);
      return;
    }
    
    // If user has access to main chat page, check individual features
    setCanUseChat(true);
    
    // Check access to various chat features using the page access system
    const moderatorAccess = await hasPageAccess(user.id.toString(), 'chat/moderator');
    const pauseAccess = await hasPageAccess(user.id.toString(), 'chat/pause');
    const summarizerAccess = await hasPageAccess(user.id.toString(), 'chat/summarizer');
    const clearAccess = await hasPageAccess(user.id.toString(), 'chat/clear');
    
    setCanUseModerator(moderatorAccess);
    setCanPauseChat(pauseAccess);
    setCanUseSummarizer(summarizerAccess);
    setCanClearChat(clearAccess);
  };

  // Load messages and chat settings from backend
  useEffect(() => {
    if (user && canUseChat) {
      fetchMessages();
      fetchChatSettings();
      fetchGlobalPauseStatus();
    }
  }, [user, canUseChat]);

  // Poll for new messages and global pause status every 3 seconds
  useEffect(() => {
    if (!user || !canUseChat) return;

    const interval = setInterval(() => {
      fetchMessages();
      fetchGlobalPauseStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [user, canUseChat]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  // If user doesn't have access to chat page, show access denied message
  if (!canUseChat) {
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col">
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
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-destructive" />
                  Access Denied
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  You don't have permission to access the chat feature. Please contact your administrator.
                </p>
                <Button onClick={() => router.push('/dashboard')}>
                  Return to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/chat/messages/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.map((msg: any) => ({
          id: msg.id,
          text: msg.text,
          created_at: new Date(msg.created_at),
          is_moderator: msg.is_moderator
        })));
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const fetchChatSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/chat/settings/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setIsChatPaused(data.is_paused || false);
      }
    } catch (error) {
      console.error('Failed to fetch chat settings:', error);
    }
  };

  // Add this new function
  const fetchGlobalPauseStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/chat/global-pause`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data: GlobalPauseStatus = await response.json();
        setIsChatGloballyPaused(data.is_chat_paused || false);
        setGlobalPauseInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch global pause status:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isCheckingToxicity) return;
    
    // Check if chat is paused (either locally or globally) and user is not a moderator
    if ((isChatPaused || isChatGloballyPaused) && !isModeratorMode) {
      alert('Chat is currently paused. Only moderators can send messages.');
      return;
    }

    const text = newMessage.trim();
    setIsCheckingToxicity(true);
    setToxicityWarning(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          text,
          is_moderator: (user?.department === 'Admin' || user?.department === 'HR') && isModeratorMode
        }),
      });

      if (response.ok) {
        const newMsg = await response.json();
        setMessages((prev) => [...prev, {
          id: newMsg.id,
          text: newMsg.text,
          created_at: new Date(newMsg.created_at),
          is_moderator: newMsg.is_moderator
        }]);
        setNewMessage('');
        setToxicityWarning(null);
      } else {
        const errorData = await response.json();
        if (errorData.toxicType) {
          setToxicityWarning(`The word(s) "${errorData.toxicType}" are considered inappropriate. Please remove them to send your message.`);
        } else {
          alert(errorData.error || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    } finally {
      setIsCheckingToxicity(false);
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${day}/${month}/${year}, ${time}`;
  };

  const clearChat = async () => {
    if (!user || !canClearChat) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/chat/cleanup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setMessages([]);
        alert('Chat messages cleared successfully');
      } else {
        alert('Failed to clear chat messages');
      }
    } catch (error) {
      console.error('Error clearing chat:', error);
      alert('Error clearing chat messages');
    }
  };

  const toggleChatPause = async () => {
    if (!user || !canPauseChat) return;

    // Determine the new pause state (opposite of current global state)
    const newPauseState = !(isChatGloballyPaused || isChatPaused);

    try {
      const token = localStorage.getItem('token');
      // Use global pause endpoint
      const response = await fetch(`http://localhost:4000/api/chat/global-pause`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          is_chat_paused: newPauseState
        }),
      });

      if (response.ok) {
        // Refresh global pause status for all users
        fetchGlobalPauseStatus();
      } else {
        alert('Failed to toggle chat pause');
      }
    } catch (error) {
      console.error('Error toggling chat pause:', error);
      alert('Error toggling chat pause');
    }
  };

  const handleSummarize = async (useDefaultSettings = true) => {
    if (!user || !canUseSummarizer) return;

    setIsSummarizing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/chat/summaries/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messageCount: useDefaultSettings ? 50 : parseInt(timeRange) || 50,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary_text || 'Summary generated successfully');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Error summarizing chat:', error);
      alert('Error generating summary');
    } finally {
      setIsSummarizing(false);
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
                {unreadMessageCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadMessageCount} unread
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground mt-1">
                Open communication space for honest feedback and discussions
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Shield className="mr-1 h-4 w-4" />
                  Anonymous & Secure
                </div>
              </div>

              {/* Summarize Button - Available based on feature access */}
              {canUseSummarizer && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSummarize(true)}
                    disabled={isSummarizing}
                    className="flex items-center"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Summarize
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <div className="p-3 space-y-3">
                        <div>
                          <Label htmlFor="timeRange" className="text-sm">Message Count</Label>
                          <select
                            id="timeRange"
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                          >
                            <option value="20">Last 20 messages</option>
                            <option value="50">Last 50 messages</option>
                            <option value="100">Last 100 messages</option>
                            <option value="200">Last 200 messages</option>
                          </select>
                        </div>

                        <Button
                          onClick={() => handleSummarize(false)}
                          disabled={isSummarizing}
                          className="w-full"
                        >
                          {isSummarizing ? 'Generating...' : 'Generate Summary'}
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Dialog open={!!summary} onOpenChange={() => setSummary(null)}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Chat Summary</DialogTitle>
                      </DialogHeader>
                      <div className="mt-4">
                        {summary ? (
                          <div className="prose prose-sm max-w-none">
                            <p className="text-sm text-muted-foreground mb-4">
                              {summary.split('\n').map((line, index) => {
                                if (line.toLowerCase().includes('action') || line.includes('•') || line.includes('-')) {
                                  return <span key={index} className="font-semibold block">{line}</span>;
                                }
                                return <span key={index} className="block">{line}</span>;
                              })}
                            </p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No summary available.</p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {/* Pause/Resume Chat Button - Available based on feature access */}
              {canPauseChat && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleChatPause}
                  className={cn(
                    "flex items-center",
                    (isChatPaused || isChatGloballyPaused) ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100" : ""
                  )}
                >
                  {(isChatPaused || isChatGloballyPaused) ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                  {(isChatPaused || isChatGloballyPaused) ? 'Resume Chat' : 'Pause Chat'}
                </Button>
              )}

              {/* Clear Chat Button - Available based on feature access */}
              {canClearChat && (
                <Button variant="outline" size="sm" onClick={clearChat}>
                  Clear Chat
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGuidelines(true)}
              >
                Chat Guidelines
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
                {true ? (
                  messages.length === 0 ? (
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
                          message.is_moderator ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm border",
                            message.is_moderator
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border text-card-foreground"
                          )}
                        >
                          {/* Only show moderator badge if user has moderator feature access */}
                          {message.is_moderator && canUseModerator && (
                            <div className="flex items-center mb-1">
                              <Badge variant="secondary" className="text-xs bg-primary-foreground/20 text-primary-foreground">
                                <Shield className="mr-1 h-3 w-3" />
                                Moderator
                              </Badge>
                            </div>
                          )}
                          <p className="text-sm">{message.text}</p>
                          <div className="flex items-center justify-end mt-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                message.is_moderator
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : ""
                              )}
                            >
                              <Clock className="mr-1 h-3 w-3" />
                              {formatTime(new Date(message.created_at))}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <div className="text-center py-12">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Access Denied</h3>
                    <p className="text-muted-foreground">You don't have permission to view chat messages.</p>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-6 bg-background border-t border-border">
                {/* Chat Paused Warning */}
                {(isChatPaused || isChatGloballyPaused) && !isModeratorMode && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium flex items-center">
                      <Pause className="mr-2 h-4 w-4" />
                      Chat is currently paused. Only moderators can send messages.
                    </p>
                  </div>
                )}

                {/* Toxicity Warning */}
                {toxicityWarning && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ {toxicityWarning}
                    </p>
                  </div>
                )}

                <div className="flex space-x-2">
                  {/* Moderator Mode Toggle - Available based on feature access */}
                  {canUseModerator && (
                    <div className="flex items-center space-x-2 pr-4 border-r border-border">
                      <input
                        type="checkbox"
                        id="moderatorMode"
                        checked={isModeratorMode}
                        onChange={(e) => setIsModeratorMode(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="moderatorMode" className="text-sm font-medium">
                        Moderator Mode
                      </Label>
                    </div>
                  )}

                  <Input
                    placeholder={
                      isChatPaused && !isModeratorMode
                        ? "Chat is paused - only moderators can send messages"
                        : isModeratorMode
                        ? "Type your moderator message..."
                        : "Type your message..."
                    }
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      if (toxicityWarning) setToxicityWarning(null);
                    }}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    disabled={isCheckingToxicity || (isChatPaused && !isModeratorMode)}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isCheckingToxicity || (isChatPaused && !isModeratorMode)}
                  >
                    {isCheckingToxicity ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send • {isModeratorMode ? 'Posting as Moderator' : 'Your identity remains anonymous'} • Messages are session-based
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Guidelines Modal */}
        <Dialog open={showGuidelines} onOpenChange={setShowGuidelines}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>Chat Guidelines</DialogTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowGuidelines(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="mt-4 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Anonymous Communication</h3>
                <p className="text-muted-foreground">
                  Your identity is protected. Use randomly assigned names for open, honest discussions.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Respectful Environment</h3>
                <p className="text-muted-foreground">
                  Maintain professionalism and respect for all participants in discussions.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Session-Based Storage</h3>
                <p className="text-muted-foreground">
                  Messages are stored in the database and can be cleared by administrators.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Chat Moderation</h3>
                <p className="text-muted-foreground">
                  Any user can pause the chat to prevent new messages from all users except moderators.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Constructive Feedback</h3>
                <p className="text-muted-foreground">
                  Use this space for constructive feedback and collaborative problem-solving.
                </p>
              </div>
              
              <div className="p-4 bg-primary/10 rounded-lg">
                <h4 className="text-sm font-medium text-primary mb-2">💡 Pro Tip</h4>
                <p className="text-xs text-primary/80">
                  Anonymous chat works best when everyone participates respectfully and focuses on constructive communication.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}