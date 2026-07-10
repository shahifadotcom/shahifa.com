import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import ImageSlider from "@/components/ImageSlider";
import ProductGrid from "@/components/ProductGrid";
import ProductCard from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { StorefrontSection } from "@/components/StorefrontSection";
import { useProducts } from "@/hooks/useProducts";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Product } from "@/lib/types";
import { useCountryDetection } from "@/hooks/useCountryDetection";
import { CountrySelectionModal } from "@/components/CountrySelectionModal";
import { CountryService } from "@/services/countryService";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useIsAliTheme } from "@/themes/aliexpress/useIsAliTheme";
import { AliHome } from "@/themes/aliexpress/AliHome";

const Home = () => {
  const isAli = useIsAliTheme();
  const { 
    selectedCountry, 
    allCountries, 
    loading: countryLoading, 
    needsSelection,
    selectCountry,
    currency,
    countryId 
  } = useCountryDetection();
  
  const { products, loading: productsLoading } = useProducts(undefined, countryId);
  const { settings } = useStoreSettings();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [topDeals, setTopDeals] = useState<Product[]>([]);
  const [loadingTopDeals, setLoadingTopDeals] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const categorySlug = searchParams.get('category') || '';

  // Filter products based on search query and category
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Filter by category slug
    if (categorySlug.trim()) {
      filtered = filtered.filter(product => {
        // Check if product's category or subcategory slug matches
        return product.category === categorySlug || 
               product.subcategory === categorySlug;
      });
    }
    
    return filtered;
  }, [products, searchQuery, categorySlug]);

  // Load most ordered products for Top Deals
  useEffect(() => {
    const loadTopDeals = async () => {
      setLoadingTopDeals(true);
      const mostOrdered = await CountryService.getMostOrderedProducts(16, countryId);
      setTopDeals(mostOrdered);
      setLoadingTopDeals(false);
    };

    loadTopDeals();
  }, [countryId]);

  // Update document title when settings load
  useEffect(() => {
    if (settings?.site_title) {
      document.title = settings.site_title;
    }
  }, [settings?.site_title]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  // Get latest products (first 16) from filtered results
  const latestProducts = filteredProducts.slice(0, 16);
  
  // Get featured products for 2-column sections from filtered results
  const featuredProducts1 = filteredProducts.slice(0, 2);

  // Show country selection modal if needed
  if (needsSelection && !countryLoading) {
    return (
      <CountrySelectionModal
        countries={allCountries}
        onSelect={selectCountry}
        open={needsSelection}
      />
    );
  }

  if (countryLoading || productsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (isAli) {
    return <AliHome products={products} topDeals={topDeals} loading={productsLoading} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pb-20 md:pb-0">
        {/* Search/Category Results Header */}
        {(searchQuery || categorySlug) && (
          <div className="container mx-auto px-4 py-4">
            <h2 className="text-xl font-semibold text-foreground">
              {searchQuery && `Search results for "${searchQuery}"`}
              {searchQuery && categorySlug && ' in '}
              {categorySlug && `Category: ${categorySlug.replace(/-/g, ' ')}`}
              {' '}({filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'})
            </h2>
          </div>
        )}

        {/* Desktop and Tablet Layout */}
        <div className="hidden md:block">
          <div className="container mx-auto px-4 py-8">
            {/* Image Slider */}
            <div className="mb-8">
              <ImageSlider />
            </div>

            {/* Top Selling Products - Auto Scrolling Carousel */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Top Selling Products</h2>
              {loadingTopDeals ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
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
                    {topDeals.map((product) => (
                      <CarouselItem key={product.id} className="basis-1/2 md:basis-1/4">
                        <div className="p-1">
                          <ProductCard
                            product={product}
                            onQuickView={handleProductClick}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              )}
            </div>

            {/* Latest Products - Auto Scrolling Carousel */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Latest Products</h2>
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
                  {latestProducts.map((product) => (
                    <CarouselItem key={product.id} className="basis-1/2 md:basis-1/4">
                      <div className="p-1">
                        <ProductCard
                          product={product}
                          onQuickView={handleProductClick}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          </div>
        </div>

        {/* Mobile Layout - Optimized */}
        <div className="md:hidden">
          <div className="px-4 py-4 space-y-6">
            {/* Mobile Image Slider */}
            <div>
              <ImageSlider />
            </div>

            {/* Mobile Top Selling Products */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Top Selling Products</h2>
              {loadingTopDeals ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
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
                    {topDeals.map((product) => (
                      <CarouselItem key={product.id} className="basis-1/2">
                        <div className="p-1">
                          <ProductCard
                            product={product}
                            onQuickView={handleProductClick}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              )}
            </div>

            {/* Mobile Latest Products - Carousel */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">
                {searchQuery ? 'Search Results' : 'Latest Products'}
              </h2>
              {latestProducts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No products found matching your search.</p>
                </div>
              ) : (
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
                    {latestProducts.map((product) => (
                      <CarouselItem key={product.id} className="basis-1/2">
                        <div className="p-1">
                          <ProductCard
                            product={product}
                            onQuickView={handleProductClick}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              )}
            </div>
          </div>
        </div>

        {/* Digital Products Section */}
        <StorefrontSection type="digital" title="Digital Products" limit={16} />

        {/* Print on Demand Section */}
        <StorefrontSection type="print_on_demand" title="Print on Demand" limit={16} />
      </main>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProduct(null);
        }}
      />

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Home;