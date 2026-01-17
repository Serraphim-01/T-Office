'use client';

import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { ChatbotComponent } from './chatbot-component';

interface ChatbotSidebarProps {
  isOpen: boolean; 
  onClose: () => void; 
}

export function ChatbotSidebar({ isOpen, onClose }: ChatbotSidebarProps) {
  const panelRef = useRef<HTMLDivElement>(null);

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
          <ChatbotComponent isOpen={isOpen} onClose={onClose} />
        </div>
      </div>
    </>
  );
}
