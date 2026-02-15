import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/lib/types';
import { useRoles } from './useRoles';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAdmin } = useRoles();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Admin users get full product data including cost_price from products table
      // Non-admin users get secure catalog view excluding sensitive pricing data
      if (isAdmin) {
        const { data, error } = await supabase
          .from('products_catalog')
          .select(`
            *,
            categories:category_id(name, slug),
            subcategories:subcategory_id(name, slug),
            product_variants(*)
          `);
          
        if (error) throw error;
        
        const mappedProducts = data.map((product): Product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: Number(product.price),
          originalPrice: product.original_price ? Number(product.original_price) : undefined,
          images: product.images || [],
          category: product.categories?.slug || '',
          subcategory: product.subcategories?.slug,
          brand: product.brand,
          inStock: product.in_stock,
          stockQuantity: product.stock_quantity,
          sku: product.sku,
          tags: product.tags || [],
          rating: Number(product.rating),
          reviewCount: product.review_count,
          createdAt: new Date(product.created_at),
          updatedAt: new Date(product.updated_at),
          variants: product.product_variants?.map(variant => ({
            id: variant.id,
            name: variant.name,
            value: variant.value,
            price: variant.price ? Number(variant.price) : undefined,
            stockQuantity: variant.stock_quantity,
            sku: variant.sku
          }))
        }));
        
        setProducts(mappedProducts);
      } else {
        // Use secure catalog view for non-admin users (excludes cost_price, original_price)
        const { data, error } = await supabase
          .from('products_catalog')
          .select(`
            *,
            categories:category_id(name, slug),
            subcategories:subcategory_id(name, slug)
          `);
          
        if (error) throw error;
        
        const mappedProducts = data.map((product): Product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: Number(product.price),
          originalPrice: undefined, // Excluded from catalog view for security
          images: product.images || [],
          category: product.categories?.slug || '',
          subcategory: product.subcategories?.slug,
          brand: product.brand,
          inStock: product.in_stock,
          stockQuantity: product.stock_quantity,
          sku: product.sku,
          tags: product.tags || [],
          rating: Number(product.rating),
          reviewCount: product.review_count,
          createdAt: new Date(product.created_at),
          updatedAt: new Date(product.updated_at),
          variants: [] // Variants excluded from public catalog for security
        }));
        
        setProducts(mappedProducts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [isAdmin]);

  return { products, loading, error, refetch: fetchProducts };
}

export function useProduct(id: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAdmin } = useRoles();

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        
        // Admin users get full product data including cost_price from products table
        // Non-admin users get secure catalog view excluding sensitive pricing data
        if (isAdmin) {
          const { data, error } = await supabase
            .from('products_catalog')
            .select(`
              *,
              categories:category_id(name, slug),
              subcategories:subcategory_id(name, slug),
              product_variants(*)
            `)
            .eq('id', id)
            .maybeSingle();
          
          if (error) throw error;
          if (!data) {
            setError('Product not found');
            return;
          }
          
          const mappedProduct: Product = {
            id: data.id,
            name: data.name,
            description: data.description,
            price: Number(data.price),
            originalPrice: data.original_price ? Number(data.original_price) : undefined,
            images: data.images || [],
            category: data.categories?.slug || '',
            subcategory: data.subcategories?.slug,
            brand: data.brand,
            inStock: data.in_stock,
            stockQuantity: data.stock_quantity,
            sku: data.sku,
            tags: data.tags || [],
            rating: Number(data.rating),
            reviewCount: data.review_count,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            variants: data.product_variants?.map(variant => ({
              id: variant.id,
              name: variant.name,
              value: variant.value,
              price: variant.price ? Number(variant.price) : undefined,
              stockQuantity: variant.stock_quantity,
              sku: variant.sku
            }))
          };
          
          setProduct(mappedProduct);
        } else {
          // Use secure catalog view for non-admin users (excludes cost_price, original_price)
          const { data, error } = await supabase
            .from('products_catalog')
            .select(`
              *,
              categories:category_id(name, slug),
              subcategories:subcategory_id(name, slug)
            `)
            .eq('id', id)
            .maybeSingle();
          
          if (error) throw error;
          if (!data) {
            setError('Product not found');
            return;
          }
          
          const mappedProduct: Product = {
            id: data.id,
            name: data.name,
            description: data.description,
            price: Number(data.price),
            originalPrice: undefined, // Excluded from catalog view for security
            images: data.images || [],
            category: data.categories?.slug || '',
            subcategory: data.subcategories?.slug,
            brand: data.brand,
            inStock: data.in_stock,
            stockQuantity: data.stock_quantity,
            sku: data.sku,
            tags: data.tags || [],
            rating: Number(data.rating),
            reviewCount: data.review_count,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            variants: [] // Variants excluded from public catalog for security
          };
          
          setProduct(mappedProduct);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, isAdmin]);

  return { product, loading, error };
}