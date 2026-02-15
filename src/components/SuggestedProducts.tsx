import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/lib/types';
import { useCountryDetection } from '@/hooks/useCountryDetection';

interface DBProduct {
  id: string;
  name: string;
  price: number;
  images: string[];
  in_stock: boolean;
  slug: string;
  product_type?: string;
  description?: string;
}

interface SuggestedProductsProps {
  currentProductIds?: string[];
  categoryId?: string;
  limit?: number;
}

export function SuggestedProducts({ currentProductIds = [], categoryId, limit = 8 }: SuggestedProductsProps) {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { countryId, currency } = useCountryDetection();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to detect when component is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { rootMargin: '200px' } // Load 200px before coming into view
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      loadSuggestedProducts();
    }
  }, [currentProductIds, categoryId, countryId, isVisible]);

  // Auto-scroll functionality (enabled on all devices, respects reduced motion)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || products.length === 0 || !isVisible) return;

    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let rafId = 0;
    let isScrolling = true;
    let direction: 'right' | 'left' = 'right';

    const step = () => {
      if (!isScrolling) {
        rafId = requestAnimationFrame(step);
        return;
      }

      const maxScroll = container.scrollWidth - container.clientWidth;
      const currentScroll = container.scrollLeft;

      if (direction === 'right') {
        if (currentScroll >= maxScroll - 1) {
          direction = 'left';
        } else {
          container.scrollLeft = Math.min(maxScroll, currentScroll + 0.6);
        }
      } else {
        if (currentScroll <= 1) {
          direction = 'right';
        } else {
          container.scrollLeft = Math.max(0, currentScroll - 0.6);
        }
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    // Pause on hover/touch
    const pauseScroll = () => { isScrolling = false; };
    const resumeScroll = () => { isScrolling = true; };

    container.addEventListener('mouseenter', pauseScroll);
    container.addEventListener('mouseleave', resumeScroll);
    container.addEventListener('touchstart', pauseScroll, { passive: true } as any);
    container.addEventListener('touchend', resumeScroll, { passive: true } as any);

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('mouseenter', pauseScroll);
      container.removeEventListener('mouseleave', resumeScroll);
      container.removeEventListener('touchstart', pauseScroll as any);
      container.removeEventListener('touchend', resumeScroll as any);
    };
  }, [products, isVisible]);

  const loadSuggestedProducts = async () => {
    // Don't load anything until country is selected
    if (!countryId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('products_catalog')
        .select('id, name, price, images, in_stock, slug, product_type, description, country_id')
        .eq('in_stock', true)
        .eq('country_id', countryId) // Force country filtering
        .limit(limit);

      // Exclude current products in cart
      if (currentProductIds.length > 0) {
        query = query.not('id', 'in', `(${currentProductIds.join(',')})`);
      }

      // Filter by category if provided
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      // Order by rating or created date
      query = query.order('rating', { ascending: false, nullsFirst: false });

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading suggested products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product: DBProduct) => {
    try {
      const fullProduct: Product = {
        id: product.id,
        name: product.name,
        price: product.price,
        images: product.images,
        description: product.description || '',
        category: '',
        inStock: product.in_stock,
        stockQuantity: 1,
        sku: product.slug || product.id,
        slug: product.slug,
        tags: [],
        rating: 0,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      addToCart(fullProduct, 1);

      toast.success(`${product.name} added to cart`);
    } catch (error) {
      toast.error('Failed to add product to cart');
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollAmount = 300;
    const newPosition = direction === 'left' 
      ? Math.max(0, scrollPosition - scrollAmount)
      : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);

    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  return (
    <div ref={containerRef} className="w-full max-w-[100vw] overflow-hidden box-border">
      {!isVisible ? null : loading || products.length === 0 ? null : (
        <Card className="w-full max-w-[100vw] overflow-hidden border-0 shadow-none md:border md:shadow-sm box-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>You May Also Like</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => scroll('left')}
              disabled={scrollPosition === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-4 w-full max-w-[100vw] overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth overscroll-x-contain touch-pan-x pb-2 box-border"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-none w-36 md:w-48 group cursor-pointer flex-shrink-0"
            >
              <div
                onClick={() => navigate(`/products/${product.slug}`)}
                className="relative aspect-square mb-2 overflow-hidden rounded-lg bg-muted"
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-2"
                />
                {product.product_type && product.product_type !== 'physical' && (
                  <Badge
                    variant="secondary"
                    className="absolute top-2 right-2 text-xs"
                  >
                    {product.product_type === 'digital' ? 'Digital' : 'Print on Demand'}
                  </Badge>
                )}
              </div>
              <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
              <p className="text-sm font-semibold mb-2">{currency} {product.price.toFixed(2)}</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart(product);
                }}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Add to Cart
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
      )}
    </div>
  );
}
