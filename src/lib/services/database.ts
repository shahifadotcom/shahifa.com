import { supabase } from "@/integrations/supabase/client";
import { Product, Category, CartItem, Order, Customer, Address } from "@/lib/types";

// Products API
export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products_catalog')
    .select(`
      *,
      category:categories!products_category_id_fkey(id, name, slug),
      subcategory:categories!products_subcategory_id_fkey(id, name, slug),
      variants:product_variants(*)
    `);

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return data?.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
    originalPrice: product.original_price ? (typeof product.original_price === 'string' ? parseFloat(product.original_price) : product.original_price) : undefined,
    images: product.images || [],
    category: product.category?.slug || '',
    subcategory: product.subcategory?.slug,
    brand: product.brand,
    inStock: product.in_stock,
    stockQuantity: product.stock_quantity,
    sku: product.sku,
    tags: product.tags || [],
    rating: typeof product.rating === 'string' ? parseFloat(product.rating) : product.rating,
    reviewCount: product.review_count,
    createdAt: new Date(product.created_at),
    updatedAt: new Date(product.updated_at),
    variants: product.variants?.map(v => ({
      id: v.id,
      name: v.name,
      value: v.value,
      price: v.price ? (typeof v.price === 'string' ? parseFloat(v.price) : v.price) : undefined,
      stockQuantity: v.stock_quantity,
      sku: v.sku
    }))
  })) || [];
};

export const fetchProductsByCategory = async (categorySlug: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products_catalog')
    .select(`
      *,
      category:categories!products_category_id_fkey(id, name, slug),
      subcategory:categories!products_subcategory_id_fkey(id, name, slug),
      variants:product_variants(*)
    `)
    .or(`category.slug.eq.${categorySlug},subcategory.slug.eq.${categorySlug}`);

  if (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }

  return data?.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
    originalPrice: product.original_price ? (typeof product.original_price === 'string' ? parseFloat(product.original_price) : product.original_price) : undefined,
    images: product.images || [],
    category: product.category?.slug || '',
    subcategory: product.subcategory?.slug,
    brand: product.brand,
    inStock: product.in_stock,
    stockQuantity: product.stock_quantity,
    sku: product.sku,
    tags: product.tags || [],
    rating: typeof product.rating === 'string' ? parseFloat(product.rating) : product.rating,
    reviewCount: product.review_count,
    createdAt: new Date(product.created_at),
    updatedAt: new Date(product.updated_at),
    variants: product.variants?.map(v => ({
      id: v.id,
      name: v.name,
      value: v.value,
      price: v.price ? (typeof v.price === 'string' ? parseFloat(v.price) : v.price) : undefined,
      stockQuantity: v.stock_quantity,
      sku: v.sku
    }))
  })) || [];
};

// Categories API
export const fetchCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select(`
      *,
      subcategories:categories!parent_id(*)
    `)
    .is('parent_id', null);

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data?.map(category => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    productCount: category.product_count,
    subcategories: category.subcategories && Array.isArray(category.subcategories) ? category.subcategories.map(sub => ({
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
      productCount: sub.product_count
    })) : undefined
  })) || [];
};

// Orders API
export const createOrder = async (orderData: {
  customerEmail: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  billingAddress: Address;
  shippingAddress: Address;
}): Promise<string | null> => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('User not authenticated');

  const orderNumber = `ORD-${Date.now()}`;

  const { data, error } = await supabase
    .from('orders')
    .insert([{
      order_number: orderNumber,
      customer_id: user.id,
      customer_email: orderData.customerEmail,
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      shipping: orderData.shipping,
      total: orderData.total,
      billing_address: orderData.billingAddress as any,
      shipping_address: orderData.shippingAddress as any
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating order:', error);
    return null;
  }

  // Create order items
  const orderItems = orderData.items.map(item => ({
    order_id: data.id,
    product_id: item.productId,
    product_name: item.product.name,
    product_image: item.product.images[0],
    quantity: item.quantity,
    price: item.price,
    variant_data: item.variant as any
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    console.error('Error creating order items:', itemsError);
    return null;
  }

  return orderNumber;
};

export const fetchUserOrders = async (): Promise<Order[]> => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }

  return data?.map(order => ({
    id: order.id,
    orderNumber: order.order_number,
    customerId: order.customer_id,
    customerEmail: order.customer_email,
    status: order.status as any,
    paymentStatus: order.payment_status as any,
    subtotal: typeof order.subtotal === 'string' ? parseFloat(order.subtotal) : order.subtotal,
    tax: typeof order.tax === 'string' ? parseFloat(order.tax) : order.tax,
    shipping: typeof order.shipping === 'string' ? parseFloat(order.shipping) : order.shipping,
    total: typeof order.total === 'string' ? parseFloat(order.total) : order.total,
    billingAddress: order.billing_address as any,
    shippingAddress: order.shipping_address as any,
    createdAt: new Date(order.created_at),
    updatedAt: new Date(order.updated_at),
    items: order.items?.map(item => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      productImage: item.product_image,
      quantity: item.quantity,
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
      variant: item.variant_data as any
    })) || []
  })) || [];
};

// Profile API
export const fetchUserProfile = async () => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
};

export const updateUserProfile = async (profileData: {
  first_name?: string;
  last_name?: string;
  phone?: string;
}) => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};