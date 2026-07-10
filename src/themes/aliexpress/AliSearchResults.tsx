import { useMemo, useState } from "react";
import { Product } from "@/lib/types";
import { AliHeader } from "./AliHeader";
import { AliBottomNav } from "./AliBottomNav";
import { AliProductCard } from "./AliProductCard";
import { AliCategoryStrip } from "./AliCategoryStrip";
import { SlidersHorizontal, ArrowUpDown, Grid2x2, LayoutGrid } from "lucide-react";

interface Props {
  products: Product[];
  loading: boolean;
  query: string;
}

type Sort = "best" | "orders" | "price_asc" | "price_desc" | "new";

const SORTS: { id: Sort; label: string }[] = [
  { id: "best", label: "Best match" },
  { id: "orders", label: "Orders" },
  { id: "price_asc", label: "Price ↑" },
  { id: "price_desc", label: "Price ↓" },
  { id: "new", label: "Newest" },
];

export function AliSearchResults({ products, loading, query }: Props) {
  const [sort, setSort] = useState<Sort>("best");
  const [cols, setCols] = useState<2 | 1>(2);
  const [showFilters, setShowFilters] = useState(false);
  const [freeShip, setFreeShip] = useState(false);
  const [choiceOnly, setChoiceOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);

  const sorted = useMemo(() => {
    let out = [...products];
    if (choiceOnly) out = out.filter((p: any) => p.is_choice ?? p.isChoice);
    if (minRating > 0) out = out.filter((p) => (p.rating || 0) >= minRating);
    switch (sort) {
      case "price_asc": out.sort((a, b) => a.price - b.price); break;
      case "price_desc": out.sort((a, b) => b.price - a.price); break;
      case "orders": out.sort((a: any, b: any) => (b.sold_count || 0) - (a.sold_count || 0)); break;
      case "new": out.reverse(); break;
    }
    return out;
  }, [products, sort, choiceOnly, minRating]);

  return (
    <div className="min-h-screen bg-gray-100 pb-16 md:pb-0">
      <AliHeader />
      <AliCategoryStrip />

      {/* Sort/filter bar */}
      <div className="sticky top-14 md:top-16 z-20 bg-white border-b shadow-sm">
        <div className="container mx-auto px-2 md:px-4">
          <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-thin">
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  sort === s.id
                    ? "bg-[hsl(var(--ali-red,0_85%_50%))] text-white border-transparent"
                    : "bg-white border-gray-200 text-gray-700"
                }`}
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white flex items-center gap-1"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Filters
            </button>
            <div className="ml-auto flex items-center gap-1 md:hidden">
              <button
                onClick={() => setCols(2)}
                className={`h-7 w-7 rounded ${cols === 2 ? "bg-red-50 text-[hsl(var(--ali-red,0_85%_50%))]" : "text-gray-500"}`}
                aria-label="Grid"
              >
                <Grid2x2 className="h-4 w-4 mx-auto" />
              </button>
              <button
                onClick={() => setCols(1)}
                className={`h-7 w-7 rounded ${cols === 1 ? "bg-red-50 text-[hsl(var(--ali-red,0_85%_50%))]" : "text-gray-500"}`}
                aria-label="List"
              >
                <LayoutGrid className="h-4 w-4 mx-auto" />
              </button>
            </div>
          </div>
          {showFilters && (
            <div className="pb-3 flex flex-wrap gap-2">
              <label className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded-full cursor-pointer">
                <input type="checkbox" checked={freeShip} onChange={(e) => setFreeShip(e.target.checked)} />
                Free shipping
              </label>
              <label className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded-full cursor-pointer">
                <input type="checkbox" checked={choiceOnly} onChange={(e) => setChoiceOnly(e.target.checked)} />
                Choice only
              </label>
              {[4, 4.5].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(minRating === r ? 0 : r)}
                  className={`text-xs px-2 py-1 rounded-full ${minRating === r ? "bg-yellow-100 text-yellow-800" : "bg-gray-50 text-gray-600"}`}
                >
                  ★ {r}+
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="container mx-auto px-2 md:px-4 py-3">
        <h1 className="text-sm text-gray-600 mb-3">
          {query ? <>Results for <span className="font-semibold text-gray-900">"{query}"</span></> : "All products"}
          {" · "}
          <span>{loading ? "…" : sorted.length}</span>
        </h1>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-white rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No products found.</div>
        ) : (
          <div className={`grid gap-2 md:gap-3 ${
            cols === 1
              ? "grid-cols-1 md:grid-cols-4 lg:grid-cols-6"
              : "grid-cols-2 md:grid-cols-4 lg:grid-cols-6"
          }`}>
            {sorted.map((p) => <AliProductCard key={p.id} product={p} />)}
          </div>
        )}
      </main>

      <AliBottomNav />
    </div>
  );
}
