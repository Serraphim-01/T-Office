'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Package, Hash, Tag, Calendar, Clock, Truck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Product {
  id: number;
  name: string;
  part_number: string;
  product_type: string;
  created_at: string;
  updated_at: string;
}

interface InboundTransaction {
  id: number;
  quantity: number;
  provider: string;
  expected_arrival_start: string;
  expected_arrival_end: string;
  status: 'Incoming' | 'Stored';
  created_at: string;
  serial_numbers: string[] | null;
}

export default function ProductDetailsPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [inboundTransactions, setInboundTransactions] = useState<InboundTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInboundLoading, setIsInboundLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Fetch product details
  useEffect(() => {
    Promise.all([fetchProduct(), fetchInboundTransactions()]);
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

  const fetchInboundTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/inbound/product/${params.id}`, {
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
      setIsInboundLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/inventory/products');
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
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{product.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="font-medium">
                      {new Date(product.created_at).toLocaleDateString()}{' '}
                      {new Date(product.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {new Date(product.updated_at).toLocaleDateString()}{' '}
                      {new Date(product.updated_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="mr-2 h-5 w-5" />
              Inbound Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isInboundLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : inboundTransactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Expected Arrival</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Serial Numbers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inboundTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>{transaction.provider}</TableCell>
                      <TableCell>
                        {format(parseISO(transaction.expected_arrival_start), 'MMM d')} - {format(parseISO(transaction.expected_arrival_end), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={transaction.status === 'Stored' ? 'default' : 'secondary'}
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.serial_numbers && transaction.serial_numbers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {transaction.serial_numbers.map((serial, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {serial}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No serial numbers</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No inbound transactions found for this product.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}