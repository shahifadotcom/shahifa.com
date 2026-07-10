import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Product } from '@/lib/types';
import { CountryService } from '@/services/countryService';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ProductCard from '@/components/ProductCard';
import ProductDetailModal from '@/components/ProductDetailModal';
import { Loader2, SearchX } from 'lucide-react';
import { usePageHead } from '@/hooks/usePageHead';
import { useIsAliTheme } from '@/themes/aliexpress/useIsAliTheme';
import { AliSearchResults } from '@/themes/aliexpress/AliSearchResults';

const SearchResults = () => {
  const isAli = useIsAliTheme();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  usePageHead({
    title: searchQuery ? `Search results for "${searchQuery}" | shahifa Online Shop` : 'Search products | shahifa Online Shop',
    description: searchQuery
      ? `Browse products matching "${searchQuery}" at shahifa Online Shop with free delivery and secure checkout.`
      : 'Search the shahifa Online Shop catalog for gadgets, fashion, and home essentials with free delivery.',
    path: searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}` : '/search',
    noindex: true,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { countryId } = useCountryDetection();

  useEffect(() => {
    const loadProducts = async () => {
      if (!countryId) return;
      
      setLoading(true);
      try {
        const allProducts = await CountryService.getProductsByCountry(countryId);
        
        if (searchQuery.trim()) {
          const filtered = allProducts.filter(product => 
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          );
          setProducts(filtered);
        } else {
          setProducts(allProducts);
        }
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [searchQuery, countryId]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  if (isAli) {
    return <AliSearchResults products={products} loading={loading} query={searchQuery} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {searchQuery ? `Search Results for "${searchQuery}"` : 'All Products'}
          </h1>
          <p className="text-muted-foreground">
            {loading ? 'Searching...' : `${products.length} product${products.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <SearchX className="h-24 w-24 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Items Found</h2>
            <p className="text-muted-foreground max-w-md">
              {searchQuery 
                ? `We couldn't find any products matching "${searchQuery}". Try searching with different keywords.`
                : 'No products available at the moment.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop/Tablet Grid */}
            <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={() => handleProductClick(product)}
                />
              ))}
            </div>

            {/* Mobile Grid */}
            <div className="grid grid-cols-2 gap-3 md:hidden">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={() => handleProductClick(product)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />
      <MobileBottomNav />

      <ProductDetailModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
      />
    </div>
  );
};

export default SearchResults;
