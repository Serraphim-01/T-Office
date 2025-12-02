'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useToast } from '@/hooks/use-toast';
import { Package, Calendar, Truck, CheckCircle, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useRouter, useParams } from 'next/navigation';

interface InboundTransaction {
  id: number;
  product_id: number;
  product_name: string;
  product_part_number: string;
  quantity: number;
  provider_name: string;
  expected_arrival_start: string;
  expected_arrival_end: string;
  status: 'Incoming' | 'Stored' | 'Outgoing';
  created_at: string;
  serial_numbers: string[] | null;
}

export default function InboundTransactionDetailsPage() {
  const [transaction, setTransaction] = useState<InboundTransaction | null>(null);
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
      const response = await fetch(`http://localhost:4000/api/inventory/inbound/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch transaction details');
      const data = await response.json();
      setTransaction(data);
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

  const handleMarkAsStored = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/inbound/${id}/store`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to mark transaction as stored');

      toast({ title: 'Success', description: 'Transaction marked as stored' });
      
      // Refresh transaction details
      fetchTransactionDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark transaction as stored',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
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
      
      // Redirect to inbound list
      router.push('/inventory/inbound');
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
            <Button onClick={() => router.push('/inventory/inbound')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inbound
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
            <Button onClick={() => router.push('/inventory/inbound')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Inbound Transaction Details</h1>
          </div>
          <div className="flex space-x-2">
            {transaction.status === 'Incoming' && (
              <>
                <Button onClick={handleMarkAsStored}>
                  Mark as Stored
                </Button>
                <Button variant="outline" onClick={handleDelete}>
                  Delete
                </Button>
              </>
            )}
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
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-medium">#{transaction.id}</p>
                </div>
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
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge 
                    variant={transaction.status === 'Stored' ? 'default' : 
                           transaction.status === 'Outgoing' ? 'secondary' : 'outline'}
                  >
                    {transaction.status === 'Incoming' && <Truck className="h-3 w-3 mr-1" />}
                    {transaction.status === 'Stored' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {transaction.status === 'Outgoing' && <Truck className="h-3 w-3 mr-1" />}
                    {transaction.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">{transaction.provider_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">{format(parseISO(transaction.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Arrival Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Expected Arrival Start</p>
                  <p className="font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(parseISO(transaction.expected_arrival_start), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Arrival End</p>
                  <p className="font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(parseISO(transaction.expected_arrival_end), 'MMM d, yyyy')}
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
                {transaction.serial_numbers && transaction.serial_numbers.length > 0 ? (
                  <div className="space-y-2">
                    {transaction.serial_numbers.map((serial, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-muted rounded">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{serial}</span>
                      </div>
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