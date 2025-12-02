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
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
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
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [serialNumbers, setSerialNumbers] = useState<string[]>(['']);
  const [expectedArrivalStart, setExpectedArrivalStart] = useState('');
  const [expectedArrivalEnd, setExpectedArrivalEnd] = useState('');
  
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

  // Filter products when provider is selected
  useEffect(() => {
    if (selectedProviderId) {
      // Fetch products for this specific provider
      fetchProductsByProvider(selectedProviderId);
    } else {
      setFilteredProducts([]);
    }
  }, [selectedProviderId]);

  const fetchProductsByProvider = async (providerId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/providers/${providerId}/products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch products for provider');
      const data = await response.json();
      setFilteredProducts(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load products for selected provider',
        variant: 'destructive',
      });
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
      // Find provider by name
      const provider = providers.find(p => p.name === transaction.provider_name);
      if (provider) {
        setSelectedProviderId(provider.id);
      }
      setSelectedProductId(transaction.product_id);
      setQuantity(transaction.quantity);
      setSerialNumbers(data.serial_numbers && data.serial_numbers.length > 0 
        ? data.serial_numbers 
        : Array(transaction.quantity).fill(''));
      setExpectedArrivalStart(transaction.expected_arrival_start.split('T')[0]);
      setExpectedArrivalEnd(transaction.expected_arrival_end.split('T')[0]);
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

  const handleQuantityChange = (value: number) => {
    setQuantity(value);
    // Adjust serial numbers array to match quantity
    setSerialNumbers(prev => {
      const newSerialNumbers = [...prev];
      if (value > prev.length) {
        // Add new empty serial numbers
        return [...newSerialNumbers, ...Array(value - prev.length).fill('')];
      } else if (value < prev.length) {
        // Remove extra serial numbers
        return newSerialNumbers.slice(0, value);
      }
      return newSerialNumbers;
    });
  };

  const handleSerialNumberChange = (index: number, value: string) => {
    const newSerialNumbers = [...serialNumbers];
    newSerialNumbers[index] = value;
    setSerialNumbers(newSerialNumbers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!selectedProviderId || !selectedProductId || quantity <= 0 || !expectedArrivalStart || !expectedArrivalEnd) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    
    // Get provider name
    const provider = providers.find(p => p.id === selectedProviderId);
    if (!provider) {
      toast({
        title: 'Validation Error',
        description: 'Please select a valid provider',
        variant: 'destructive',
      });
      return;
    }
    
    // Get product
    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      toast({
        title: 'Validation Error',
        description: 'Please select a valid product',
        variant: 'destructive',
      });
      return;
    }
    
    // Check for duplicate serial numbers
    const nonEmptySerials = serialNumbers.filter(sn => sn.trim() !== '');
    if (new Set(nonEmptySerials).size !== nonEmptySerials.length) {
      toast({
        title: 'Validation Error',
        description: 'Serial numbers must be unique',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing 
        ? `http://localhost:4000/api/inventory/inbound/${editingTransactionId}` 
        : 'http://localhost:4000/api/inventory/inbound';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: selectedProductId,
          quantity,
          serial_numbers: serialNumbers,
          provider_id: selectedProviderId,
          expected_arrival_start: expectedArrivalStart,
          expected_arrival_end: expectedArrivalEnd
        }),
      });

      if (!response.ok) throw new Error(isEditing ? 'Failed to update inbound transaction' : 'Failed to add inbound transaction');

      toast({ 
        title: 'Success', 
        description: isEditing ? 'Inbound transaction updated successfully' : 'Inbound transaction added successfully' 
      });
      
      // Reset form
      setSelectedProviderId(null);
      setSelectedProductId(null);
      setQuantity(1);
      setSerialNumbers(['']);
      setExpectedArrivalStart('');
      setExpectedArrivalEnd('');
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

  const resetForm = () => {
    setIsAdding(false);
    setIsEditing(false);
    setEditingTransactionId(null);
    setSelectedProviderId(null);
    setSelectedProductId(null);
    setQuantity(1);
    setSerialNumbers(['']);
    setExpectedArrivalStart('');
    setExpectedArrivalEnd('');
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
              <CardTitle>{isEditing ? 'Edit Inbound Transaction' : 'Add New Inbound Transaction'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider *</Label>
                    <Select 
                      value={selectedProviderId?.toString() || ''} 
                      onValueChange={(value) => setSelectedProviderId(parseInt(value))}
                    >
                      <SelectTrigger>
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

                  <div className="space-y-2">
                    <Label htmlFor="product">Product *</Label>
                    <Select 
                      value={selectedProductId?.toString() || ''} 
                      onValueChange={(value) => setSelectedProductId(parseInt(value))}
                      disabled={!selectedProviderId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedProviderId ? "Select a product" : "Select a provider first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} ({product.part_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>

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

                {quantity > 0 && (
                  <div className="space-y-2">
                    <Label>Serial Numbers</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {serialNumbers.map((serial, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">#{index + 1}</span>
                          <Input
                            value={serial}
                            onChange={(e) => handleSerialNumberChange(index, e.target.value)}
                            placeholder={`Serial #${index + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {isEditing ? 'Update Transaction' : 'Add Transaction'}
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
                        // Check if the click was on the product name cell
                        const target = e.target as HTMLElement;
                        if (!target.closest('.product-name-cell')) {
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
                      <TableCell>
                        <Badge 
                          variant={transaction.status === 'Stored' ? 'default' : 'secondary'}
                        >
                          {transaction.status === 'Stored' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <Truck className="h-3 w-3 mr-1" />
                          )}
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
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