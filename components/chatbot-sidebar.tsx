'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Bot, Send, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { groqChatService, type ChatMessage, type ChatResponse } from '@/lib/groq-chat-service';

interface ChatbotSidebarProps {
  isOpen: boolean; 
  onClose: () => void; 
}

export function ChatbotSidebar({ isOpen, onClose }: ChatbotSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hello! I'm your AI assistant. How can I help you today?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle click outside to close panel
  const handleClickOutside = (event: MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  // Close panel when pressing Escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    }
    
    // Clean up on unmount or when component closes
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: inputValue.trim() };
    
    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Get conversation history (last 10 messages to keep context manageable)
      const recentHistory = messages.slice(-10);
      
      const response: ChatResponse = await groqChatService.sendMessage(
        userMessage.content,
        recentHistory
      );

      const botMessage: ChatMessage = { 
        role: 'assistant', 
        content: response.message 
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      setError(err.message || 'Failed to get response from AI assistant');
      // Add error message to chat
      const errorMessage: ChatMessage = { 
        role: 'assistant', 
        content: `❌ ${err.message || 'Sorry, I encountered an error. Please try again.'}` 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      { role: 'assistant', content: "Hello! I'm your AI assistant. How can I help you today?" }
    ]);
    setError(null);
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
          className="relative h-full w-[50vw] max-w-[600px] min-w-[400px] bg-white shadow-xl border-l border-gray-200 flex flex-col z-50"
        >
          <Card className="flex-1 flex flex-col h-full rounded-none border-0 border-l">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
              <div className="flex items-center">
                <Bot className="h-5 w-5 mr-2 text-primary" />
                <CardTitle className="text-lg font-semibold">AI Assistant</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col h-full">
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div 
                      key={index} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {message.role === 'user' ? 'U' : 'AI'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`mx-2 px-3 py-2 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex max-w-[80%]">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <div className="mx-2 px-3 py-2 rounded-lg bg-muted flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              {/* Error Message */}
              {error && (
                <div className="px-4 pb-2">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}
              
              {/* Input Form */}
              <form onSubmit={handleSubmit} className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 resize-none"
                    rows={2}
                    disabled={isLoading}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    disabled={isLoading || !inputValue.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <button 
                    type="button" 
                    onClick={clearChat}
                    className="hover:text-foreground transition-colors"
                  >
                    Clear chat
                  </button>
                  <span>Powered by Groq</span>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}