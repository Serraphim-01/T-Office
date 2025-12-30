'use client';

import { useRef, useState, useEffect } from 'react';
import { X, Bot, Send, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatbotSidebarProps {
  isOpen: boolean; 
  onClose: () => void; 
}

export function ChatbotSidebar({ isOpen, onClose }: ChatbotSidebarProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your T-Office AI assistant. I can help you with information about users, inventory, HR data, and more. What would you like to know?',
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  // Add event listeners when panel is open
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Simulate AI response - in a real implementation, this would call an API
      // that connects to the database and processes the request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a response based on common queries
      let responseContent = '';
      
      const lowerInput = inputValue.toLowerCase();
      
      if (lowerInput.includes('user') || lowerInput.includes('employee')) {
        responseContent = "I can help you find user information. For example, you can ask about specific users, their departments, or their status. In a real implementation, I would query the users table in the database.";
      } else if (lowerInput.includes('inventory') || lowerInput.includes('product') || lowerInput.includes('stock')) {
        responseContent = "I can help you with inventory information. I can check product quantities, locations, and movement history. In a real implementation, I would access the inventory tables in the database.";
      } else if (lowerInput.includes('hr') || lowerInput.includes('onboard') || lowerInput.includes('offboard')) {
        responseContent = "I can provide HR-related information. I can check onboarding status, user lifecycle, or support assignments. In a real implementation, I would access HR-related tables in the database.";
      } else if (lowerInput.includes('chat') || lowerInput.includes('message')) {
        responseContent = "I can provide information about chat activity and messages. In a real implementation, I would access the chat-related tables in the database.";
      } else if (lowerInput.includes('clock') || lowerInput.includes('time') || lowerInput.includes('check')) {
        responseContent = "I can provide information about clock-in/clock-out data and attendance. In a real implementation, I would access the clock-related tables in the database.";
      } else {
        responseContent = "I'm your T-Office AI assistant. I can help with various queries related to users, inventory, HR, chat, and clock data. In a real implementation, I would connect to the database to provide actual information based on your request.";
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)] p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="text-sm">{message.content}</div>
                        <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-gray-500'}`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-800 rounded-lg p-3 max-w-[80%]">
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about users, inventory, HR data..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isLoading || !inputValue.trim()}
                    size="sm"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Ask about users, inventory, HR data, or other T-Office information
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}