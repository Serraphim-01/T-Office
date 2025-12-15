'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Download, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CSVImportModalProps {
  onImport: (file: File) => Promise<void>;
  title?: string;
  description?: string;
  isLoading?: boolean;
  featureAccess?: boolean;
}

export function CSVImportModal({ 
  onImport, 
  title = "Import CSV", 
  description = "Upload a CSV file to import data", 
  isLoading = false,
  featureAccess = true
}: CSVImportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a CSV file.',
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a CSV file.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    try {
      await onImport(selectedFile);
      setSelectedFile(null);
      setIsOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const downloadSampleCSV = () => {
    // Create sample CSV content
    const csvContent = `name,part_number,product_type,provider
Product Name 1,PART001,Electronics,Provider A
Product Name 2,PART002,Furniture,Provider B
Product Name 3,PART003,Software,Provider C`;

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_products_import.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          onClick={() => {
            if (!featureAccess) {
              toast({
                title: 'Access Denied',
                description: 'You do not have permission to import data',
                variant: 'destructive',
              });
              return;
            }
            setIsOpen(true);
          }}
          disabled={isLoading || !featureAccess}
        >
          <Upload className="mr-2 h-4 w-4" />
          {isLoading ? 'Importing...' : title}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">{description}</p>
          
          {/* Sample CSV Download */}
          <div className="rounded-lg border bg-muted p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Download Sample CSV</p>
                  <p className="text-xs text-muted-foreground">See the required format</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadSampleCSV}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
          
          {/* Drag and Drop Area */}
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".csv,text/csv"
              className="hidden"
            />
            
            {selectedFile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={removeSelectedFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">Drag and drop your CSV file here</p>
                <p className="text-xs text-muted-foreground mt-1">or</p>
                <Button 
                  variant="outline" 
                  className="mt-2" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported format: CSV
                </p>
              </>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Importing...
                </>
              ) : (
                'Import'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}