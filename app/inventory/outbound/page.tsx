'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useToast } from '@/hooks/use-toast';
import { Package, MapPin, Calendar, Truck, CheckCircle, Edit, Trash2, Send } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess } from '@/lib/page-access';
import { AccessControlWrapper } from '@/components/access-control-wrapper';

interface OutboundTransaction {
  id: number;
  product_id: number;
  product_name: string;
  product_part_number: string;
  quantity: number;
  receiver_address: string;
  receiver_email: string;
  receiver_phone: string;
  dispatch_date: string;
  delivery_date: string;
  status: 'Outgoing' | 'Dispatched' | 'Delivered';
  created_at: string;
  serial_numbers: string[] | null;
}

interface StoredTransaction {
  id: number;
  product_id: number;
  product_name: string;
  product_part_number: string;
  quantity: number;
  provider: string;
  arrival_date: string;
  status: string;
  serial_numbers: string[] | null;
}

interface ProductSerialNumbers {
  transaction_id: number;
  provider: string;
  serial_numbers: string[] | null;
}

export default function OutboundPage() {
  return (
    <AccessControlWrapper pagePath="inventory/outbound">
      <OutboundContent />
    </AccessControlWrapper>
  );
}

function OutboundContent() {
  const [outboundTransactions, setOutboundTransactions] = useState<OutboundTransaction[]>([]);
  const [storedTransactions, setStoredTransactions] = useState<StoredTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productSerialNumbers, setProductSerialNumbers] = useState<ProductSerialNumbers[]>([]);
  
  // Feature access states
  const [canExportCSV, setCanExportCSV] = useState(false);
  const [canMarkAsDispatched, setCanMarkAsDispatched] = useState(false);
  const [canMarkAsDelivered, setCanMarkAsDelivered] = useState(false);
  const [canDeleteTransaction, setCanDeleteTransaction] = useState(false);
  
  // Form state
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [dispatchTime, setDispatchTime] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [selectedSerialNumbers, setSelectedSerialNumbers] = useState<string[]>([]);
  
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
    
    // Check access to inventory outbound page
    const outboundAccess = await hasPageAccess(user, 'inventory/outbound');
    
    if (!outboundAccess) {
      // If no access to inventory outbound page, disable all features
      setCanExportCSV(false);
      setCanMarkAsDispatched(false);
      setCanMarkAsDelivered(false);
      setCanDeleteTransaction(false);
      return;
    }
    
    // Check access to specific inventory outbound features
    const exportCSVAccess = await hasPageAccess(user, 'inventory/outbound/export-csv');
    const markAsDispatchedAccess = await hasPageAccess(user, 'inventory/outbound/mark-as-dispatched');
    const markAsDeliveredAccess = await hasPageAccess(user, 'inventory/outbound/mark-as-delivered');
    const deleteTransactionAccess = await hasPageAccess(user, 'inventory/outbound/delete-transaction');
    
    setCanExportCSV(exportCSVAccess);
    setCanMarkAsDispatched(markAsDispatchedAccess);
    setCanMarkAsDelivered(markAsDeliveredAccess);
    setCanDeleteTransaction(deleteTransactionAccess);
  };

  // Fetch outbound and stored transactions
  useEffect(() => {
    Promise.all([fetchOutboundTransactions(), fetchStoredTransactions()]);
  }, []);

  const fetchOutboundTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/inventory/outbound', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch outbound transactions');
      const data = await response.json();
      setOutboundTransactions(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load outbound transactions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    }
  };

  const fetchProductSerialNumbers = async (productId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/inbound/store/product/${productId}/serials`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch product serial numbers');
      const data = await response.json();
      setProductSerialNumbers(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load product serial numbers',
        variant: 'destructive',
      });
    }
  };

  const handleSetAsOutbound = (transactionId: number, productId: number) => {
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
    
    // Fetch all serial numbers for this product
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
      const response = await fetch('http://localhost:4000/api/inventory/outbound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          inbound_transaction_id: selectedTransactionId,
          quantity: selectedSerialNumbers.length, // Automatically calculate quantity
          serial_numbers: selectedSerialNumbers,
          receiver_address: receiverAddress,
          receiver_email: receiverEmail,
          receiver_phone: receiverPhone,
          dispatch_datetime: `${dispatchDate}T${dispatchTime}`,
          delivery_datetime: `${deliveryDate}T${deliveryTime}`
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
      Promise.all([fetchOutboundTransactions(), fetchStoredTransactions()]);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (id: number, status: 'Dispatched' | 'Delivered') => {
    // Check permission based on status
    if ((status === 'Dispatched' && !canMarkAsDispatched) || 
        (status === 'Delivered' && !canMarkAsDelivered)) {
      toast({
        title: 'Access Denied',
        description: `You do not have permission to mark transactions as ${status.toLowerCase()}`,
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/outbound/${id}/${status.toLowerCase()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`Failed to update transaction to ${status}`);

      toast({ title: 'Success', description: `Transaction updated to ${status}` });
      
      // Refresh transactions
      fetchOutboundTransactions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to update transaction to ${status}`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    // Only allow delete if user has delete permission
    if (!canDeleteTransaction) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to delete outbound transactions',
        variant: 'destructive',
      });
      return;
    }
    
    if (!confirm('Are you sure you want to delete this outbound transaction?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/outbound/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete transaction');

      toast({ title: 'Success', description: 'Transaction deleted successfully' });
      
      // Refresh transactions
      fetchOutboundTransactions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete transaction',
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
          <h1 className="text-3xl font-bold">Outbound Transactions</h1>
          {canExportCSV && (
            <Button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const response = await fetch('http://localhost:4000/api/inventory/export/outbound', {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });

                  if (!response.ok) throw new Error('Failed to export outbound transactions');

                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'outbound_transactions_export.csv';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  toast({
                    title: 'Error',
                    description: 'Failed to export outbound transactions',
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
            <CardTitle>Outbound Transactions</CardTitle>
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
                    <TableHead>Delivery Address</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outboundTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Link href={`/inventory/outbound/${transaction.id}`} className="font-medium hover:underline">
                          {transaction.product_name}
                        </Link>
                        <div className="text-sm text-muted-foreground">{transaction.product_part_number}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{transaction.receiver_address}</span>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={transaction.status === 'Delivered' ? 'default' : 
                                 transaction.status === 'Dispatched' ? 'secondary' : 'outline'}
                        >
                          {transaction.status === 'Outgoing' && <Truck className="h-3 w-3 mr-1" />}
                          {transaction.status === 'Dispatched' && <Send className="h-3 w-3 mr-1" />}
                          {transaction.status === 'Delivered' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {canMarkAsDispatched && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUpdateStatus(transaction.id, 'Dispatched')}
                              disabled={transaction.status !== 'Outgoing'}
                            >
                              Mark as Dispatched
                            </Button>
                          )}
                          {canMarkAsDelivered && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUpdateStatus(transaction.id, 'Delivered')}
                              disabled={transaction.status !== 'Dispatched'}
                            >
                              Mark as Delivered
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
                        </div>
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
              </div>

              <div className="space-y-2">
                <Label>Select Serial Numbers * (Selected: {selectedSerialNumbers.length})</Label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                  {getAllAvailableSerialNumbers().map((transaction, transactionIndex) => (
                    <div key={transactionIndex} className="mb-3">
                      <h4 className="font-medium text-sm mb-2">From {transaction.provider}:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {transaction.serial_numbers && transaction.serial_numbers.length > 0 ? (
                          transaction.serial_numbers.map((serial, serialIndex) => (
                            <div key={serialIndex} className="flex items-center space-x-2">
                              <Checkbox
                                id={`serial-${transactionIndex}-${serialIndex}`}
                                checked={selectedSerialNumbers.includes(serial)}
                                onCheckedChange={() => handleSerialNumberToggle(serial)}
                              />
                              <Label htmlFor={`serial-${transactionIndex}-${serialIndex}`} className="text-sm">
                                {serial}
                              </Label>
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