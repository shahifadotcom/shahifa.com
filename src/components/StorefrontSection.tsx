import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Download, Printer, ShoppingCart, ChevronRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { Product } from '@/lib/types';

interface DBProduct {
  id: string;
  name: string;
  price: number;
  images: string[];
  in_stock: boolean;
  slug: string;
  description?: string;
  product_type: string;
}

interface StorefrontSectionProps {
  type: 'digital' | 'print_on_demand';
  title?: string;
  limit?: number;
}

export function StorefrontSection({ type, title, limit = 16 }: StorefrontSectionProps) {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  useEffect(() => {
    loadProducts();
  }, [type]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_catalog')
        .select('id, name, price, images, in_stock, slug, description, product_type')
        .eq('product_type', type)
        .eq('in_stock', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(`Error loading ${type} products:`, error);
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

  if (loading || products.length === 0) {
    return null;
  }

  const sectionTitle = title || (type === 'digital' ? 'Digital Products' : 'Print on Demand');
  const icon = type === 'digital' ? <Download className="h-5 w-5" /> : <Printer className="h-5 w-5" />;
  const badgeVariant = type === 'digital' ? 'default' : 'secondary';

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-3xl font-bold">{sectionTitle}</h2>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate(`/?type=${type}`)}
          >
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          plugins={[
            Autoplay({
              delay: 3000,
            }),
          ]}
          className="w-full"
        >
          <CarouselContent>
            {products.map((product) => (
              <CarouselItem key={product.id} className="basis-1/2 md:basis-1/4">
                <div className="p-1">
                  <Card className="group cursor-pointer hover:shadow-lg transition-shadow h-full">
                    <div onClick={() => navigate(`/products/${product.slug}`)}>
                      <div className="relative aspect-square overflow-hidden rounded-t-lg">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <Badge
                          variant={badgeVariant}
                          className="absolute top-2 right-2"
                        >
                          {type === 'digital' ? (
                            <><Download className="h-3 w-3 mr-1" /> Digital</>
                          ) : (
                            <><Printer className="h-3 w-3 mr-1" /> Print on Demand</>
                          )}
                        </Badge>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </CardHeader>
                    </div>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">${product.price.toFixed(2)}</span>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product);
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Add to Cart
                        </Button>
                      </div>
                      {type === 'digital' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Instant download after purchase
                        </p>
                      )}
                      {type === 'print_on_demand' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Printed & shipped on order
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
}
