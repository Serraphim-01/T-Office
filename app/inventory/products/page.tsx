'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Edit, Trash2, ClipboardList, ArrowRight, MoreHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: number;
  name: string;
  serial_number: string;
  part_number: string;
  quantity: number;
  state: string;
  container: string;
  type: string;
  arrival_date: string;
  created_at: string;
  updated_at: string;
  current_inventory_quantity: number;
}

const stateColors = {
  'Incoming': 'bg-blue-100 text-blue-800',
  'Arrived': 'bg-green-100 text-green-800',
  'Stored': 'bg-purple-100 text-purple-800',
  'Outgoing': 'bg-yellow-100 text-yellow-800',
  'Dispatched': 'bg-orange-100 text-orange-800',
  'Delivered': 'bg-gray-100 text-gray-800',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStateDialog, setShowStateDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    serial_number: '',
    part_number: '',
    quantity: 1,
    container: '',
    type: '',
    arrival_date: '',
  });
  const [stateData, setStateData] = useState({
    state: '',
    notes: '',
  });
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedState, setSelectedState] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const processedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesState = selectedState === 'all' || product.state === selectedState;
      const matchesSearch = searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.part_number && product.part_number.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesState && matchesSearch;
    });

    filtered.sort((a, b) => {
      const aValue = a[sortColumn as keyof Product] as string | number;
      const bValue = b[sortColumn as keyof Product] as string | number;
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, selectedState, searchQuery, sortColumn, sortDirection]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/inventory/products', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Calculate current inventory quantity for each product
        const productsWithInventory = data.map((product: any) => ({
          ...product,
          current_inventory_quantity: product.state === 'Stored' ? product.quantity : 0
        }));
        setProducts(productsWithInventory);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch products',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:4000/api/inventory/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Product added successfully',
        });
        setShowAddDialog(false);
        setFormData({ name: '', serial_number: '', part_number: '', quantity: 1, container: '', type: '', arrival_date: '' });
        fetchProducts();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to add product',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: 'Error',
        description: 'Failed to add product',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const response = await fetch(`http://localhost:4000/api/inventory/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Product updated successfully',
        });
        setShowEditDialog(false);
        setSelectedProduct(null);
        fetchProducts();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update product',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`http://localhost:4000/api/inventory/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Product deleted successfully',
        });
        fetchProducts();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete product',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const response = await fetch(`http://localhost:4000/api/inventory/products/${selectedProduct.id}/state`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(stateData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Product state updated successfully',
        });
        setShowStateDialog(false);
        setSelectedProduct(null);
        setStateData({ state: '', notes: '' });
        fetchProducts();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update product state',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating product state:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product state',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      serial_number: product.serial_number,
      part_number: product.part_number,
      quantity: product.quantity,
      container: product.container,
      type: product.type,
      arrival_date: product.arrival_date,
    });
    setShowEditDialog(true);
  };

  const openStateDialog = (product: Product) => {
    setSelectedProduct(product);
    setStateData({ state: product.state, notes: '' });
    setShowStateDialog(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-lg">Loading products...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Products</h1>
            <p className="text-gray-600">Complete catalog of all products and their current inventory levels</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="part_number">Part Number</Label>
                  <Input
                    id="part_number"
                    value={formData.part_number}
                    onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="container">Container</Label>
                  <Select value={formData.container} onValueChange={(value) => setFormData({ ...formData, container: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select container" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Individual piece">Individual piece</SelectItem>
                      <SelectItem value="Carton">Carton</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PC">PC</SelectItem>
                      <SelectItem value="Server">Server</SelectItem>
                      <SelectItem value="Monitor">Monitor</SelectItem>
                      <SelectItem value="Rack">Rack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="arrival_date">Arrival Date</Label>
                  <Input
                    id="arrival_date"
                    type="date"
                    value={formData.arrival_date}
                    onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                  />
                </div>

                <Button type="submit">Add Product</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ClipboardList className="mr-2 h-5 w-5" />
              All Products ({products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, serial, or part number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="Incoming">Incoming</SelectItem>
                  <SelectItem value="Arrived">Arrived</SelectItem>
                  <SelectItem value="Stored">Stored</SelectItem>
                  <SelectItem value="Outgoing">Outgoing</SelectItem>
                  <SelectItem value="Dispatched">Dispatched</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                    Name {sortColumn === 'name' && (sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('part_number')}>
                    Part Number {sortColumn === 'part_number' && (sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('current_inventory_quantity')}>
                    Current Inventory {sortColumn === 'current_inventory_quantity' && (sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('state')}>
                    State {sortColumn === 'state' && (sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium cursor-pointer" onClick={() => { setSelectedProduct(product); setShowDetailsDialog(true); }}>
                      {product.name}
                    </TableCell>
                    <TableCell>{product.part_number || '-'}</TableCell>
                    <TableCell className="font-semibold">
                      {product.current_inventory_quantity}
                    </TableCell>
                    <TableCell>
                      <Badge className={stateColors[product.state as keyof typeof stateColors] || 'bg-gray-100 text-gray-800'}>
                        {product.state}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(product)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openStateDialog(product)}>
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Update State
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteProduct(product.id)} className="text-red-600">
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
          </CardContent>
        </Card>

        {/* Edit Product Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Product Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-serial">Serial Number</Label>
                <Input
                  id="edit-serial"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-part">Part Number</Label>
                <Input
                  id="edit-part"
                  value={formData.part_number}
                  onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-container">Container</Label>
                <Select value={formData.container} onValueChange={(value) => setFormData({ ...formData, container: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select container" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual piece">Individual piece</SelectItem>
                    <SelectItem value="Carton">Carton</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PC">PC</SelectItem>
                    <SelectItem value="Server">Server</SelectItem>
                    <SelectItem value="Monitor">Monitor</SelectItem>
                    <SelectItem value="Rack">Rack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-arrival_date">Arrival Date</Label>
                <Input
                  id="edit-arrival_date"
                  type="date"
                  value={formData.arrival_date}
                  onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                />
              </div>

              <Button type="submit">Update Product</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Update State Dialog */}
        <Dialog open={showStateDialog} onOpenChange={setShowStateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Product State</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateState} className="space-y-4">
              <div>
                <Label htmlFor="state">New State</Label>
                <Select value={stateData.state} onValueChange={(value) => setStateData({ ...stateData, state: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Incoming">Incoming</SelectItem>
                    <SelectItem value="Arrived">Arrived</SelectItem>
                    <SelectItem value="Stored">Stored</SelectItem>
                    <SelectItem value="Outgoing">Outgoing</SelectItem>
                    <SelectItem value="Dispatched">Dispatched</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={stateData.notes}
                  onChange={(e) => setStateData({ ...stateData, notes: e.target.value })}
                  placeholder="Optional notes about this state change"
                />
              </div>
              <Button type="submit">Update State</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Product Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Product Details - {selectedProduct?.name}</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Serial Number</Label>
                    <p className="text-sm text-gray-600">{selectedProduct.serial_number}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Part Number</Label>
                    <p className="text-sm text-gray-600">{selectedProduct.part_number || '-'}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Total Quantity</Label>
                    <p className="text-sm text-gray-600">{selectedProduct.quantity}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Current Inventory</Label>
                    <p className="text-sm text-gray-600 font-semibold">{selectedProduct.current_inventory_quantity}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">State</Label>
                    <Badge className={stateColors[selectedProduct.state as keyof typeof stateColors] || 'bg-gray-100 text-gray-800'}>
                      {selectedProduct.state}
                    </Badge>
                  </div>
                  <div>
                    <Label className="font-semibold">Container</Label>
                    <p className="text-sm text-gray-600">{selectedProduct.container || '-'}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Type</Label>
                    <p className="text-sm text-gray-600">{selectedProduct.type || '-'}</p>
                  </div>
                </div>

                {selectedProduct.state_history && selectedProduct.state_history.length > 0 && (
                  <div>
                    <Label className="font-semibold">State History</Label>
                    <div className="space-y-2 mt-2">
                      {selectedProduct.state_history.map((history) => (
                        <div key={history.id} className="flex items-start space-x-4 p-2 border rounded-lg">
                          <Badge className={stateColors[history.state as keyof typeof stateColors] || 'bg-gray-100 text-gray-800'}>
                            {history.state}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm text-gray-600">{history.notes || 'No notes'}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(history.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>


      </div>
    </DashboardLayout>
  );
}
