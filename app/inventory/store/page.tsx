'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useToast } from '@/hooks/use-toast';
import { Package, Hash, Calendar, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess } from '@/lib/page-access';
import { AccessControlWrapper } from '@/components/access-control-wrapper';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/custom-fast-tooltip';

interface StoredTransaction {
  id: number;
  product_id: number;
  product_name: string;
  product_part_number: string;
  quantity: number;
  provider: string;
  arrival_date: string;
  serial_numbers: string[] | null;
  status: string;
  provider_name: string; // Added provider_name to match backend
  batch_number?: string; // Added batch_number property
  unit_price?: number; // Added unit_price property
}

interface ProductSerialNumbers {
  transaction_id: number;
  provider_name: string;
  serial_numbers: string[] | null;
  batch_number?: string;
  unit_price?: number;
}

export default function StorePage() {
  return (
    <AccessControlWrapper pagePath="inventory/store">
      <StoreContent />
    </AccessControlWrapper>
  );
}

function StoreContent() {
  const [storedTransactions, setStoredTransactions] = useState<StoredTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productSerialNumbers, setProductSerialNumbers] = useState<ProductSerialNumbers[]>([]);
  
  // Feature access states
  const [canExportCSV, setCanExportCSV] = useState(false);
  const [canCreateOutbound, setCanCreateOutbound] = useState(false);
  
  // Form state
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [dispatchTime, setDispatchTime] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [selectedSerialNumbers, setSelectedSerialNumbers] = useState<string[]>([]);
  
  // State for per-serial number prices
  const [outboundPrice, setOutboundPrice] = useState<number>(0);
  const [useDifferentPrices, setUseDifferentPrices] = useState<boolean>(false);
  const [serialNumberPrices, setSerialNumberPrices] = useState<{[key: string]: number}>({});
  
  // Calculate total outbound price
  const totalOutboundPrice = selectedSerialNumbers.length * outboundPrice;
  
  // State for product markup percentage
  const [productMarkup, setProductMarkup] = useState<number>(0);
  
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
    
    // Check access to inventory store page
    const storeAccess = await hasPageAccess(user.id, 'inventory/store');
    
    if (!storeAccess) {
      // If no access to inventory store page, disable all features
      setCanExportCSV(false);
      setCanCreateOutbound(false);
      return;
    }
    
    // Check access to specific inventory store features
    const exportCSVAccess = await hasPageAccess(user.id, 'inventory/store/export-csv');
    const createOutboundAccess = await hasPageAccess(user.id, 'inventory/store/create-outbound');
    
    setCanExportCSV(exportCSVAccess);
    setCanCreateOutbound(createOutboundAccess);
  };

  // Fetch stored transactions
  useEffect(() => {
    fetchStoredTransactions();
  }, []);

  const fetchStoredTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/inventory/inbound/store', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stored transactions');
      const data = await response.json();
      setStoredTransactions(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load stored transactions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductSerialNumbers = async (productId: number) => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch both product serial numbers and product details
      const [serialsResponse, productResponse] = await Promise.all([
        fetch(`http://localhost:4000/api/inventory/inbound/store/product/${productId}/serials`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`http://localhost:4000/api/inventory/products/${productId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);
      
      if (!serialsResponse.ok) throw new Error('Failed to fetch product serial numbers');
      if (!productResponse.ok) throw new Error('Failed to fetch product details');
      
      const serialsData = await serialsResponse.json();
      const productData = await productResponse.json();
      
      setProductSerialNumbers(serialsData);
      setProductMarkup(productData.default_markup_percentage || 0);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load product serial numbers',
        variant: 'destructive',
      });
    }
  };

  const handleCreateOutbound = (transactionId: number, productId: number) => {
    // Only allow create outbound if user has permission
    if (!canCreateOutbound) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to create outbound transactions',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedTransactionId(transactionId);
    setSelectedProductId(productId);
    setIsModalOpen(true);
    // Reset form
    setReceiverAddress('');
    setReceiverEmail('');
    setReceiverPhone('');
    setDispatchDate('');
    setDispatchTime('');
    setDeliveryDate('');
    setDeliveryTime('');
    setSelectedSerialNumbers([]);
    
    // Fetch all serial numbers for this product from all stored transactions
    fetchProductSerialNumbers(productId);
  };

  const handleSerialNumberToggle = (serialNumber: string) => {
    setSelectedSerialNumbers(prev => {
      if (prev.includes(serialNumber)) {
        return prev.filter(sn => sn !== serialNumber);
      } else {
        return [...prev, serialNumber];
      }
    });
  };

  const handleSubmitOutbound = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!selectedTransactionId || selectedSerialNumbers.length === 0 || !receiverAddress || !receiverEmail || !receiverPhone || 
        !dispatchDate || !dispatchTime || !deliveryDate || !deliveryTime) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields and select at least one serial number',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(receiverEmail)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate phone format (simple validation)
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(receiverPhone)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      // Prepare serial number prices array if using different prices
      let serialPricesArray: number[] = [];
      if (useDifferentPrices) {
        serialPricesArray = selectedSerialNumbers.map(sn => serialNumberPrices[sn] || 0);
      }
      
      const response = await fetch('http://localhost:4000/api/inventory/outbound/multi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: selectedProductId,
          quantity: selectedSerialNumbers.length, // Automatically calculate quantity
          serial_numbers: selectedSerialNumbers,
          receiver_address: receiverAddress,
          receiver_email: receiverEmail,
          receiver_phone: receiverPhone,
          dispatch_datetime: `${dispatchDate}T${dispatchTime}`,
          delivery_datetime: `${deliveryDate}T${deliveryTime}`,
          outbound_price: outboundPrice,
          serial_number_prices: useDifferentPrices ? serialPricesArray : undefined
        }),
      });

      if (!response.ok) throw new Error('Failed to create outbound transaction');

      toast({ 
        title: 'Success', 
        description: 'Outbound transaction created successfully' 
      });
      
      // Close modal and reset form
      setIsModalOpen(false);
      
      // Refresh transactions
      fetchStoredTransactions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const getAllAvailableSerialNumbers = () => {
    return productSerialNumbers;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Store</h1>
          {canExportCSV && (
            <Button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const response = await fetch('http://localhost:4000/api/inventory/export/stored', {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });

                  if (!response.ok) throw new Error('Failed to export stored transactions');

                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'stored_transactions_export.csv';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  toast({
                    title: 'Error',
                    description: 'Failed to export stored transactions',
                    variant: 'destructive',
                  });
                }
              }}
            >
              Export CSV
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stored Transactions</CardTitle>
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
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Arrival Date</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storedTransactions.map((transaction) => (
                    <TableRow 
                      key={transaction.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        // Check if the click was on the product name, status, or actions column
                        const target = e.target as HTMLElement;
                        if (!target.closest('.product-name-cell') && !target.closest('.status-cell') && !target.closest('.actions-cell')) {
                          // Navigate to stored transaction details page
                          window.location.href = `/inventory/store/${transaction.id}`;
                        }
                      }}
                    >
                      <TableCell 
                        className="font-medium hover:underline cursor-pointer product-name-cell"
                        onClick={() => {
                          // Navigate to product details page
                          window.location.href = `/inventory/products/${transaction.product_id}`;
                        }}
                      >{transaction.product_name}<div className="text-sm text-muted-foreground">{transaction.product_part_number}</div></TableCell>
                      <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="flex items-center space-x-2"><span>{transaction.quantity}</span><Hash className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start">{transaction.serial_numbers && transaction.serial_numbers.length > 0 ? transaction.serial_numbers.map((serial, index) => <DropdownMenuItem key={index}>{serial}</DropdownMenuItem>) : <DropdownMenuItem>No serial numbers</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell>
                      <TableCell>₦{(transaction.unit_price != null ? Number(transaction.unit_price).toFixed(2) : '0.00')}</TableCell>
                      <TableCell>₦{(transaction.unit_price != null ? (Number(transaction.unit_price) * Number(transaction.quantity)).toFixed(2) : '0.00')}</TableCell>
                      <TableCell>{transaction.provider_name || transaction.provider || 'N/A'}</TableCell>
                      <TableCell><div className="flex items-center space-x-1"><Calendar className="h-4 w-4 text-muted-foreground" /><span>{transaction.arrival_date ? format(parseISO(transaction.arrival_date), 'MMM d, yyyy') : 'N/A'}</span></div></TableCell>
                      <TableCell>{transaction.batch_number || 'N/A'}</TableCell>
                      <TableCell className="status-cell">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center">
                                <Badge 
                                  variant="outline"
                                  className="cursor-pointer flex items-center gap-1 px-2 py-1 text-sm font-medium"
                                >
                                  <Package className="h-4 w-4" />
                                  Stored
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Stored</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="actions-cell">
                        {canCreateOutbound && (
                          <Button 
                            size="sm" 
                            onClick={() => handleCreateOutbound(transaction.id, transaction.product_id)}
                            className="p-2"
                            title="Create Outbound Transaction"
                          >
                            <Plus className="h-5 w-5" />
                            <span className="sr-only">Create Outbound</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Outbound Creation Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Outbound Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitOutbound} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="receiverAddress">Receiver's Address *</Label>
                  <Textarea
                    id="receiverAddress"
                    value={receiverAddress}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    placeholder="Enter receiver's address"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receiverEmail">Receiver's Email *</Label>
                  <Input
                    id="receiverEmail"
                    type="email"
                    value={receiverEmail}
                    onChange={(e) => setReceiverEmail(e.target.value)}
                    placeholder="Enter receiver's email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receiverPhone">Receiver's Phone *</Label>
                  <Input
                    id="receiverPhone"
                    type="tel"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="Enter receiver's phone"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dispatchDate">Dispatch Date *</Label>
                  <Input
                    id="dispatchDate"
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dispatchTime">Dispatch Time *</Label>
                  <Input
                    id="dispatchTime"
                    type="time"
                    value={dispatchTime}
                    onChange={(e) => setDispatchTime(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Delivery Date *</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryTime">Delivery Time *</Label>
                  <Input
                    id="deliveryTime"
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="outboundPrice">Outbound Price</Label>
                  <Input
                    id="outboundPrice"
                    type="number"
                    step="0.01"
                    value={outboundPrice}
                    onChange={(e) => setOutboundPrice(parseFloat(e.target.value) || 0)}
                    placeholder="Enter outbound price"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Total Outbound Price</Label>
                  <div className="p-2 bg-muted rounded text-sm font-medium">
                    ₦{totalOutboundPrice.toFixed(2)} ({selectedSerialNumbers.length} items × ₦{outboundPrice.toFixed(2)})
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Product Markup</Label>
                  <div className="p-2 bg-muted rounded text-sm font-medium">
                    {productMarkup}%
                  </div>
                </div>
                
                <div className="space-y-2 col-span-full">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="useDifferentPrices"
                      checked={useDifferentPrices}
                      onCheckedChange={(checked) => setUseDifferentPrices(checked as boolean)}
                    />
                    <Label htmlFor="useDifferentPrices" className="text-sm font-medium">
                      Use different prices for selected serial numbers
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Serial Numbers * (Selected: {selectedSerialNumbers.length})</Label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                  {getAllAvailableSerialNumbers().map((transaction, transactionIndex) => (
                    <div key={transaction.transaction_id} className="mb-3">
                      <h4 className="font-medium text-sm mb-2">
                        Batch No: {transaction.batch_number || 'N/A'} (₦{transaction.unit_price != null ? parseFloat(transaction.unit_price.toString()).toFixed(2) : '0.00'})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {transaction.serial_numbers && transaction.serial_numbers.length > 0 ? (
                          transaction.serial_numbers.map((serial, serialIndex) => (
                            <div key={serialIndex} className="flex items-center space-x-2">
                              <Checkbox
                                id={`serial-${transaction.transaction_id}-${serialIndex}`}
                                checked={selectedSerialNumbers.includes(serial)}
                                onCheckedChange={() => handleSerialNumberToggle(serial)}
                              />
                              <Label htmlFor={`serial-${transaction.transaction_id}-${serialIndex}`} className="text-sm">
                                {serial}
                              </Label>
                              {useDifferentPrices && selectedSerialNumbers.includes(serial) && (
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Price"
                                  className="w-24 h-8 text-xs"
                                  value={serialNumberPrices[serial] || ''}
                                  onChange={(e) => {
                                    const newPrice = parseFloat(e.target.value) || 0;
                                    setSerialNumberPrices(prev => ({
                                      ...prev,
                                      [serial]: newPrice
                                    }));
                                  }}
                                />
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground col-span-3">No serial numbers</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {getAllAvailableSerialNumbers().length === 0 && (
                    <p className="text-sm text-muted-foreground">No serial numbers available</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={selectedSerialNumbers.length === 0}>
                  Create Outbound Transaction ({selectedSerialNumbers.length} items)
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
