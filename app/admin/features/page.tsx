'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Download, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Feature {
  name: string;
  description: string;
  permissions?: string[];
}

interface Page {
  name: string;
  path: string;
  description: string;
  features: Feature[];
}

const pagesData: Page[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    description: 'Central hub for user activities and overview',
    features: [
      {
        name: 'Activity Feed',
        description: 'Displays recent user activities and system events'
      },
      {
        name: 'Quick Stats',
        description: 'Shows key metrics and statistics relevant to the user'
      },
      {
        name: 'Navigation Hub',
        description: 'Provides quick access to frequently used sections'
      }
    ]
  },
  {
    name: 'Chat',
    path: '/chat',
    description: 'Internal team communication system',
    features: [
      {
        name: 'Anonymous Chat',
        description: 'Allows users to communicate anonymously with team members'
      },
      {
        name: 'Direct Messaging',
        description: 'Send private messages to specific users'
      },
      {
        name: 'Channel Rooms',
        description: 'Join topic-based discussion channels'
      }
    ]
  },
  {
    name: 'Clock',
    path: '/clock',
    description: 'Time tracking and attendance management',
    features: [
      {
        name: 'Clock In/Out',
        description: 'Record work hours with timestamp logging'
      },
      {
        name: 'Attendance History',
        description: 'View past clock-in/clock-out records'
      },
      {
        name: 'Reports',
        description: 'Generate attendance reports for managers'
      }
    ]
  },
  {
    name: 'Profile',
    path: '/profile',
    description: 'User personal information and settings',
    features: [
      {
        name: 'Personal Information',
        description: 'View and update personal details'
      },
      {
        name: 'Password Management',
        description: 'Change account password securely'
      },
      {
        name: 'Notification Preferences',
        description: 'Configure notification settings'
      }
    ]
  },
  {
    name: 'Settings',
    path: '/settings',
    description: 'Application configuration and preferences',
    features: [
      {
        name: 'Theme Selection',
        description: 'Choose between light/dark themes'
      },
      {
        name: 'Language Preferences',
        description: 'Select preferred language for interface'
      },
      {
        name: 'Privacy Controls',
        description: 'Manage privacy and data sharing settings'
      }
    ]
  },
  {
    name: 'HR Management',
    path: '/hr',
    description: 'Human resources operations and employee management',
    features: [
      {
        name: 'Employee Directory',
        description: 'Browse and search all employees'
      },
      {
        name: 'Onboarding',
        description: 'Manage new employee onboarding processes'
      },
      {
        name: 'Queries',
        description: 'Handle employee HR-related questions and requests'
      },
      {
        name: 'User Management',
        description: 'Create, update, and manage employee accounts'
      }
    ]
  },
  {
    name: 'Admin Panel',
    path: '/admin',
    description: 'Administrative controls and system management',
    features: [
      {
        name: 'Database Management',
        description: 'View and manage database tables and records'
      },
      {
        name: 'User Administration',
        description: 'Manage user accounts, roles, and permissions'
      },
      {
        name: 'System Logs',
        description: 'Monitor system activities and audit trails'
      },
      {
        name: 'Features Documentation',
        description: 'Comprehensive listing of all application features'
      }
    ]
  },
  {
    name: 'Approvals',
    path: '/admin/approvals',
    description: 'Review and approve pending requests and submissions',
    features: [
      {
        name: 'Certificate Approvals',
        description: 'Review and approve user certificate submissions'
      },
      {
        name: 'Document Verification',
        description: 'Verify authenticity of submitted documents'
      },
      {
        name: 'Approval History',
        description: 'View past approval decisions and records'
      }
    ]
  },
  {
    name: 'Inventory',
    path: '/inventory',
    description: 'Product and stock management system',
    features: [
      {
        name: 'Product Catalog',
        description: 'Manage product listings and information'
      },
      {
        name: 'Inbound Tracking',
        description: 'Track incoming inventory shipments'
      },
      {
        name: 'Storage Management',
        description: 'Manage stored inventory and locations'
      },
      {
        name: 'Outbound Processing',
        description: 'Process outgoing inventory requests'
      }
    ]
  },
  {
    name: 'Resources',
    path: '/resources',
    description: 'Knowledge base and documentation',
    features: [
      {
        name: 'Wiki',
        description: 'Department-specific documentation and guides'
      },
      {
        name: 'Resource Library',
        description: 'Access to shared files and documents'
      },
      {
        name: 'Policy Documents',
        description: 'Company policies and procedure manuals'
      }
    ]
  },
  {
    name: 'Authentication',
    path: '/login, /signup',
    description: 'User authentication and account creation',
    features: [
      {
        name: 'Login',
        description: 'Secure user authentication with credentials'
      },
      {
        name: 'Signup',
        description: 'New user registration and account creation'
      },
      {
        name: 'Password Recovery',
        description: 'Reset forgotten passwords via email'
      }
    ]
  }
];

export default function FeaturesPage() {
  const { toast } = useToast();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleAccordion = (value: string) => {
    setExpandedItems(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value) 
        : [...prev, value]
    );
  };

  const exportToMarkdown = () => {
    let markdownContent = '# T-Office Application Features\n\n';
    markdownContent += 'This document outlines all pages and features available in the T-Office application.\n\n';
    
    pagesData.forEach(page => {
      markdownContent += `## ${page.name}\n\n`;
      markdownContent += `**Path:** ${page.path}\n\n`;
      markdownContent += `**Description:** ${page.description}\n\n`;
      markdownContent += '### Features:\n\n';
      
      page.features.forEach(feature => {
        markdownContent += `- **${feature.name}**: ${feature.description}\n`;
        if (feature.permissions && feature.permissions.length > 0) {
          markdownContent += `  - Permissions: ${feature.permissions.join(', ')}\n`;
        }
      });
      
      markdownContent += '\n';
    });
    
    // Create blob and download
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 't-office-features.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Export Successful',
      description: 'Features documentation exported as Markdown file.',
    });
  };

  const copyToClipboard = () => {
    let textContent = 'T-Office Application Features\n\n';
    
    pagesData.forEach(page => {
      textContent += `${page.name}\n`;
      textContent += `Path: ${page.path}\n`;
      textContent += `Description: ${page.description}\n`;
      textContent += 'Features:\n';
      
      page.features.forEach(feature => {
        textContent += `- ${feature.name}: ${feature.description}\n`;
      });
      
      textContent += '\n';
    });
    
    navigator.clipboard.writeText(textContent);
    
    toast({
      title: 'Copied to Clipboard',
      description: 'Features documentation copied to clipboard.',
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Application Features</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive overview of all pages and their features in T-Office
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={copyToClipboard} variant="outline" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button onClick={exportToMarkdown} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export MD
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Feature Documentation</CardTitle>
            <CardDescription>
              Detailed breakdown of all application pages and their respective features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion 
              type="multiple" 
              value={expandedItems}
              className="space-y-4"
            >
              {pagesData.map((page, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger 
                    onClick={() => toggleAccordion(`item-${index}`)}
                    className="hover:no-underline py-2"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full text-left">
                      <div>
                        <h3 className="text-lg font-semibold">{page.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{page.description}</p>
                      </div>
                      <Badge variant="secondary" className="mt-2 md:mt-0">
                        {page.path}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-3">
                      <h4 className="font-medium text-foreground">Features:</h4>
                      <div className="grid gap-3">
                        {page.features.map((feature, featIndex) => (
                          <div key={featIndex} className="border-l-2 border-primary pl-3 py-1">
                            <h5 className="font-medium">{feature.name}</h5>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                            {feature.permissions && feature.permissions.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {feature.permissions.map((perm, permIndex) => (
                                  <Badge key={permIndex} variant="outline" className="text-xs">
                                    {perm}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}