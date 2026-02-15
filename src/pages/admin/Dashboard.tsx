import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Package, ShoppingCart, DollarSign, AlertTriangle, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminProductForm } from '@/components/AdminProductForm';
import AdminLayout from '@/layouts/AdminLayout';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  images: string[];
  category_id: string;
  brand?: string;
  in_stock: boolean;
  stock_quantity: number;
  sku: string;
  tags: string[];
  rating: number;
  review_count: number;
  created_at: string;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  images: string[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  status: string;
  total: number;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);

  useEffect(() => {
    fetchData();
    checkLowStock();

    // Subscribe to real-time product changes
    const channel = supabase
      .channel('product-stock-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products'
        },
        () => {
          checkLowStock();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, ordersRes] = await Promise.all([
        supabase.from('products_catalog').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*'),
        supabase.from('orders').select('*').order('created_at', { ascending: false })
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (ordersRes.error) throw ordersRes.error;

      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkLowStock = async () => {
    try {
      const { data, error } = await supabase
        .from('products_catalog')
        .select('id, name, stock_quantity, images')
        .lte('stock_quantity', 5)
        .gt('stock_quantity', 0)
        .order('stock_quantity', { ascending: true });

      if (error) throw error;

      const lowStock = data || [];
      setLowStockProducts(lowStock);

      // Check if any product just reached threshold of 5
      const productsAt5 = lowStock.filter(p => p.stock_quantity === 5);
      if (productsAt5.length > 0) {
        // Send WhatsApp notification
        await supabase.functions.invoke('send-low-stock-alert', {
          body: { products: productsAt5 }
        });
      }
    } catch (error: any) {
      console.error('Error checking low stock:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Send notification for status change
      await supabase.functions.invoke('send-order-notification', {
        body: {
          orderId,
          templateName: `order_${newStatus}`
        }
      });

      toast({
        title: "Success",
        description: "Order status updated successfully"
      });
      fetchData();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading admin dashboard...</div>
      </div>
    );
  }

  // Calculate total stock quantity
  const totalStockQuantity = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
  
  // Calculate profit (total from paid orders)
  const totalProfit = orders
    .filter(o => o.status === 'delivered' || o.status === 'completed')
    .reduce((sum, o) => sum + o.total, 0);

  // Calculate total revenue from all orders
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  const stats = [
    { title: 'Total Products', value: products.length, icon: Package },
    { title: 'Total Orders', value: orders.length, icon: ShoppingCart },
    { title: 'Total Stock Quantity', value: totalStockQuantity, icon: Package },
    { title: 'Total Profit', value: `$${totalProfit.toFixed(2)}`, icon: DollarSign },
    { title: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign }
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate('/whatsapp-setup')}
              variant="outline"
            >
              <QrCode className="h-4 w-4 mr-2" />
              WhatsApp Setup
            </Button>
            <Button onClick={() => setShowAddProduct(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <IconComponent className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Inventory Alert / Short List */}
        {lowStockProducts.length > 0 && (
          <Card className="mb-8 border-destructive">
            <CardHeader className="bg-destructive/10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Low Stock Alert - Short List</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border border-destructive/20 rounded-lg bg-destructive/5">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.images[0] || '/placeholder.svg'}
                        alt={product.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">Only {product.stock_quantity} left in stock</p>
                      </div>
                    </div>
                    <Badge variant="destructive">
                      {product.stock_quantity} pcs
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders Management */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No orders found</p>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">Order #{order.order_number}</h3>
                      <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                      <p className="text-sm">${order.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Form Modal */}
        <AdminProductForm
          isOpen={showAddProduct}
          onClose={() => setShowAddProduct(false)}
          categories={categories}
          onSuccess={fetchData}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;