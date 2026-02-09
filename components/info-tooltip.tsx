'use client';

import { Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  title: string;
  description: string;
  className?: string;
}

export function InfoTooltip({ title, description, className = '' }: InfoTooltipProps) {
  const [position, setPosition] = useState<React.CSSProperties>({ 
    left: '50%', 
    transform: 'translateX(-50%)',
    bottom: 'calc(100% + 8px)'
  });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      if (tooltipRef.current && iconRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const iconRect = iconRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Calculate if tooltip would go outside viewport
        const tooltipRightEdge = iconRect.left + (tooltipRect.width / 2);
        const tooltipLeftEdge = iconRect.left - (tooltipRect.width / 2);
        const tooltipTopEdge = iconRect.top - tooltipRect.height - 8; // 8px margin

        const newPosition: React.CSSProperties = { ...position };

        // Handle horizontal positioning
        if (tooltipRightEdge > viewportWidth - 16) { // 16px padding
          // Tooltip goes off right edge - position from right
          Object.assign(newPosition, { 
            right: '0', 
            left: 'auto', 
            transform: 'none' 
          });
        } else if (tooltipLeftEdge < 16) { // 16px padding
          // Tooltip goes off left edge - position from left
          Object.assign(newPosition, { 
            left: '0', 
            right: 'auto', 
            transform: 'none' 
          });
        } else {
          // Tooltip fits in center
          Object.assign(newPosition, { 
            left: '50%', 
            right: 'auto', 
            transform: 'translateX(-50%)' 
          });
        }

        // Handle vertical positioning if tooltip goes above viewport
        if (tooltipTopEdge < 16) {
          // Position tooltip below the icon instead
          Object.assign(newPosition, {
            top: 'calc(100% + 8px)',
            bottom: 'auto'
          });
        } else {
          // Keep tooltip above the icon
          Object.assign(newPosition, {
            bottom: 'calc(100% + 8px)',
            top: 'auto'
          });
        }

        setPosition(newPosition);
      }
    };

    // Update position when hovering
    const handleMouseEnter = () => {
      setTimeout(updatePosition, 0);
    };

    const iconElement = iconRef.current;
    if (iconElement) {
      iconElement.addEventListener('mouseenter', handleMouseEnter);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      if (iconElement) {
        iconElement.removeEventListener('mouseenter', handleMouseEnter);
      }
      window.removeEventListener('resize', updatePosition);
    };
  }, []);

  return (
    <div ref={iconRef} className={`group relative inline-block ${className}`}>
      <Info className="h-4 w-4 text-gray-400 cursor-help" />
      <div 
        ref={tooltipRef}
        className="absolute bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50"
        style={position}
      >
        <p className="font-medium mb-1">{title}</p>
        <p>{description}</p>
        {/* Arrow pointing to the icon */}
        <div 
          className={`absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${position.top ? 'border-b-gray-900 border-t-0 top-[-8px]' : 'border-t-gray-900 bottom-[-8px]'}`}
          style={{
            left: position.left === '50%' ? '50%' : 
                  position.right !== undefined ? 'calc(100% - 8px)' : '8px',
            transform: position.left === '50%' ? 'translateX(-50%)' : 'none'
          }}
        />
      </div>
    </div>
  );
}