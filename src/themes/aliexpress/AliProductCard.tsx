import { useState } from "react";
import { Heart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Product } from "@/lib/types";
import { useCountryDetection } from "@/hooks/useCountryDetection";
import { useCart } from "@/contexts/CartContext";

interface Props {
  product: Product;
  compact?: boolean;
}

/**
 * AliExpress-style card:
 *  - square white image
 *  - red price with strikethrough MSRP
 *  - orange "Choice" chip when applicable
 *  - star + sold count
 *  - red heart wishlist
 */
export function AliProductCard({ product, compact = false }: Props) {
  const [wl, setWl] = useState(false);
  const { currency, countryCode } = useCountryDetection();
  const { addToCart } = useCart();
  const slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const link = countryCode ? `/${countryCode.toLowerCase()}/products/${slug}` : `/products/${slug}`;
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const sold = (product as any).sold_count ?? (product as any).soldCount ?? null;
  const isChoice = (product as any).is_choice ?? (product as any).isChoice ?? false;
  const rating = (product as any).rating ?? 4.7;

  return (
    <Link
      to={link}
      className="ali-card group relative flex flex-col bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-square bg-white">
        <img
          src={product.images?.[0] || "/placeholder.svg"}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain p-1"
        />
        {discount > 0 && (
          <span className="absolute top-1 left-1 bg-[hsl(var(--ali-red,0_85%_50%))] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            -{discount}%
          </span>
        )}
        <button
          onClick={(e) => { e.preventDefault(); setWl(!wl); }}
          aria-label="Wishlist"
          className={`absolute top-1 right-1 h-7 w-7 rounded-full flex items-center justify-center backdrop-blur ${wl ? "bg-red-500 text-white" : "bg-white/90 text-gray-600 hover:text-red-500"}`}
        >
          <Heart className={`h-3.5 w-3.5 ${wl ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className={`flex flex-col gap-0.5 ${compact ? "p-1.5" : "p-2"}`}>
        <div className="flex items-baseline gap-1">
          <span className="text-[hsl(var(--ali-red,0_85%_50%))] font-extrabold text-sm md:text-base">
            {currency}{product.price.toFixed(2)}
          </span>
          {product.originalPrice ? (
            <span className="text-[10px] md:text-xs text-gray-400 line-through">
              {currency}{product.originalPrice.toFixed(2)}
            </span>
          ) : null}
        </div>
        {!compact && (
          <p className="text-xs text-gray-800 line-clamp-2 leading-snug">
            {product.name}
          </p>
        )}
        <div className="flex items-center gap-1 text-[10px] md:text-xs text-gray-500">
          {isChoice && (
            <span className="bg-orange-500 text-white font-bold px-1 rounded text-[9px] md:text-[10px]">
              Choice
            </span>
          )}
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span>{Number(rating).toFixed(1)}</span>
          {sold !== null && <span>· {sold} sold</span>}
        </div>
      </div>
    </Link>
  );
}
