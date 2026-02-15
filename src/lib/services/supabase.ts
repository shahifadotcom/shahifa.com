import { supabase } from '@/integrations/supabase/client';
import { Product, Category, Order, OrderStatus, PaymentStatus } from '@/lib/types';

// Product Services
export const productService = {
  async getAll() {
    const { data, error } = await supabase
      .from('products_catalog')
      .select(`
        *,
        categories:category_id(name, slug),
        subcategories:subcategory_id(name, slug),
        product_variants(*)
      `);
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('products_catalog')
      .select(`
        *,
        categories:category_id(name, slug),
        subcategories:subcategory_id(name, slug),
        product_variants(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getByCategory(categorySlug: string) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();

    if (!category) return [];

    const { data, error } = await supabase
      .from('products_catalog')
      .select(`
        *,
        categories:category_id(name, slug),
        subcategories:subcategory_id(name, slug),
        product_variants(*)
      `)
      .or(`category_id.eq.${category.id},subcategory_id.eq.${category.id}`);
    
    if (error) throw error;
    return data;
  }
};

// Category Services
export const categoryService = {
  async getAll() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null);
    
    if (error) throw error;
    
    const categoriesWithSubs = await Promise.all(
      data.map(async (category) => {
        const { data: subcategories } = await supabase
          .from('categories')
          .select('*')
          .eq('parent_id', category.id);
        
        return {
          ...category,
          subcategories: subcategories || []
        };
      })
    );
    
    return categoriesWithSubs;
  },

  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Order Services
export const orderService = {
  async create(orderData: {
    customerEmail: string;
    items: any[];
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    billingAddress: any;
    shippingAddress: any;
  }) {
    const orderNumber = `ORD-${Date.now()}`;
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_email: orderData.customerEmail,
        subtotal: orderData.subtotal,
        tax: orderData.tax,
        shipping: orderData.shipping,
        total: orderData.total,
        billing_address: orderData.billingAddress,
        shipping_address: orderData.shippingAddress,
        status: 'pending',
        payment_status: 'pending'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Insert order items
    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.product.name,
      product_image: item.product.images[0],
      quantity: item.quantity,
      price: item.price,
      variant_data: item.variant
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return order;
  },

  async getUserOrders(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateStatus(orderId: string, status: OrderStatus) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) throw error;
  },

  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus) {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus })
      .eq('id', orderId);

    if (error) throw error;
  }
};