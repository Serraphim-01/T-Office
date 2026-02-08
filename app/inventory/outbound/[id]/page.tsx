'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useToast } from '@/hooks/use-toast';
import { Package, MapPin, Calendar, Truck, Send, CheckCircle, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useRouter, useParams } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/custom-fast-tooltip';

interface OutboundTransaction {
  id: number;
  inbound_transaction_id: number;
  product_id: number;
  product_name: string;
  product_part_number: string;
  quantity: number;
  receiver_address: string;
  receiver_email: string;
  receiver_phone: string;
  dispatch_datetime: string;
  delivery_datetime: string;
  status: 'Outgoing' | 'Dispatched' | 'Delivered';
  created_at: string;
  serial_numbers: string[] | null;
  serial_numbers_with_prices: Array<{serial_number: string, inbound_price: number}> | null;
  provider_name: string; // Added provider information
  inbound_price?: number; // Added inbound_price property
  outbound_price?: number; // Added outbound_price property
}

export default function OutboundTransactionDetailsPage() {
  const [transaction, setTransaction] = useState<OutboundTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  useEffect(() => {
    if (id) {
      fetchTransactionDetails();
    }
  }, [id]);

  const fetchTransactionDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/inventory/outbound/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch transaction details');
      const data = await response.json();
      // Transform the response to handle both old and new formats
      const transformedData = {
        ...data,
        // If we have serial_numbers_with_prices, use it; otherwise use serial_numbers
        serial_numbers: data.serial_numbers_with_prices 
          ? data.serial_numbers_with_prices.map((item: any) => item.serial_number)
          : data.serial_numbers
      };
      setTransaction(transformedData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load transaction details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (status: 'Dispatched' | 'Delivered') => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/inventory/outbound/${id}/${status.toLowerCase()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`Failed to update transaction to ${status}`);

      toast({ title: 'Success', description: `Transaction updated to ${status}` });
      
      // Refresh transaction details
      fetchTransactionDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to update transaction to ${status}`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this outbound transaction?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/inventory/outbound/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete transaction');

      toast({ title: 'Success', description: 'Transaction deleted successfully' });
      
      // Redirect to outbound list
      router.push('/inventory/outbound');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete transaction',
        variant: 'destructive',
      });
    }
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

  if (!transaction) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <div className="text-center py-8">
            <p className="text-lg">Transaction not found</p>
            <Button onClick={() => router.push('/inventory/outbound')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Outbound
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Button onClick={() => router.push('/inventory/outbound')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Outbound Transaction Details</h1>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={() => handleUpdateStatus('Dispatched')}
              disabled={transaction.status !== 'Outgoing'}
            >
              Mark as Dispatched
            </Button>
            <Button 
              onClick={() => handleUpdateStatus('Delivered')}
              disabled={transaction.status !== 'Dispatched'}
            >
              Mark as Delivered
            </Button>
            <Button 
              variant="outline"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="font-medium">{transaction.product_name}</p>
                  <p className="text-sm text-muted-foreground">{transaction.product_part_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-medium">{transaction.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p> {/* Added Provider information */}
                  <p className="font-medium">{transaction.provider_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <Badge 
                            variant="outline"
                            className="cursor-pointer flex items-center gap-1 px-2 py-1 text-sm font-medium"
                          >
                            {transaction.status === 'Outgoing' && <Truck className="h-4 w-4" />}
                            {transaction.status === 'Dispatched' && <Send className="h-4 w-4" />}
                            {transaction.status === 'Delivered' && <CheckCircle className="h-4 w-4" />}
                            {transaction.status}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{transaction.status}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">{format(parseISO(transaction.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
                {(transaction.outbound_price !== undefined && transaction.outbound_price !== null) && ( // Changed to show total price
                  <div>
                    <p className="text-sm text-muted-foreground">Total Outbound Price (₦)</p>
                    <p className="font-medium text-green-600">
                      {new Intl.NumberFormat('en-NG', {
                        style: 'currency',
                        currency: 'NGN',
                        minimumFractionDigits: 2
                      }).format(typeof transaction.outbound_price === 'number' ? transaction.outbound_price * transaction.quantity : parseFloat(transaction.outbound_price) * transaction.quantity)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receiver Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    {transaction.receiver_address}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{transaction.receiver_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{transaction.receiver_phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scheduling Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dispatch Date & Time</p>
                  <p className="font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(parseISO(transaction.dispatch_datetime), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Date & Time</p>
                  <p className="font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(parseISO(transaction.delivery_datetime), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Serial Numbers</CardTitle>
              </CardHeader>
              <CardContent>
                {transaction.serial_numbers_with_prices && transaction.serial_numbers_with_prices.length > 0 ? (
                  <div className="space-y-2">
                    {transaction.serial_numbers_with_prices.map((item, index) => (
                      <Link key={index} href={`/inventory/serials/${item.serial_number}`} className="hover:underline">
                        <div className="flex items-center justify-between p-2 bg-muted rounded cursor-pointer hover:bg-accent transition-colors">
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">{item.serial_number}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">₦{item.inbound_price != null ? (typeof item.inbound_price === 'number' ? item.inbound_price.toFixed(2) : parseFloat(item.inbound_price).toFixed(2)) : '0.00'}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : transaction.serial_numbers && transaction.serial_numbers.length > 0 ? (
                  <div className="space-y-2">
                    {transaction.serial_numbers.map((serial, index) => (
                      <Link key={index} href={`/inventory/serials/${serial}`} className="hover:underline">
                        <div className="flex items-center space-x-2 p-2 bg-muted rounded cursor-pointer hover:bg-accent transition-colors">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono">{serial}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No serial numbers available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
