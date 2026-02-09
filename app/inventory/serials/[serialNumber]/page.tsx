'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Hash, Calendar, Tag, Boxes, DollarSign, Building, BarChart3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

interface SerialNumberDetails {
  serial_number: string;
  created_at: string;
  product: {
    id: number;
    name: string;
    part_number: string;
    default_unit_price: number;
  };
  provider: {
    id: number;
    name: string;
  };
  transaction: {
    id: number;
    batch_number: string;
    inbound_price: number;
    outbound_price: number | null;
    outbound_inbound_price: number | null;
    quantity: number;
    status: string;
    expected_arrival_start: string;
    expected_arrival_end: string;
    arrival_date: string;
    created_at: string;
  };
  price_info: {
    display_price: number | null;
    price_type: string;
    inbound_price: number;
    outbound_price: number | null;
    outbound_inbound_price: number | null;
  };
  serial_numbers_in_same_batch: string[];
  related_transactions: {
    transaction_id: number;
    batch_number: string;
    unit_price: number;
    arrival_date: string;
    status: string;
    quantity: number;
    related_serial_numbers: string[];
  }[];
}

export default function SerialNumberDetailPage() {
  const { serialNumber } = useParams();
  const [serialDetails, setSerialDetails] = useState<SerialNumberDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    if (!serialNumber) return;
    
    const fetchSerialDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        
        const response = await fetch(`${apiUrl}/api/inventory/inbound/serials/${serialNumber}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Serial number not found');
          } else {
            throw new Error('Failed to fetch serial number details');
          }
        } else {
          const data = await response.json();
          setSerialDetails(data);
        }
      } catch (err) {
        console.error('Error fetching serial details:', err);
        setError('Failed to fetch serial number details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSerialDetails();
  }, [serialNumber]);

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>Error Loading Serial Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-500">{error}</p>
              <Button 
                onClick={() => router.back()} 
                className="mt-4"
              >
                Go Back
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Serial Number Details</h1>
          <Link href="/inventory/store" passHref>
            <Button variant="outline">Back to Store</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64" />
              </CardContent>
            </Card>
          </div>
        ) : serialDetails ? (
          <>
            {/* Serial Number Header Card */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Hash className="h-8 w-8 text-blue-500" />
                    <div>
                      <h2 className="text-2xl font-bold">{serialDetails.serial_number}</h2>
                      <p className="text-sm text-muted-foreground">Serial Number</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-lg px-4 py-2 ${
                      serialDetails.transaction.status === 'Incoming' ? 'bg-blue-100 text-blue-800' :
                      serialDetails.transaction.status === 'Stored' ? 'bg-green-100 text-green-800' :
                      serialDetails.transaction.status === 'Outgoing' ? 'bg-yellow-100 text-yellow-800' :
                      serialDetails.transaction.status === 'Dispatched' ? 'bg-purple-100 text-purple-800' :
                      serialDetails.transaction.status === 'Delivered' ? 'bg-gray-100 text-gray-800' :
                      'bg-muted text-muted-foreground'
                    }`}
                  >
                    {serialDetails.transaction.status}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Key Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Tag className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Product</p>
                      <p className="font-semibold">{serialDetails.product.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Provider</p>
                      <p className="font-semibold">{serialDetails.provider.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Status</p>
                      <p className="font-semibold">{serialDetails.transaction.status}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Batch</p>
                      <p className="font-semibold">{serialDetails.transaction.batch_number}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transaction Details */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Transaction Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <tbody>
                    <TableRow>
                      <TableCell className="font-medium">Transaction ID</TableCell>
                      <TableCell>{serialDetails.transaction.id}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Batch Number</TableCell>
                      <TableCell>{serialDetails.transaction.batch_number}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Status</TableCell>
                      <TableCell>
                        <Badge variant="outline">{serialDetails.transaction.status}</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Inbound Price</TableCell>
                      <TableCell>
                        ₦{Number(serialDetails.transaction.inbound_price).toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {(serialDetails.transaction.status === 'Outgoing' || 
                      serialDetails.transaction.status === 'Dispatched' || 
                      serialDetails.transaction.status === 'Delivered') && (
                      <TableRow>
                        <TableCell className="font-medium">Outbound Price</TableCell>
                        <TableCell>
                          {serialDetails.price_info.outbound_price !== null 
                            ? `₦${Number(serialDetails.price_info.outbound_price).toFixed(2)}`
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="font-medium">Default Unit Price</TableCell>
                      <TableCell>
                        ₦{Number(serialDetails.product.default_unit_price).toFixed(2)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Quantity</TableCell>
                      <TableCell>{serialDetails.transaction.quantity}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Expected Arrival</TableCell>
                      <TableCell>
                        {serialDetails.transaction.expected_arrival_start && serialDetails.transaction.expected_arrival_end ? (
                          `${format(parseISO(serialDetails.transaction.expected_arrival_start), 'MMM d, yyyy')} - ${format(parseISO(serialDetails.transaction.expected_arrival_end), 'MMM d, yyyy')}`
                        ) : 'N/A'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Actual Arrival</TableCell>
                      <TableCell>
                        {serialDetails.transaction.arrival_date ? format(parseISO(serialDetails.transaction.arrival_date), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Created At</TableCell>
                      <TableCell>
                        {format(parseISO(serialDetails.transaction.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  </tbody>
                </Table>
              </CardContent>
            </Card>

            {/* Serial Numbers in Same Batch */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Boxes className="h-5 w-5" />
                  <span>Serial Numbers in Same Batch</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {serialDetails.serial_numbers_in_same_batch.length > 0 ? (
                    serialDetails.serial_numbers_in_same_batch.map((serial, index) => (
                      <Link 
                        key={index} 
                        href={`/inventory/serials/${serial}`} 
                        passHref
                      >
                        <Badge 
                          variant={serial === serialDetails.serial_number ? "default" : "secondary"}
                          className="cursor-pointer hover:bg-accent transition-colors"
                        >
                          {serial}
                        </Badge>
                      </Link>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No serial numbers in this batch</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Related Transactions */}
            {serialDetails.related_transactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Related Transactions</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Other transactions with the same product, provider, and batch number
                  </p>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Batch Number</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Arrival Date</TableHead>
                        <TableHead>Serial Numbers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serialDetails.related_transactions.map((transaction, index) => (
                        <TableRow key={index}>
                          <TableCell>{transaction.transaction_id}</TableCell>
                          <TableCell>{transaction.batch_number}</TableCell>
                          <TableCell>₦{Number(transaction.unit_price).toFixed(2)}</TableCell>
                          <TableCell>{transaction.quantity}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {transaction.arrival_date ? format(parseISO(transaction.arrival_date), 'MMM d, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {transaction.related_serial_numbers.slice(0, 3).map((serial, idx) => (
                                <Link key={idx} href={`/inventory/serials/${serial}`} passHref>
                                  <Badge 
                                    variant="secondary" 
                                    className="cursor-pointer hover:bg-accent text-xs"
                                  >
                                    {serial}
                                  </Badge>
                                </Link>
                              ))}
                              {transaction.related_serial_numbers.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{transaction.related_serial_numbers.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}