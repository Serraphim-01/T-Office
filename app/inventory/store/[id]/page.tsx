'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useToast } from '@/hooks/use-toast';
import { Package, Calendar, CheckCircle, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useRouter, useParams } from 'next/navigation';

interface StoredTransaction {
  id: number;
  product_id: number;
  product_name: string;
  product_part_number: string;
  quantity: number;
  provider: string;
  provider_name: string;
  arrival_date: string;
  status: string;
  created_at: string;
  serial_numbers: string[] | null;
  batch_number?: string;
}

export default function StoredTransactionDetailsPage() {
  const [transaction, setTransaction] = useState<StoredTransaction | null>(null);
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
      const response = await fetch(`http://localhost:4000/api/inventory/inbound/store/${id}`, {
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
            <Button onClick={() => router.push('/inventory/store')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Store
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
            <Button onClick={() => router.push('/inventory/store')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Stored Transaction Details</h1>
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
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {transaction.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">{transaction.provider_name || transaction.provider || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">{format(parseISO(transaction.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
                {transaction.batch_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Batch Number</p>
                    <p className="font-medium">{transaction.batch_number}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Arrival Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Arrival Date</p>
                  <p className="font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {transaction.arrival_date ? format(parseISO(transaction.arrival_date), 'MMM d, yyyy') : 'N/A'}
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