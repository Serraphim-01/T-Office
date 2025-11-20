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
}

interface ProductSerialNumbers {
  transaction_id: number;
  provider: string;
  serial_numbers: string[] | null;
}

export default function StorePage() {
  const [storedTransactions, setStoredTransactions] = useState<StoredTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productSerialNumbers, setProductSerialNumbers] = useState<ProductSerialNumbers[]>([]);
  
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

  const handleCreateOutbound = (transactionId: number, productId: number) => {
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
                    <TableHead>Provider</TableHead>
                    <TableHead>Arrival Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Link href={`/inventory/store/${transaction.id}`} className="font-medium hover:underline">
                          {transaction.product_name}
                        </Link>
                        <div className="text-sm text-muted-foreground">{transaction.product_part_number}</div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="flex items-center space-x-2">
                              <span>{transaction.quantity}</span>
                              <Hash className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {transaction.serial_numbers && transaction.serial_numbers.length > 0 ? (
                              transaction.serial_numbers.map((serial, index) => (
                                <DropdownMenuItem key={index}>
                                  {serial}
                                </DropdownMenuItem>
                              ))
                            ) : (
                              <DropdownMenuItem>No serial numbers</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>{transaction.provider}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {transaction.arrival_date ? format(parseISO(transaction.arrival_date), 'MMM d, yyyy') : 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          onClick={() => handleCreateOutbound(transaction.id, transaction.product_id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Outbound
                        </Button>
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