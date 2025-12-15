'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, FileText, Database, Package, Truck, Archive, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportModalProps {
  onExport: (exportType: string) => Promise<void>;
  title?: string;
  isLoading?: boolean;
  featureAccess?: boolean;
}

export function ExportModal({ 
  onExport, 
  title = "Export CSV", 
  isLoading = false,
  featureAccess = true
}: ExportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    if (!selectedExportType) {
      toast({
        title: 'Export Type Required',
        description: 'Please select an export type.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await onExport(selectedExportType);
      setIsOpen(false);
      setSelectedExportType(null);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const exportOptions = [
    {
      id: 'providers-products',
      title: 'Providers & Products',
      description: 'Export all providers with their associated products',
      icon: <Package className="h-5 w-5" />,
    },
    {
      id: 'comprehensive',
      title: 'Comprehensive Export',
      description: 'Export all data including providers, products, inbound, stored, and outbound transactions',
      icon: <Database className="h-5 w-5" />,
    },
    {
      id: 'products',
      title: 'Products Only',
      description: 'Export all products',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'inbound',
      title: 'Inbound Transactions',
      description: 'Export all inbound transactions',
      icon: <Truck className="h-5 w-5" />,
    },
    {
      id: 'stored',
      title: 'Stored Transactions',
      description: 'Export all stored transactions',
      icon: <Archive className="h-5 w-5" />,
    },
    {
      id: 'outbound',
      title: 'Outbound Transactions',
      description: 'Export all outbound transactions',
      icon: <Send className="h-5 w-5" />,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          onClick={() => {
            if (!featureAccess) {
              toast({
                title: 'Access Denied',
                description: 'You do not have permission to export data',
                variant: 'destructive',
              });
              return;
            }
            setIsOpen(true);
          }}
          disabled={isLoading || !featureAccess}
        >
          <Download className="mr-2 h-4 w-4" />
          {isLoading ? 'Exporting...' : title}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Select the type of data you want to export:
          </p>
          
          {/* Export Options */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {exportOptions.map((option) => (
              <div 
                key={option.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedExportType === option.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-muted-foreground/25 hover:bg-muted/50'
                }`}
                onClick={() => setSelectedExportType(option.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {option.icon}
                  </div>
                  <div>
                    <p className="font-medium">{option.title}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={!selectedExportType || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Exporting...
                </>
              ) : (
                'Export'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}