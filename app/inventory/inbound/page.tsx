'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Package, Calendar, Truck, CheckCircle, Edit, Trash2, Hash } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess } from '@/lib/page-access';
import { AccessControlWrapper } from '@/components/access-control-wrapper';

interface Product {
  id: number;
  name: string;
  part_number: string;
  default_unit_price: number;
}

interface Provider {
  id: number;
  name: string;
}

interface InboundTransaction {
  id: number;
  product_id: number;
  product_name: string;
  product_part_number: string;
  quantity: number;
  provider_name: string;
  expected_arrival_start: string;
  expected_arrival_end: string;
  status: 'Incoming' | 'Stored';
  created_at: string;
  serial_numbers?: string[];
  batch_number?: string;
  unit_price?: number;
}

interface ProductEntry {
  id: string;
  provider_id: number | null;
  product_id: number | null;
  quantity: number;
  serial_numbers: string[];
  default_unit_price: number; // The original default price from the product
  unit_price: number; // The editable price for this transaction
}

export default function InboundPage() {
  return (
    <AccessControlWrapper pagePath="inventory/inbound">
      <InboundContent />
    </AccessControlWrapper>
  );
}

function InboundContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<{[key: number]: Product[]}>({});
  const [inboundTransactions, setInboundTransactions] = useState<InboundTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  
  // Feature access states
  const [canExportCSV, setCanExportCSV] = useState(false);
  const [canAddTransaction, setCanAddTransaction] = useState(false);
  const [canEditTransaction, setCanEditTransaction] = useState(false);
  const [canDeleteTransaction, setCanDeleteTransaction] = useState(false);
  const [canMarkAsStored, setCanMarkAsStored] = useState(false);
  
  // Form state
  const [expectedArrivalStart, setExpectedArrivalStart] = useState('');
  const [expectedArrivalEnd, setExpectedArrivalEnd] = useState('');
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([{ 
    id: Date.now().toString(), 
    provider_id: null, 
    product_id: null, 
    quantity: 1, 
    serial_numbers: [''],
    default_unit_price: 0,
    unit_price: 0
  }]);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Check feature access when user loads
  useEffect(() => {
    if (user) {
      checkFeatureAccess();
    }
  }, [user]);

  const checkFeatureAccess = async () => {
    if (!user) return;
    
    // Check access to inventory inbound page
    const inboundAccess = await hasPageAccess(user.id.toString(), 'inventory/inbound');
    
    if (!inboundAccess) {
      // If no access to inventory inbound page, disable all features
      setCanExportCSV(false);
      setCanAddTransaction(false);
      setCanEditTransaction(false);
      setCanDeleteTransaction(false);
      setCanMarkAsStored(false);
      return;
    }
    
    // Check access to specific inventory inbound features
    const exportCSVAccess = await hasPageAccess(user.id.toString(), 'inventory/inbound/export-csv');
    const addTransactionAccess = await hasPageAccess(user.id.toString(), 'inventory/inbound/add-transaction');
    const editTransactionAccess = await hasPageAccess(user.id.toString(), 'inventory/inbound/edit-transaction');
    const deleteTransactionAccess = await hasPageAccess(user.id.toString(), 'inventory/inbound/delete-transaction');
    const markAsStoredAccess = await hasPageAccess(user.id.toString(), 'inventory/inbound/mark-as-stored');
    
    setCanExportCSV(exportCSVAccess);
    setCanAddTransaction(addTransactionAccess);
    setCanEditTransaction(editTransactionAccess);
    setCanDeleteTransaction(deleteTransactionAccess);
    setCanMarkAsStored(markAsStoredAccess);
  };

  // Fetch providers, products and inbound transactions
  useEffect(() => {
    Promise.all([fetchProviders(), fetchProducts(), fetchInboundTransactions()]);
  }, []);

  // Fetch single inbound transaction details
  const fetchInboundTransaction = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/inbound/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch transaction details');
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  };

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
    }
  };

  // Fetch products for a specific provider (all products, not just those with transactions)
  const fetchProductsByProvider = async (providerId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/providers/${providerId}/all-products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch products for provider');
      const data = await response.json();
      setFilteredProducts(prev => ({
        ...prev,
        [providerId]: data
      }));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load products for selected provider',
        variant: 'destructive',
      });
    }
  };

  const fetchInboundTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/inventory/inbound', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch inbound transactions');
      const data = await response.json();
      setInboundTransactions(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load inbound transactions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (transaction: InboundTransaction) => {
    // Only allow edit if user has edit permission
    if (!canEditTransaction) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to edit inbound transactions',
        variant: 'destructive',
      });
      return;
    }
    
    // Fetch serial numbers for this transaction
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/inbound/${transaction.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch transaction details');
      
      const data = await response.json();
      
      setEditingTransactionId(transaction.id);
      // For editing, we'll populate the form with a single product entry
      setExpectedArrivalStart(transaction.expected_arrival_start.split('T')[0]);
      setExpectedArrivalEnd(transaction.expected_arrival_end.split('T')[0]);
      
      // Find the product to get its default unit price
      const providerId = providers.find(p => p.name === transaction.provider_name)?.id || null;
      let defaultUnitPrice = 0;
      
      if (providerId && filteredProducts[providerId]) {
        const product = filteredProducts[providerId].find(p => p.id === transaction.product_id);
        defaultUnitPrice = Number(product?.default_unit_price) || 0;
      }
      
      // Create a single product entry for editing
      setProductEntries([{
        id: Date.now().toString(),
        provider_id: providerId,
        product_id: transaction.product_id,
        quantity: transaction.quantity,
        serial_numbers: data.serial_numbers && data.serial_numbers.length > 0 
          ? data.serial_numbers 
          : Array(transaction.quantity).fill(''),
        default_unit_price: defaultUnitPrice,
        unit_price: defaultUnitPrice
      }]);
      
      setIsEditing(true);
      setIsAdding(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load transaction details',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    // Only allow delete if user has delete permission
    if (!canDeleteTransaction) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to delete inbound transactions',
        variant: 'destructive',
      });
      return;
    }
    
    if (!confirm('Are you sure you want to delete this inbound transaction?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/inbound/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete transaction');

      toast({ title: 'Success', description: 'Transaction deleted successfully' });
      
      // Refresh transactions
      fetchInboundTransactions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete transaction',
        variant: 'destructive',
      });
    }
  };

  const handleQuantityChange = (entryId: string, value: number) => {
    setProductEntries(prev => prev.map(entry => {
      if (entry.id === entryId) {
        // Adjust serial numbers array to match quantity
        const newSerialNumbers = [...entry.serial_numbers];
        if (value > entry.serial_numbers.length) {
          // Add new empty serial numbers
          return { 
            ...entry, 
            quantity: value,
            serial_numbers: [...newSerialNumbers, ...Array(value - entry.serial_numbers.length).fill('')]
          };
        } else if (value < entry.serial_numbers.length) {
          // Remove extra serial numbers
          return { 
            ...entry, 
            quantity: value,
            serial_numbers: newSerialNumbers.slice(0, value)
          };
        }
        return { ...entry, quantity: value };
      }
      return entry;
    }));
  };

  const handleSerialNumberChange = (entryId: string, index: number, value: string) => {
    setProductEntries(prev => prev.map(entry => {
      if (entry.id === entryId) {
        const newSerialNumbers = [...entry.serial_numbers];
        newSerialNumbers[index] = value;
        return { ...entry, serial_numbers: newSerialNumbers };
      }
      return entry;
    }));
  };

  // State to track if we're adding multiple products from the same provider
  const [sameProviderMode, setSameProviderMode] = useState(false);
  const [commonProviderId, setCommonProviderId] = useState<number | null>(null);

  const handleProviderChange = (entryId: string, providerId: number) => {
    setProductEntries(prev => prev.map(entry => {
      // If same provider mode is enabled, update all entries with the same provider
      if (sameProviderMode && entry.provider_id !== providerId) {
        // Fetch products for this provider only once
        if (entry.id === entryId) {
          fetchProductsByProvider(providerId);
        }
        return { 
          ...entry, 
          provider_id: providerId,
          product_id: null,
          serial_numbers: [''] // Reset serial numbers when changing provider
        };
      } else if (entry.id === entryId) {
        // When provider changes, reset product selection and fetch products for this provider
        fetchProductsByProvider(providerId);
        return { 
          ...entry, 
          provider_id: providerId,
          product_id: null,
          serial_numbers: [''] // Reset serial numbers when changing provider
        };
      }
      return entry;
    }));
  };

  const handleProductChange = async (entryId: string, productId: number) => {
    setProductEntries(prev => prev.map(entry => {
      if (entry.id === entryId) {
        // Find the product to get its default unit price
        const providerId = entry.provider_id;
        let defaultUnitPrice = 0;
        if (providerId && filteredProducts[providerId]) {
          const product = filteredProducts[providerId].find(p => p.id === productId);
          defaultUnitPrice = Number(product?.default_unit_price) || 0;
        }
        return { 
          ...entry, 
          product_id: productId,
          default_unit_price: defaultUnitPrice,
          unit_price: defaultUnitPrice, // Initialize unit price with default price
          serial_numbers: Array(entry.quantity).fill('') // Reset serial numbers when changing product
        };
      }
      return entry;
    }));
  };

  const addProductEntry = () => {
    setProductEntries(prev => [
      ...prev,
      { 
        id: Date.now().toString(), 
        provider_id: sameProviderMode && commonProviderId ? commonProviderId : null, 
        product_id: null, 
        quantity: 1, 
        serial_numbers: [''],
        default_unit_price: 0,
        unit_price: 0
      }
    ]);
  };

  const removeProductEntry = (entryId: string) => {
    if (productEntries.length > 1) {
      setProductEntries(prev => prev.filter(entry => entry.id !== entryId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!expectedArrivalStart || !expectedArrivalEnd) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in arrival dates',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate each product entry
    for (const entry of productEntries) {
      if (!entry.provider_id || !entry.product_id || entry.quantity <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields for all products',
          variant: 'destructive',
        });
        return;
      }
      
      // Check for duplicate serial numbers within this entry
      const nonEmptySerials = entry.serial_numbers.filter(sn => sn.trim() !== '');
      if (new Set(nonEmptySerials).size !== nonEmptySerials.length) {
        toast({
          title: 'Validation Error',
          description: 'Serial numbers must be unique within each product entry',
          variant: 'destructive',
        });
        return;
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      
      if (isEditing && editingTransactionId && productEntries.length === 1) {
        // Update existing transaction (single entry only)
        const entry = productEntries[0];
        const requestData = {
          product_id: entry.product_id,
          quantity: entry.quantity,
          serial_numbers: entry.serial_numbers,
          provider_id: entry.provider_id,
          expected_arrival_start: expectedArrivalStart,
          expected_arrival_end: expectedArrivalEnd
        };
        
        const response = await fetch(`http://localhost:4000/api/inventory/inbound/${editingTransactionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update inbound transaction');
        }
        
        toast({ 
          title: 'Success', 
          description: 'Inbound transaction updated successfully'
        });
      } else {
        // Create new transactions (bulk)
        const transactions = productEntries.map(entry => ({
          product_id: entry.product_id,
          quantity: entry.quantity,
          serial_numbers: entry.serial_numbers,
          provider_id: entry.provider_id,
          unit_price: entry.unit_price
        }));
        
        const requestData = {
          transactions,
          expected_arrival_start: expectedArrivalStart,
          expected_arrival_end: expectedArrivalEnd
        };
        
        // Submit all entries as bulk transaction
        const response = await fetch('http://localhost:4000/api/inventory/inbound/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add inbound transactions');
        }
        
        const responseData = await response.json();
        
        // Show success message with batch number
        toast({ 
          title: 'Success', 
          description: `Inbound transactions added successfully with batch number: ${responseData.batch_number}`
        });
      }
      
      // Reset form
      setExpectedArrivalStart('');
      setExpectedArrivalEnd('');
      setProductEntries([{ 
        id: Date.now().toString(), 
        provider_id: null, 
        product_id: null, 
        quantity: 1, 
        serial_numbers: [''],
        default_unit_price: 0,
        unit_price: 0
      }]);
      setIsAdding(false);
      setIsEditing(false);
      setEditingTransactionId(null);
      
      // Refresh transactions
      fetchInboundTransactions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  // Function to toggle same provider mode
  const toggleSameProviderMode = () => {
    const newMode = !sameProviderMode;
    setSameProviderMode(newMode);
    
    if (newMode && productEntries.length > 0 && productEntries[0].provider_id) {
      // Enable same provider mode and set common provider
      setCommonProviderId(productEntries[0].provider_id);
    } else if (!newMode) {
      // Disable same provider mode
      setCommonProviderId(null);
    }
  };

  // Handle common provider change when in same provider mode
  const handleCommonProviderChange = (providerId: number) => {
    setCommonProviderId(providerId);
    handleProviderChange(productEntries[0]?.id || '', providerId);
  };

  const resetForm = () => {
    setIsAdding(false);
    setIsEditing(false);
    setEditingTransactionId(null);
    setExpectedArrivalStart('');
    setExpectedArrivalEnd('');
    setProductEntries([{ 
      id: Date.now().toString(), 
      provider_id: null, 
      product_id: null, 
      quantity: 1, 
      serial_numbers: [''],
      default_unit_price: 0,
      unit_price: 0
    }]);
  };

  const handleMarkAsStored = async (id: number) => {
    // Only allow mark as stored if user has permission
    if (!canMarkAsStored) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to mark inbound transactions as stored',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/inbound/${id}/store`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to update transaction status');

      toast({ title: 'Success', description: 'Transaction marked as stored' });
      
      // Refresh transactions
      fetchInboundTransactions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update transaction',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Inbound Transactions</h1>
          <div className="flex space-x-2">
            {canExportCSV && (
              <Button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch('http://localhost:4000/api/inventory/export/inbound', {
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    });

                    if (!response.ok) throw new Error('Failed to export inbound transactions');

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'inbound_transactions_export.csv';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: 'Failed to export inbound transactions',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                Export CSV
              </Button>
            )}
            {canAddTransaction && (
              <Button onClick={() => setIsAdding(!isAdding)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Inbound Transaction
              </Button>
            )}
          </div>
        </div>

        {isAdding && canAddTransaction && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add New Inbound Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="arrivalStart">Expected Arrival Start *</Label>
                    <Input
                      id="arrivalStart"
                      type="date"
                      value={expectedArrivalStart}
                      onChange={(e) => setExpectedArrivalStart(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arrivalEnd">Expected Arrival End *</Label>
                    <Input
                      id="arrivalEnd"
                      type="date"
                      value={expectedArrivalEnd}
                      onChange={(e) => setExpectedArrivalEnd(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Same Provider Mode Toggle */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sameProviderMode"
                    checked={sameProviderMode}
                    onChange={toggleSameProviderMode}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="sameProviderMode">
                    Add multiple products from the same provider
                  </Label>
                </div>

                {/* Common Provider Selector when in same provider mode */}
                {sameProviderMode && (
                  <div className="space-y-2">
                    <Label htmlFor="commonProvider">Common Provider *</Label>
                    <Select 
                      value={commonProviderId?.toString() || ''} 
                      onValueChange={(value) => handleCommonProviderChange(parseInt(value))}
                    >
                      <SelectTrigger id="commonProvider">
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id.toString()}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Products</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addProductEntry}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  </div>
                  
                  {productEntries.map((entry, index) => (
                    <div key={entry.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Product #{index + 1}</h3>
                        {productEntries.length > 1 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => removeProductEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!sameProviderMode ? (
                          // Regular provider selector when not in same provider mode
                          <div className="space-y-2">
                            <Label htmlFor={`provider-${entry.id}`}>Provider *</Label>
                            <Select 
                              value={entry.provider_id?.toString() || ''} 
                              onValueChange={(value) => handleProviderChange(entry.id, parseInt(value))}
                            >
                              <SelectTrigger id={`provider-${entry.id}`}>
                                <SelectValue placeholder="Select a provider" />
                              </SelectTrigger>
                              <SelectContent>
                                {providers.map((provider) => (
                                  <SelectItem key={provider.id} value={provider.id.toString()}>
                                    {provider.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          // Display common provider when in same provider mode
                          <div className="space-y-2">
                            <Label>Provider</Label>
                            <div className="p-2 bg-gray-100 rounded">
                              {providers.find(p => p.id === commonProviderId)?.name || 'Not selected'}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor={`product-${entry.id}`}>Product *</Label>
                          <Select 
                            value={entry.product_id?.toString() || ''} 
                            onValueChange={(value) => handleProductChange(entry.id, parseInt(value))}
                            disabled={!entry.provider_id}
                          >
                            <SelectTrigger id={`product-${entry.id}`}>
                              <SelectValue placeholder={entry.provider_id ? "Select a product" : "Select a provider first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {entry.provider_id && filteredProducts[entry.provider_id] ? (
                                filteredProducts[entry.provider_id].map((product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name} ({product.part_number})
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>No products available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`quantity-${entry.id}`}>Quantity *</Label>
                          <Input
                            id={`quantity-${entry.id}`}
                            type="number"
                            min="1"
                            value={entry.quantity}
                            onChange={(e) => handleQuantityChange(entry.id, parseInt(e.target.value) || 1)}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Unit Price</Label>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-muted-foreground">₦</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={Number(entry.unit_price) || 0}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0;
                                  setProductEntries(prev => prev.map(item => 
                                    item.id === entry.id 
                                      ? { ...item, unit_price: newPrice } 
                                      : item
                                  ));
                                }}
                                className="w-32"
                              />
                              <span className="text-sm text-muted-foreground">
                                (Default: ₦{(Number(entry.default_unit_price) || 0).toFixed(2)})
                              </span>
                            </div>
                          </div>
                      </div>

                      {entry.quantity > 0 && (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Total Price:</span>
                            <span className="font-bold text-lg">
                              ₦{(entry.quantity * (Number(entry.unit_price) || 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Serial Number Inputs */}
                      {entry.quantity > 0 && (
                        <div className="space-y-2">
                          <Label>Serial Numbers</Label>
                          {[...Array(entry.quantity)].map((_, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <span className="text-sm text-muted-foreground w-20">SN {index + 1}:</span>
                              <Input
                                type="text"
                                value={entry.serial_numbers[index] || ''}
                                onChange={(e) => handleSerialNumberChange(entry.id, index, e.target.value)}
                                placeholder={`Serial number ${index + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Transactions
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Inbound Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Expected Arrival</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inboundTransactions.map((transaction) => (
                    <TableRow 
                      key={transaction.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        // Check if the click was on the product name, status, or actions column
                        const target = e.target as HTMLElement;
                        if (!target.closest('.product-name-cell') && !target.closest('.status-cell') && !target.closest('.actions-cell')) {
                          // Navigate to transaction details page
                          window.location.href = `/inventory/inbound/${transaction.id}`;
                        }
                      }}
                    >
                      <TableCell 
                        className="font-medium hover:underline cursor-pointer product-name-cell"
                        onClick={() => {
                          // Navigate to product details page
                          window.location.href = `/inventory/products/${transaction.product_id}`;
                        }}
                      >
                        {transaction.product_name}
                        <div className="text-sm text-muted-foreground">{transaction.product_part_number}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <span>{transaction.quantity}</span>
                          {transaction.serial_numbers && transaction.serial_numbers.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                                  <Hash className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {transaction.serial_numbers.map((serial, index) => (
                                  <DropdownMenuItem key={index} className="text-xs">
                                    {serial}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{transaction.provider_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(parseISO(transaction.expected_arrival_start), 'MMM d')} - {format(parseISO(transaction.expected_arrival_end), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.batch_number || 'N/A'}</TableCell>
                      <TableCell className="status-cell">
                        <div className="flex items-center">
                          <Badge 
                            variant={transaction.status === 'Stored' ? 'default' : 'secondary'}
                            title={transaction.status}
                          >
                            {transaction.status === 'Stored' ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <Truck className="h-5 w-5" />
                            )}
                            <span className="sr-only">{transaction.status}</span>
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="actions-cell">
                        <div className="flex space-x-2">
                          {transaction.status === 'Incoming' && (
                            <>
                              {canEditTransaction && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEdit(transaction)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDeleteTransaction && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDelete(transaction.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                              {canMarkAsStored && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleMarkAsStored(transaction.id)}
                                >
                                  Mark as Stored
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}