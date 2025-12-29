'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Package, Hash, Tag, Calendar, Clock, Truck, Save, X, Send, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess } from '@/lib/page-access';

interface Product {
  id: number;
  name: string;
  part_number: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  default_unit_price: number;
  default_markup_percentage?: number;
  provider_id?: number;
}

interface ProductFormData {
  name: string;
  part_number: string;
  product_type: string;
  default_unit_price: number;
  default_markup_percentage: number;
  provider_id: number;
}

interface Transaction {
  id: number;
  type: 'inbound' | 'stored' | 'outbound';
  quantity: number;
  provider?: string;
  provider_name?: string;
  receiver_address?: string;
  expected_arrival_start?: string;
  expected_arrival_end?: string;
  arrival_date?: string;
  dispatch_datetime?: string;
  delivery_datetime?: string;
  status: string;
  created_at: string;
  serial_numbers: string[] | null;
  serial_numbers_with_prices?: Array<{serial_number: string, inbound_price: number}> | null;
  batch_number?: string;
  inbound_price?: number;
  outbound_price?: number;
}

interface Provider {
  id: number;
  name: string;
}

export default function ProductDetailsPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]); // Added providers state
  const [isLoading, setIsLoading] = useState(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState({
    name: '',
    part_number: '',
    product_type: '',
    default_unit_price: 0,
    default_markup_percentage: 0, // Added this field
    provider_id: 0
  });
  const [canEditProduct, setCanEditProduct] = useState(false);
  const router = useRouter();
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
    
    // Check access to edit product details
    const editProductDetailsAccess = await hasPageAccess(user.id.toString(), 'inventory/products/edit-product');
    
    setCanEditProduct(editProductDetailsAccess);
  };

  // Fetch providers
  useEffect(() => {
    fetchProviders();
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
      console.error('Error fetching providers:', error);
    }
  };

  // Fetch product details
  useEffect(() => {
    Promise.all([fetchProduct(), fetchAllTransactions()]);
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/products/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch product');
      const data = await response.json();
      setProduct(data);
      setEditedProduct({
        name: data.name,
        part_number: data.part_number,
        product_type: data.product_type,
        default_unit_price: data.default_unit_price ?? 0,
        default_markup_percentage: data.default_markup_percentage ?? 0, // Added this field
        provider_id: data.provider_id ?? 0
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load product details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all transaction types in parallel
      const [inboundResponse, storedResponse, outboundResponse] = await Promise.all([
        fetch(`http://localhost:4000/api/inventory/inbound/product/${params.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:4000/api/inventory/inbound/store/product/${params.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:4000/api/inventory/outbound/product/${params.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      let allTransactions: Transaction[] = [];

      // Process inbound transactions
      if (inboundResponse.ok) {
        const inboundData = await inboundResponse.json();
        allTransactions = [...allTransactions, ...inboundData.map((t: any) => ({ ...t, type: 'inbound' as const }))];
      }

      // Process stored transactions
      if (storedResponse.ok) {
        const storedData = await storedResponse.json();
        allTransactions = [...allTransactions, ...storedData.map((t: any) => ({ ...t, type: 'stored' as const }))];
      }

      // Process outbound transactions
      if (outboundResponse.ok) {
        const outboundData = await outboundResponse.json();
        // Filter out outbound transactions with quantity 0
        const filteredOutboundData = outboundData.filter((t: any) => t.quantity > 0);
        allTransactions = [...allTransactions, ...filteredOutboundData.map((t: any) => ({ 
          ...t, 
          type: 'outbound' as const,
          // Transform serial_numbers_with_prices to serial_numbers array if available
          serial_numbers: t.serial_numbers_with_prices 
            ? t.serial_numbers_with_prices.map((item: any) => item.serial_number)
            : t.serial_numbers || null
        }))];
      }

      // Sort by creation date (newest first)
      allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive',
      });
    } finally {
      setIsTransactionsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/inventory/products');
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editedProduct,
          provider_id: editedProduct.provider_id || 0 // Ensure provider_id is sent
        }),
      });

      if (!response.ok) throw new Error('Failed to update product');

      const updatedProduct = await response.json();
      setProduct(updatedProduct);
      setIsEditing(false);
      
      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update product',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'incoming':
        return 'secondary';
      case 'stored':
        return 'default';
      case 'outgoing':
        return 'outline';
      case 'dispatched':
        return 'secondary';
      case 'delivered':
        return 'default';
      default:
        return 'secondary';
    }
  };

  // New helper function to format serial numbers display
  const formatSerialNumbersDisplay = (serialNumbers: string[] | null) => {
    if (!serialNumbers || serialNumbers.length === 0) {
      return <span className="text-muted-foreground text-sm">No serial numbers</span>;
    }

    // Show first 3 serial numbers
    const displayedSerials = serialNumbers.slice(0, 3);
    const remainingCount = serialNumbers.length - 3;

    return (
      <div className="flex flex-wrap gap-1">
        {displayedSerials.map((serial, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {serial}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            +{remainingCount} more
          </Badge>
        )}
      </div>
    );
  };

  const getTypeDisplay = (type: string) => {
    switch (type) {
      case 'inbound':
        return 'Inbound';
      case 'stored':
        return 'Stored';
      case 'outbound':
        return 'Outbound';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  // Add this helper function for currency formatting
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>Product Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p>The requested product could not be found.</p>
              <Button onClick={handleBack} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
          {!isEditing && canEditProduct && (
            <Button 
              variant="outline" 
              onClick={() => setIsEditing(true)}
            >
              Edit Product
            </Button>
          )}
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {isEditing ? 'Edit Product' : product.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name *</Label>
                    <Input
                      id="productName"
                      value={editedProduct.name}
                      onChange={(e) => setEditedProduct({...editedProduct, name: e.target.value})}
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partNumber">Part Number *</Label>
                    <Input
                      id="partNumber"
                      value={editedProduct.part_number}
                      onChange={(e) => setEditedProduct({...editedProduct, part_number: e.target.value})}
                      placeholder="Enter part number"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productType">Product Type *</Label>
                    <Input
                      id="productType"
                      value={editedProduct.product_type}
                      onChange={(e) => setEditedProduct({...editedProduct, product_type: e.target.value})}
                      placeholder="Enter product type"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultUnitPrice">Default Unit Price (₦)</Label>
                    <Input
                      id="defaultUnitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedProduct.default_unit_price}
                      onChange={(e) => setEditedProduct({...editedProduct, default_unit_price: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                      placeholder="Enter default unit price"
                    />
                  </div>
                  {/* Added default markup percentage field */}
                  <div className="space-y-2">
                    <Label htmlFor="defaultMarkupPercentage">Default Markup Percentage (%)</Label>
                    <Input
                      id="defaultMarkupPercentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editedProduct.default_markup_percentage}
                      onChange={(e) => setEditedProduct({...editedProduct, default_markup_percentage: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                      placeholder="Enter default markup percentage"
                    />
                  </div>
                  {/* Added provider selection for editing */}
                  <div className="space-y-2">
                    <Label htmlFor="providerId">Provider *</Label>
                    <select
                      id="providerId"
                      value={editedProduct.provider_id}
                      onChange={(e) => setEditedProduct({...editedProduct, provider_id: e.target.value === '' ? 0 : parseInt(e.target.value)})}
                      className="w-full p-2 border rounded"
                      required
                    >
                      <option value="">Select a provider</option>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Product Name</p>
                      <p className="font-medium">{product.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Hash className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Part Number</p>
                      <p className="font-medium">{product.part_number}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Tag className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Product Type</p>
                      <Badge variant="default">{product.product_type}</Badge>
                    </div>
                  </div>

                  {product && product.default_unit_price > 0 && (
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-green-600">₦</span>
                      <div>
                        <p className="text-sm text-muted-foreground">Default Unit Price</p>
                        <p className="font-medium text-green-600">{formatCurrency(product.default_unit_price)}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Added display for default markup percentage */}
                  {product && product.default_markup_percentage !== undefined && (
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Default Markup Percentage</p>
                        <p className="font-medium">{parseFloat(product.default_markup_percentage?.toString() || '0').toFixed(2)}%</p>
                      </div>
                    </div>
                  )}
                  
                  {product.provider_id && (
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Provider</p>
                        <p className="font-medium">
                          {providers.find(p => p.id === product.provider_id)?.name || 'Unknown Provider'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="mr-2 h-5 w-5" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isTransactionsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Serial Numbers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow 
                      key={`${transaction.type}-${transaction.id}`}
                      className="cursor-pointer"
                      onClick={() => {
                        // Navigate to the appropriate transaction details page based on type
                        if (transaction.type === 'inbound') {
                          window.location.href = `/inventory/inbound/${transaction.id}`;
                        } else if (transaction.type === 'stored') {
                          window.location.href = `/inventory/store/${transaction.id}`;
                        } else if (transaction.type === 'outbound') {
                          window.location.href = `/inventory/outbound/${transaction.id}`;
                        }
                      }}
                    >
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>
                        {transaction.provider || transaction.provider_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {transaction.type === 'inbound' && transaction.expected_arrival_start && transaction.expected_arrival_end
                          ? `${formatDate(transaction.expected_arrival_start)} - ${formatDate(transaction.expected_arrival_end)}`
                          : transaction.type === 'stored' && transaction.arrival_date
                          ? formatDate(transaction.arrival_date)
                          : transaction.type === 'outbound' && transaction.dispatch_datetime
                          ? formatDate(transaction.dispatch_datetime)
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Badge variant={getStatusBadgeVariant(transaction.status)} title={transaction.status}>
                            {transaction.status.toLowerCase() === 'incoming' && <Truck className="h-5 w-5" />}
                            {transaction.status.toLowerCase() === 'stored' && <Package className="h-5 w-5" />}
                            {transaction.status.toLowerCase() === 'outgoing' && <Truck className="h-5 w-5" />}
                            {transaction.status.toLowerCase() === 'dispatched' && <Send className="h-5 w-5" />}
                            {transaction.status.toLowerCase() === 'delivered' && <CheckCircle className="h-5 w-5" />}
                            <span className="sr-only">{transaction.status}</span>
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.batch_number || 'N/A'}</TableCell>
                      <TableCell>
                        {formatSerialNumbersDisplay(transaction.serial_numbers)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No transactions found for this product.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}