'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Plus, Edit, Trash2, Upload, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DashboardLayout } from '@/components/dashboard-layout';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess, clearPageAccessCache } from '@/lib/page-access';
import { AccessControlWrapper } from '@/components/access-control-wrapper';

interface Product {
  id: number;
  name: string;
  part_number: string;
  product_type: string;
  provider_name?: string;
  provider_id?: number;
}

interface Provider {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  official_contact_name?: string;
  official_contact_email?: string;
  official_contact_phone?: string;
  organization_contact_name?: string;
  organization_contact_email?: string;
  organization_contact_phone?: string;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  department: string;
}

export default function ProductsPage() {
  return (
    <AccessControlWrapper pagePath="inventory/products">
      <ProductsContent />
    </AccessControlWrapper>
  );
}

function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [expandedProviders, setExpandedProviders] = useState<Set<number>>(new Set());
  const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isGeneralProductDialogOpen, setIsGeneralProductDialogOpen] = useState(false);
  const [isProviderDetailsDialogOpen, setIsProviderDetailsDialogOpen] = useState(false);
  const [isProductDetailsDialogOpen, setIsProductDetailsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProvider, setViewingProvider] = useState<Provider | null>(null);
  const [providerName, setProviderName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  // Official Contact (required)
  const [officialContactName, setOfficialContactName] = useState('');
  const [officialContactEmail, setOfficialContactEmail] = useState('');
  const [officialContactPhone, setOfficialContactPhone] = useState('');
  
  // Organization Contact (optional)
  const [orgContactName, setOrgContactName] = useState('');
  const [orgContactEmail, setOrgContactEmail] = useState('');
  const [orgContactPhone, setOrgContactPhone] = useState('');
  const [assignedUserId, setAssignedUserId] = useState<number | null>(null); // Add this state for user assignment
  const [users, setUsers] = useState<User[]>([]); // Add this state for available users
  const [newProductName, setNewProductName] = useState('');
  const [newProductPartNumber, setNewProductPartNumber] = useState('');
  const [newProductType, setNewProductType] = useState('');
  const [newProductProviderId, setNewProductProviderId] = useState<number | null>(null);
  const [batchProducts, setBatchProducts] = useState<{name: string, part_number: string, product_type: string}[]>([]);
  const [providerProducts, setProviderProducts] = useState<{name: string, part_number: string, product_type: string}[]>([]);
  const [currentStep, setCurrentStep] = useState<'provider' | 'products'>('provider');
  const [createdProviderId, setCreatedProviderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isComprehensiveImporting, setIsComprehensiveImporting] = useState(false);
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  
  // Feature access states
  const [canImportCSV, setCanImportCSV] = useState(false);
  const [canImportAllData, setCanImportAllData] = useState(false);
  const [canExportCSV, setCanExportCSV] = useState(false);
  const [canAddProduct, setCanAddProduct] = useState(false);
  const [canAddProvider, setCanAddProvider] = useState(false);
  const [canViewDetails, setCanViewDetails] = useState(false);
  const [canDeleteProduct, setCanDeleteProduct] = useState(false);
  const [canDeleteProvider, setCanDeleteProvider] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check feature access when user loads
  useEffect(() => {
    if (user) {
      checkFeatureAccess();
    }
    
    // Listen for navigation refresh events to clear cache
    const handleNavigationRefresh = () => {
      // Clear the page access cache when navigation is refreshed
      clearPageAccessCache();
      // Recheck feature access
      if (user) {
        checkFeatureAccess();
      }
    };
    
    window.addEventListener('navigation-refresh', handleNavigationRefresh);
    
    return () => {
      window.removeEventListener('navigation-refresh', handleNavigationRefresh);
    };
  }, [user]);

  const checkFeatureAccess = async () => {
    if (!user) return;
    
    // Check access to inventory products page
    const productsAccess = await hasPageAccess(user.id.toString(), 'inventory/products');
    
    if (!productsAccess) {
      // If no access to inventory products page, disable all features
      setCanImportCSV(false);
      setCanImportAllData(false);
      setCanExportCSV(false);
      setCanAddProduct(false);
      setCanAddProvider(false);
      setCanViewDetails(false);
      setCanDeleteProduct(false);
      setCanDeleteProvider(false);
      return;
    }
    
    // Check access to specific inventory products features
    const importCSVAccess = await hasPageAccess(user.id.toString(), 'inventory/products/import-csv');
    const importAllDataAccess = await hasPageAccess(user.id.toString(), 'inventory/products/import-all-data');
    const exportCSVAccess = await hasPageAccess(user.id.toString(), 'inventory/products/export-csv');
    const addProviderAccess = await hasPageAccess(user.id.toString(), 'inventory/products/add-provider');
    const addProductAccess = await hasPageAccess(user.id.toString(), 'inventory/products/add-product');
    const deleteProviderAccess = await hasPageAccess(user.id.toString(), 'inventory/products/delete-provider');
    const deleteProductAccess = await hasPageAccess(user.id.toString(), 'inventory/products/delete-product');
    
    setCanImportCSV(importCSVAccess);
    setCanImportAllData(importAllDataAccess);
    setCanExportCSV(exportCSVAccess);
    setCanAddProvider(addProviderAccess);
    setCanAddProduct(addProductAccess);
    setCanDeleteProvider(deleteProviderAccess);
    setCanDeleteProduct(deleteProductAccess);
  };

  // Fetch providers and products
  useEffect(() => {
    fetchProviders();
    fetchProducts();
  }, []);

  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/inventory/providers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch providers');
      const data = await response.json();
      setProviders(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load providers',
        variant: 'destructive',
      });
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/inventory/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProvider = (providerId: number) => {
    setExpandedProviders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(providerId)) {
        newSet.delete(providerId);
      } else {
        newSet.add(providerId);
      }
      return newSet;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow import if user has permission
    if (!canImportCSV) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to import products via CSV',
        variant: 'destructive',
      });
      return;
    }
    
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/inventory/products/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to import products');

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: `${result.successCount} products imported successfully. ${result.errorCount} errors occurred.`,
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh product list
      fetchProducts();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import products',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleComprehensiveFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow import if user has permission
    if (!canImportAllData) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to import comprehensive data',
        variant: 'destructive',
      });
      return;
    }
    
    const file = event.target.files?.[0];
    if (!file) return;

    setIsComprehensiveImporting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/inventory/comprehensive-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to import comprehensive data');

      const result = await response.json();
      
      const totalSuccess = result.successCount.products + result.successCount.inbound + 
                          result.successCount.stored + result.successCount.outbound;
      const totalErrors = result.errorCount.products + result.errorCount.inbound + 
                         result.errorCount.stored + result.errorCount.outbound;
      
      toast({
        title: 'Success',
        description: `Import completed: ${totalSuccess} items imported successfully. ${totalErrors} errors occurred.`,
      });
      
      // Reset file input
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = '';
      }
      
      // Refresh product list
      fetchProducts();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import comprehensive data',
        variant: 'destructive',
      });
    } finally {
      setIsComprehensiveImporting(false);
    }
  };

  const handleSubmitProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate official contact (required fields)
    if (!officialContactName || !officialContactEmail || !officialContactPhone) {
      toast({
        title: 'Error',
        description: 'Official contact name, email, and phone are required',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const method = 'POST';
      const url = 'http://localhost:4000/api/inventory/providers';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: providerName, 
          email, 
          phone, 
          address,
          official_contact_name: officialContactName,
          official_contact_email: officialContactEmail,
          official_contact_phone: officialContactPhone,
          organization_contact_name: orgContactName,
          organization_contact_email: orgContactEmail,
          organization_contact_phone: orgContactPhone
        }),
      });

      if (!response.ok) throw new Error('Failed to add provider');

      const provider = await response.json();
      
      // Assign user to provider if selected
      if (assignedUserId) {
        try {
          const assignResponse = await fetch(`http://localhost:4000/api/inventory/providers/${provider.id}/assign-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              userId: assignedUserId,
              assignmentType: 'attached_staff'
            }),
          });
          
          if (!assignResponse.ok) {
            throw new Error('Failed to assign user to provider');
          }
        } catch (assignError) {
          toast({
            title: 'Warning',
            description: 'Provider created but failed to assign user: ' + (assignError instanceof Error ? assignError.message : 'Unknown error'),
            variant: 'destructive',
          });
        }
      }
      
      setProviders([...providers, provider]);
      setCreatedProviderId(provider.id);
      setCurrentStep('products');
      toast({ title: 'Success', description: 'Provider added successfully. Now add products.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleAddProductToProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createdProviderId) {
      toast({
        title: 'Error',
        description: 'Provider not created yet',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/providers/${createdProviderId}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: newProductName, 
          part_number: newProductPartNumber, 
          product_type: newProductType 
        }),
      });

      if (!response.ok) throw new Error('Failed to add product');

      // Refresh the products list to get the updated data
      await fetchProducts();
      
      // Clear form
      setNewProductName('');
      setNewProductPartNumber('');
      setNewProductType('');
      
      toast({ title: 'Success', description: 'Product added successfully' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleAddBatchProducts = async () => {
    if (!createdProviderId) {
      toast({
        title: 'Error',
        description: 'Provider not created yet',
        variant: 'destructive',
      });
      return;
    }
    
    if (batchProducts.length === 0) {
      toast({
        title: 'Error',
        description: 'No products to add',
        variant: 'destructive',
      });
      return;
    }
    
    setIsAddingBatch(true);
    
    try {
      const token = localStorage.getItem('token');
      
      for (const product of batchProducts) {
        const response = await fetch(`http://localhost:4000/api/inventory/providers/${createdProviderId}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(product),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to add product ${product.name}`);
        }
      }
      
      // Refresh the products list to get the updated data
      await fetchProducts();
      
      // Clear batch
      setBatchProducts([]);
      
      toast({ 
        title: 'Success', 
        description: `${batchProducts.length} products added successfully` 
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsAddingBatch(false);
    }
  };

  const handleAddToBatch = () => {
    if (!newProductName || !newProductPartNumber || !newProductType) {
      toast({
        title: 'Error',
        description: 'Please fill all product fields',
        variant: 'destructive',
      });
      return;
    }
    
    setBatchProducts([
      ...batchProducts,
      {
        name: newProductName,
        part_number: newProductPartNumber,
        product_type: newProductType
      }
    ]);
    
    // Clear form
    setNewProductName('');
    setNewProductPartNumber('');
    setNewProductType('');
    
    toast({ 
      title: 'Success', 
      description: 'Product added to batch' 
    });
  };

  const handleRemoveFromBatch = (index: number) => {
    setBatchProducts(batchProducts.filter((_, i) => i !== index));
  };

  const handleFinishProviderSetup = () => {
    resetProviderForm();
    // Refresh products to show the newly added products
    fetchProducts();
    toast({ title: 'Success', description: 'Provider and products added successfully' });
  };

  const handleDeleteProduct = async (id: number) => {
    // Only allow delete if user has permission
    if (!canDeleteProduct) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to delete products',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete product');

      setProducts(products.filter(product => product.id !== id));
      toast({ title: 'Success', description: 'Product deleted successfully' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProvider = async (id: number) => {
    // Only allow delete if user has permission
    if (!canDeleteProvider) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to delete providers',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/providers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete provider');

      setProviders(providers.filter(provider => provider.id !== id));
      // Also remove products associated with this provider
      setProducts(products.filter(product => product.provider_id !== id));
      toast({ title: 'Success', description: 'Provider deleted successfully' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete provider',
        variant: 'destructive',
      });
    }
};

const handleViewProvider = (provider: Provider) => {
  // Navigate to the provider details page
  window.location.href = `/inventory/providers/${provider.id}`;
};


const handleCreateProduct = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validate provider is selected
  if (!newProductProviderId) {
    toast({
      title: 'Error',
      description: 'Please select a provider',
      variant: 'destructive',
    });
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:4000/api/inventory/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        name: newProductName, 
        part_number: newProductPartNumber, 
        product_type: newProductType,
        provider_id: newProductProviderId
      }),
    });

    if (!response.ok) throw new Error('Failed to create product');

    const newProduct = await response.json();
    setProducts([...products, newProduct]);
    
    toast({ title: 'Success', description: 'Product created successfully' });
    resetProductForm();
    setIsGeneralProductDialogOpen(false);
  } catch (error) {
    toast({
      title: 'Error',
      description: error instanceof Error ? error.message : 'An unknown error occurred',
      variant: 'destructive',
    });
  }
};

const resetProviderForm = () => {
  setIsProviderDialogOpen(false);
  setProviderName('');
  setEmail('');
  setPhone('');
  setAddress('');
  
  // Reset official contact fields
  setOfficialContactName('');
  setOfficialContactEmail('');
  setOfficialContactPhone('');
  
  // Reset organization contact fields
  setOrgContactName('');
  setOrgContactEmail('');
  setOrgContactPhone('');
  
  // Reset user assignment
  setAssignedUserId(null);
  
  setNewProductName('');
  setNewProductPartNumber('');
  setNewProductType('');
  setBatchProducts([]);
  setProviderProducts([]);
  setCurrentStep('provider');
  setCreatedProviderId(null);
};

const resetProductForm = () => {
  setIsProductDialogOpen(false);
  setIsGeneralProductDialogOpen(false);
  setEditingProduct(null);
  setNewProductName('');
  setNewProductPartNumber('');
  setNewProductType('');
  setNewProductProviderId(null);
};

// Group products by provider
const groupProductsByProvider = () => {
  const grouped: { [key: string]: Product[] } = {};
  
  // Initialize with all providers
  providers.forEach(provider => {
    grouped[provider.name] = [];
  });
  
  // Add products without providers to "Unknown Provider" group
  grouped['Unknown Provider'] = [];
  
  // Group products
  products.forEach(product => {
    const providerName = product.provider_name || 'Unknown Provider';
    if (!grouped[providerName]) {
      grouped[providerName] = [];
    }
    grouped[providerName].push(product);
  });
  
  return grouped;
};

const groupedProducts = groupProductsByProvider();

// Fetch users for assignment dropdown
useEffect(() => {
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/hr/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      // Removed console statement for production
    }
  };

  fetchUsers();
}, []);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">Inventory Products by Provider</CardTitle>
            <div className="flex space-x-2">
              {canImportCSV && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv,text/csv"
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isImporting ? 'Importing...' : 'Import CSV'}
                  </Button>
                </>
              )}
              
              {canImportAllData && (
                <>
                  <input
                    type="file"
                    ref={csvFileInputRef}
                    onChange={handleComprehensiveFileUpload}
                    accept=".csv,text/csv"
                    className="hidden"
                  />
                  <Button
                    onClick={() => csvFileInputRef.current?.click()}
                    disabled={isComprehensiveImporting}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isComprehensiveImporting ? 'Importing...' : 'Import All Data'}
                  </Button>
                </>
              )}
              
              {canExportCSV && (
                <Button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const response = await fetch('http://localhost:4000/api/inventory/export/products', {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });

                      if (!response.ok) throw new Error('Failed to export products');

                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'products_export.csv';
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (error) {
                      toast({
                        title: 'Error',
                        description: 'Failed to export products',
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  Export CSV
                </Button>
              )}
              
              {canAddProvider && (
                <Button onClick={() => {
                  resetProviderForm();
                  setCurrentStep('provider');
                  setIsProviderDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Provider
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {providers.map((provider) => {
                  // Get products for this provider
                  const providerProducts = products.filter(product => product.provider_id === provider.id);
                  
                  return (
                    <div key={provider.id} className="border rounded-lg">
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer bg-muted hover:bg-muted/80"
                        onClick={() => toggleProvider(provider.id)}
                      >
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                            {expandedProviders.has(provider.id) ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </Button>
                          <h3 
                            className="font-semibold hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewProvider(provider);
                            }}
                          >
                            {provider.name}
                          </h3>
                          <span className="text-sm text-muted-foreground">
                            ({providerProducts.length} products)
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          {canAddProduct && (
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Set up the provider for adding products
                                setCreatedProviderId(provider.id);
                                setProviderName(provider.name);
                                setCurrentStep('products');
                                setIsProviderDialogOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {canDeleteProvider && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProvider(provider.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {expandedProviders.has(provider.id) && (
                        <div className="p-4 pt-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Part Number</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {providerProducts.length > 0 ? (
                                providerProducts.map((product) => (
                                  <TableRow 
                                    key={product.id}
                                    className="cursor-pointer"
                                    onClick={() => {
                                      // Navigate to the product details page
                                      window.location.href = `/inventory/products/${product.id}`;
                                    }}
                                  >
                                    <TableCell className="font-medium hover:underline">
                                      {product.name}
                                    </TableCell>
                                    <TableCell>{product.part_number}</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end space-x-1">
                                        {canDeleteProduct && (
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteProduct(product.id);
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                                    No products found for this provider
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Show products without providers */}
                {products.filter(product => !product.provider_id || !providers.some(p => p.id === product.provider_id)).length > 0 && (
                  <div className="border rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer bg-muted hover:bg-muted/80"
                      onClick={() => toggleProvider(0)}
                    >
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                          {expandedProviders.has(0) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </Button>
                        <h3 className="font-semibold">Unknown Provider</h3>
                        <span className="text-sm text-muted-foreground">
                          ({products.filter(product => !product.provider_id || !providers.some(p => p.id === product.provider_id)).length} products)
                        </span>
                      </div>
                    </div>
                    
                    {expandedProviders.has(0) && (
                      <div className="p-4 pt-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Part Number</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {products
                              .filter(product => !product.provider_id || !providers.some(p => p.id === product.provider_id))
                              .map((product) => (
                                <TableRow 
                                  key={product.id}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    // Navigate to the product details page
                                    window.location.href = `/inventory/products/${product.id}`;
                                  }}
                                >
                                  <TableCell className="font-medium hover:underline">
                                    {product.name}
                                  </TableCell>
                                  <TableCell>{product.part_number}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-1">
                                      {canDeleteProduct && (
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteProduct(product.id);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            }
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Dialog for adding providers */}
            <Dialog open={isProviderDialogOpen && currentStep === 'provider'} onOpenChange={(open) => {
              if (!open) {
                resetProviderForm();
              } else {
                setIsProviderDialogOpen(true);
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Provider</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitProvider} className="space-y-6">
                  {/* Basic Provider Information */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Basic Provider Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="providerName">Provider Name *</Label>
                        <Input
                          id="providerName"
                          value={providerName}
                          onChange={(e) => setProviderName(e.target.value)}
                          placeholder="Enter provider name"
                          required
                        />
                      </div>
                      <div></div> {/* Empty div to maintain grid structure */}
                      <div className="space-y-2">
                        <Label htmlFor="email">Organization Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter organization email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Organization Call Line</Label>
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Enter organization call line"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Enter address"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Official Contact Section (Required) */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Official Contact *</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="officialContactName">Name *</Label>
                        <Input
                          id="officialContactName"
                          value={officialContactName}
                          onChange={(e) => setOfficialContactName(e.target.value)}
                          placeholder="Enter official contact name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="officialContactEmail">Email *</Label>
                        <Input
                          id="officialContactEmail"
                          type="email"
                          value={officialContactEmail}
                          onChange={(e) => setOfficialContactEmail(e.target.value)}
                          placeholder="Enter official contact email"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="officialContactPhone">Phone *</Label>
                        <Input
                          id="officialContactPhone"
                          value={officialContactPhone}
                          onChange={(e) => setOfficialContactPhone(e.target.value)}
                          placeholder="Enter official contact phone"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Organization Contact Section (Optional) */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Organization Contact (Optional)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="orgContactName">Name</Label>
                        <Input
                          id="orgContactName"
                          value={orgContactName}
                          onChange={(e) => setOrgContactName(e.target.value)}
                          placeholder="Enter organization contact name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="orgContactEmail">Email</Label>
                        <Input
                          id="orgContactEmail"
                          type="email"
                          value={orgContactEmail}
                          onChange={(e) => setOrgContactEmail(e.target.value)}
                          placeholder="Enter organization contact email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="orgContactPhone">Phone</Label>
                        <Input
                          id="orgContactPhone"
                          value={orgContactPhone}
                          onChange={(e) => setOrgContactPhone(e.target.value)}
                          placeholder="Enter organization contact phone"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Assign User Section */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Assign User (Optional)</h3>
                    <div className="space-y-2">
                      <Label htmlFor="assignedUser">Attach Staff Member</Label>
                      <select
                        id="assignedUser"
                        value={assignedUserId ? assignedUserId.toString() : ''}
                        onChange={(e) => setAssignedUserId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">Select a user (optional)</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.full_name} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={resetProviderForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Next: Add Products
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            {/* Dialog for adding products to existing provider */}
            <Dialog open={isProviderDialogOpen && currentStep === 'products'} onOpenChange={(open) => {
              if (!open) {
                if (currentStep === 'products') {
                  handleFinishProviderSetup();
                }
                resetProviderForm();
              } else {
                setIsProviderDialogOpen(true);
              }
            }}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Products to {providerName}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold">{providerName}</h3>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Add Products</h4>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleAddToBatch();
                    }} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="newProductName">Product Name *</Label>
                          <Input
                            id="newProductName"
                            value={newProductName}
                            onChange={(e) => setNewProductName(e.target.value)}
                            placeholder="Enter product name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newProductPartNumber">Part Number *</Label>
                          <Input
                            id="newProductPartNumber"
                            value={newProductPartNumber}
                            onChange={(e) => setNewProductPartNumber(e.target.value)}
                            placeholder="Enter part number"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newProductType">Product Type *</Label>
                          <Input
                            id="newProductType"
                            value={newProductType}
                            onChange={(e) => setNewProductType(e.target.value)}
                            placeholder="Enter product type"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleAddToBatch}
                          disabled={!newProductName || !newProductPartNumber || !newProductType}
                        >
                          Add to Batch
                        </Button>
                      </div>
                    </form>
                    
                    {batchProducts.length > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium">Batch Products ({batchProducts.length})</h5>
                          <Button 
                            onClick={handleAddBatchProducts}
                            disabled={isAddingBatch}
                          >
                            {isAddingBatch ? 'Adding...' : `Add All ${batchProducts.length} Products`}
                          </Button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Part Number</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {batchProducts.map((product, index) => (
                              <TableRow key={index}>
                                <TableCell>{product.name}</TableCell>
                                <TableCell>{product.part_number}</TableCell>
                                <TableCell>{product.product_type}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleRemoveFromBatch(index)}
                                  >
                                    Remove
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                  
                  {providerProducts.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Added Products</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Part Number</TableHead>
                            <TableHead>Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {providerProducts.map((product, index) => (
                            <TableRow key={index}>
                              <TableCell>{product.name}</TableCell>
                              <TableCell>{product.part_number}</TableCell>
                              <TableCell>{product.product_type}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      onClick={() => {
                        handleFinishProviderSetup();
                        resetProviderForm();
                      }}
                    >
                      Finish
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            
            {/* Dialog for creating products */}
            <Dialog open={isGeneralProductDialogOpen} onOpenChange={(open) => {
              if (!open) {
                resetProductForm();
              } else {
                setIsGeneralProductDialogOpen(true);
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Product</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateProduct} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newProductName">Product Name *</Label>
                    <Input
                      id="newProductName"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newProductPartNumber">Part Number *</Label>
                    <Input
                      id="newProductPartNumber"
                      value={newProductPartNumber}
                      onChange={(e) => setNewProductPartNumber(e.target.value)}
                      placeholder="Enter part number"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newProductType">Product Type *</Label>
                    <Input
                      id="newProductType"
                      value={newProductType}
                      onChange={(e) => setNewProductType(e.target.value)}
                      placeholder="Enter product type"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newProductProvider">Provider *</Label>
                    <select
                      id="newProductProvider"
                      value={newProductProviderId || ''}
                      onChange={(e) => setNewProductProviderId(Number(e.target.value))}
                      className="w-full p-2 border rounded"
                      required
                    >
                      <option value="">Select a provider</option>
                      {providers.map(provider => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={resetProductForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Create Product
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            {/* Dialog for viewing provider details */}
            <Dialog open={isProviderDetailsDialogOpen} onOpenChange={setIsProviderDetailsDialogOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Provider Details</DialogTitle>
                </DialogHeader>
                {viewingProvider && (
                  <div className="space-y-6">
                    {/* Basic Provider Information */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4">Basic Provider Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Provider Name</Label>
                          <p className="font-medium">{viewingProvider.name}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Email</Label>
                          <p className="font-medium">{viewingProvider.email || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Phone</Label>
                          <p className="font-medium">{viewingProvider.phone || 'N/A'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-muted-foreground">Address</Label>
                          <p className="font-medium">{viewingProvider.address || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Official Contact Section */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4">Official Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Name</Label>
                          <p className="font-medium">{viewingProvider.official_contact_name || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Email</Label>
                          <p className="font-medium">{viewingProvider.official_contact_email || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Phone</Label>
                          <p className="font-medium">{viewingProvider.official_contact_phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Organization Contact Section */}
                    {(viewingProvider.organization_contact_name || viewingProvider.organization_contact_email || viewingProvider.organization_contact_phone) && (
                      <div className="border rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-4">Organization Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Name</Label>
                            <p className="font-medium">{viewingProvider.organization_contact_name || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Email</Label>
                            <p className="font-medium">{viewingProvider.organization_contact_email || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Phone</Label>
                            <p className="font-medium">{viewingProvider.organization_contact_phone || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Products</h3>
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Part Number</TableHead>
                              <TableHead>Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {products
                              .filter(product => product.provider_id === viewingProvider.id)
                              .map((product) => (
                                <TableRow key={product.id}>
                                  <TableCell 
                                    className="font-medium hover:underline cursor-pointer"
                                    onClick={() => {
                                      setIsProviderDetailsDialogOpen(false);
                                      // Navigate to the product details page instead of showing modal
                                      setTimeout(() => {
                                        window.location.href = `/inventory/products/${product.id}`;
                                      }, 100);
                                    }}
                                  >
                                    {product.name}
                                  </TableCell>
                                  <TableCell>{product.part_number}</TableCell>
                                  <TableCell>{product.product_type}</TableCell>
                                </TableRow>
                              ))
                            }
                            {products.filter(product => product.provider_id === viewingProvider.id).length === 0 && (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                  No products found for this provider
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button onClick={() => setIsProviderDetailsDialogOpen(false)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
