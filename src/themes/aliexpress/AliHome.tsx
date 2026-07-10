import { AliHeader } from "./AliHeader";
import { AliCategoryStrip } from "./AliCategoryStrip";
import { AliFlashDeals } from "./AliFlashDeals";
import { AliProductCard } from "./AliProductCard";
import { AliBottomNav } from "./AliBottomNav";
import ImageSlider from "@/components/ImageSlider";
import Footer from "@/components/Footer";
import { Product } from "@/lib/types";
import { useMemo } from "react";

interface Props {
  products: Product[];
  topDeals: Product[];
  loading?: boolean;
}

/**
 * AliExpress-styled home page. Rendered from Home.tsx when the AliExpress
 * theme is active. Reuses the existing product data — no business logic.
 */
export function AliHome({ products, topDeals, loading }: Props) {
  const forYou = useMemo(() => products.slice(0, 24), [products]);
  const choice = useMemo(() =>
    products.filter((p: any) => p.is_choice ?? p.isChoice).slice(0, 8), [products]);

  return (
    <div className="min-h-screen bg-gray-100 pb-16 md:pb-0">
      <AliHeader />
      <AliCategoryStrip />

      <div className="container mx-auto px-2 md:px-4 py-3">
        <div className="rounded-lg overflow-hidden shadow-sm">
          <ImageSlider />
        </div>
      </div>

      <AliFlashDeals products={topDeals} />

      {choice.length > 0 && (
        <section className="container mx-auto px-2 md:px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-extrabold text-gray-900">
              <span className="text-[hsl(var(--ali-red,0_85%_50%))]">Choice</span> for you
            </h2>
            <span className="text-xs text-gray-500">Free shipping · Easy returns</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
            {choice.map((p) => <AliProductCard key={p.id} product={p} compact />)}
          </div>
        </section>
      )}

      <section className="container mx-auto px-2 md:px-4 py-4">
        <div className="rounded-xl bg-gradient-to-r from-orange-400 to-red-500 text-white p-4 md:p-6 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs md:text-sm opacity-90">Limited time</p>
            <h3 className="text-lg md:text-2xl font-extrabold">Big Save · Up to 70% off</h3>
          </div>
          <span className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-full text-sm font-semibold">
            Shop now →
          </span>
        </div>
      </section>

      <section className="container mx-auto px-2 md:px-4 py-4">
        <h2 className="text-lg md:text-xl font-extrabold text-gray-900 mb-3">For you</h2>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-white rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
            {forYou.map((p) => <AliProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      <div className="hidden md:block"><Footer /></div>
      <AliBottomNav />
    </div>
  );
}
