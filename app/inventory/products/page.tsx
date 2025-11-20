'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Plus, Edit, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DashboardLayout } from '@/components/dashboard-layout';
import Link from 'next/link';

interface Product {
  id: number;
  name: string;
  part_number: string;
  product_type: string;
}

export default function ProductsPage() {
  const [products, setProducts]= useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [productType, setProductType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isComprehensiveImporting, setIsComprehensiveImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

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
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/inventory/products/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to import products');

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: `${result.successCount} products imported successfully. ${result.errorCount} errors occurred.`,
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh product list
      fetchProducts();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import products',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleComprehensiveFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsComprehensiveImporting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/inventory/comprehensive-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to import comprehensive data');

      const result = await response.json();
      
      const totalSuccess = result.successCount.products + result.successCount.inbound + 
                          result.successCount.stored + result.successCount.outbound;
      const totalErrors = result.errorCount.products + result.errorCount.inbound + 
                         result.errorCount.stored + result.errorCount.outbound;
      
      toast({
        title: 'Success',
        description: `Import completed: ${totalSuccess} items imported successfully. ${totalErrors} errors occurred.`,
      });
      
      // Reset file input
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = '';
      }
      
      // Refresh product list
      fetchProducts();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import comprehensive data',
        variant: 'destructive',
      });
    } finally {
      setIsComprehensiveImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct 
        ? `http://localhost:4000/api/inventory/products/${editingProduct.id}` 
        : 'http://localhost:4000/api/inventory/products';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, part_number: partNumber, product_type: productType }),
      });

      if (!response.ok) throw new Error(editingProduct ? 'Failed to update product' : 'Failed to add product');

      const product = await response.json();
      
      if (editingProduct) {
        setProducts(products.map(p => p.id === product.id ? product : p));
        toast({ title: 'Success', description: 'Product updated successfully' });
      } else {
        setProducts([...products, product]);
        toast({ title: 'Success', description: 'Product added successfully' });
      }
      
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPartNumber(product.part_number);
    setProductType(product.product_type);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete product');

      setProducts(products.filter(product => product.id !== id));
      toast({ title: 'Success', description: 'Product deleted successfully' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setName('');
    setPartNumber('');
    setProductType('');
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">Inventory Products</CardTitle>
            <div className="flex space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,text/csv"
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? 'Importing...' : 'Import CSV'}
              </Button>
              
              <input
                type="file"
                ref={csvFileInputRef}
                onChange={handleComprehensiveFileUpload}
                accept=".csv,text/csv"
                className="hidden"
              />
              <Button
                onClick={() => csvFileInputRef.current?.click()}
                disabled={isComprehensiveImporting}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isComprehensiveImporting ? 'Importing...' : 'Import All Data'}
              </Button>
              
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter product name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partNumber">Part Number</Label>
                      <Input
                        id="partNumber"
                        value={partNumber}
                        onChange={(e) => setPartNumber(e.target.value)}
                        placeholder="Enter part number"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="productType">Product Type</Label>
                      <Input
                        id="productType"
                        value={productType}
                        onChange={(e) => setProductType(e.target.value)}
                        placeholder="Enter product type"
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingProduct ? 'Update Product' : 'Add Product'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.part_number}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/inventory/products/${product.id}`}>
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(product)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(product.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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