'use client';

import { useRef, useEffect } from 'react';
import { X, PieChart, BarChart3, Users, MessageCircle, User, Package, Clock, FileText, Settings, Building } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAnalytics } from '@/lib/analytics-context';

interface AnalyticsSidebarProps {
  isOpen: boolean; 
  onClose: () => void;
  currentPage?: string; // e.g., 'products', 'chat', 'profile', etc.
}

export function AnalyticsSidebar({ isOpen, onClose, currentPage = '' }: AnalyticsSidebarProps) {
  // This component is deprecated. The analytics sidebar is now global.
  // Use the GlobalAnalyticsSidebar component instead.
  console.warn("AnalyticsSidebar is deprecated. Use the global analytics sidebar instead.");
  
  return null;
}
