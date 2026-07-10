import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "@/lib/types";
import { useCart } from "@/contexts/CartContext";
import { useCountryDetection } from "@/hooks/useCountryDetection";
import { AliHeader } from "./AliHeader";
import { AliBottomNav } from "./AliBottomNav";
import { AliProductCard } from "./AliProductCard";
import { ProductReview } from "@/components/ProductReview";
import { SuggestedProducts } from "@/components/SuggestedProducts";
import { VirtualTryOn } from "@/components/VirtualTryOn";
import { Star, ShoppingCart, Heart, Share2, ChevronLeft, Truck, ShieldCheck, RotateCcw, MessageCircle } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useEffect } from "react";

interface Props {
  product: Product;
  virtualTrialEnabled?: boolean;
}

/** AliExpress-styled product detail page. Reuses all existing data. */
export function AliProductDetail({ product, virtualTrialEnabled }: Props) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { currency } = useCountryDetection();
  const [img, setImg] = useState(0);
  const [wl, setWl] = useState(false);
  const { push } = useRecentlyViewed();

  useEffect(() => { push(product.id); }, [product.id]);

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const sold = (product as any).sold_count ?? 0;
  const isChoice = (product as any).is_choice ?? false;

  const handleAdd = () => addToCart(product);
  const handleBuy = () => { addToCart(product); navigate("/checkout"); };

  return (
    <div className="min-h-screen bg-gray-100 pb-40 md:pb-0">
      <AliHeader />

      <button
        onClick={() => navigate(-1)}
        className="md:hidden fixed top-16 left-2 z-30 h-9 w-9 rounded-full bg-white/90 shadow flex items-center justify-center"
        aria-label="Back"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <main className="container mx-auto px-0 md:px-4 py-0 md:py-4">
        <div className="grid md:grid-cols-2 gap-4 bg-white md:rounded-lg overflow-hidden md:shadow-sm">
          {/* Gallery */}
          <div className="p-2 md:p-4">
            <div className="relative aspect-square bg-white rounded-lg overflow-hidden">
              <img
                src={product.images[img] || product.images[0] || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-contain"
              />
              {discount > 0 && (
                <span className="absolute top-2 left-2 bg-[hsl(var(--ali-red,0_85%_50%))] text-white text-xs font-bold px-2 py-1 rounded">
                  -{discount}% OFF
                </span>
              )}
              <button
                onClick={() => setWl(!wl)}
                className={`absolute top-2 right-2 h-9 w-9 rounded-full flex items-center justify-center ${wl ? "bg-red-500 text-white" : "bg-white/90 text-gray-600"}`}
                aria-label="Wishlist"
              >
                <Heart className={`h-4 w-4 ${wl ? "fill-current" : ""}`} />
              </button>
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-thin">
                {product.images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setImg(i)}
                    className={`shrink-0 h-14 w-14 rounded border-2 overflow-hidden ${img === i ? "border-[hsl(var(--ali-red,0_85%_50%))]" : "border-gray-200"}`}
                  >
                    <img src={src} className="w-full h-full object-contain" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 md:p-4 space-y-3">
            <div className="flex items-baseline gap-2">
              {isChoice && (
                <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                  Choice
                </span>
              )}
              <span className="text-[hsl(var(--ali-red,0_85%_50%))] font-extrabold text-2xl md:text-3xl">
                {currency}{product.price.toFixed(2)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-gray-400 line-through">
                  {currency}{product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>

            <h1 className="text-base md:text-lg font-semibold text-gray-900 leading-snug">
              {product.name}
            </h1>

            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < Math.floor(product.rating || 4.7) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                ))}
                <span className="ml-1 font-medium">{(product.rating || 4.7).toFixed(1)}</span>
              </div>
              <span>· {product.reviewCount || 0} reviews</span>
              {sold > 0 && <span>· {sold} sold</span>}
            </div>

            {/* Perks */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
              <div className="flex flex-col items-center text-center text-[10px] text-gray-600">
                <Truck className="h-4 w-4 text-[hsl(var(--ali-red,0_85%_50%))]" />
                <span className="mt-1">Free shipping</span>
              </div>
              <div className="flex flex-col items-center text-center text-[10px] text-gray-600">
                <RotateCcw className="h-4 w-4 text-[hsl(var(--ali-red,0_85%_50%))]" />
                <span className="mt-1">Easy returns</span>
              </div>
              <div className="flex flex-col items-center text-center text-[10px] text-gray-600">
                <ShieldCheck className="h-4 w-4 text-[hsl(var(--ali-red,0_85%_50%))]" />
                <span className="mt-1">Buyer protection</span>
              </div>
            </div>

            {/* Stock */}
            <div className="pt-2 text-xs">
              {product.inStock ? (
                <span className="text-green-600 font-medium">✓ In stock — ships in 24h</span>
              ) : (
                <span className="text-red-500 font-medium">Out of stock</span>
              )}
            </div>

            {virtualTrialEnabled && product.images.length > 0 && (
              <div className="pt-2">
                <VirtualTryOn productId={product.id} productImage={product.images[0]} productName={product.name} />
              </div>
            )}

            {/* Desktop buttons */}
            <div className="hidden md:flex gap-3 pt-4">
              <button
                onClick={handleAdd}
                disabled={!product.inStock}
                className="flex-1 h-12 rounded-full border-2 border-[hsl(var(--ali-red,0_85%_50%))] text-[hsl(var(--ali-red,0_85%_50%))] font-semibold hover:bg-red-50 disabled:opacity-50"
              >
                Add to cart
              </button>
              <button
                onClick={handleBuy}
                disabled={!product.inStock}
                className="flex-1 h-12 rounded-full bg-gradient-to-r from-[hsl(var(--ali-orange,30_100%_55%))] to-[hsl(var(--ali-red,0_85%_50%))] text-white font-semibold shadow disabled:opacity-50"
              >
                Buy now
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        <section className="mt-2 bg-white md:rounded-lg p-4 md:shadow-sm">
          <h2 className="font-bold text-gray-900 mb-2">Description</h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
            {product.description}
          </div>
        </section>

        {/* Reviews */}
        <section className="mt-2 bg-white md:rounded-lg p-4 md:shadow-sm">
          <ProductReview productId={product.id} productSlug={product.slug} />
        </section>

        {/* Suggested */}
        <section className="mt-2 bg-white md:rounded-lg p-4 md:shadow-sm">
          <h2 className="font-bold text-gray-900 mb-3">More to love</h2>
          <SuggestedProducts currentProductIds={[product.id]} categoryId={product.category} limit={8} />
        </section>
      </main>

      {/* Sticky mobile action bar */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 z-30 bg-white border-t shadow-lg">
        <div className="flex items-center h-14">
          <button onClick={() => navigate("/checkout")} className="flex flex-col items-center justify-center flex-1 text-[10px] text-gray-600">
            <ShoppingCart className="h-5 w-5" />
            <span>Cart</span>
          </button>
          <button className="flex flex-col items-center justify-center flex-1 text-[10px] text-gray-600">
            <MessageCircle className="h-5 w-5" />
            <span>Chat</span>
          </button>
          <button
            onClick={handleAdd}
            disabled={!product.inStock}
            className="flex-1 h-full bg-[hsl(var(--ali-orange,30_100%_55%))] text-white font-semibold text-sm disabled:opacity-50"
          >
            Add to cart
          </button>
          <button
            onClick={handleBuy}
            disabled={!product.inStock}
            className="flex-1 h-full bg-[hsl(var(--ali-red,0_85%_50%))] text-white font-semibold text-sm disabled:opacity-50"
          >
            Buy now
          </button>
        </div>
      </div>

      <AliBottomNav />
    </div>
  );
}
