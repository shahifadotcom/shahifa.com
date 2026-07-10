import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { Product } from "@/lib/types";
import { AliProductCard } from "./AliProductCard";

interface Props {
  products: Product[];
}

/**
 * Flash-deals band with running countdown to end of day.
 * Purely visual for Phase 3; hooks into real flash_sales in Phase 4.
 */
export function AliFlashDeals({ products }: Props) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setRemaining(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const items = products.slice(0, 8);
  if (!items.length) return null;

  return (
    <section className="ali-flash bg-gradient-to-r from-red-600 via-red-500 to-orange-500 py-4 md:py-6">
      <div className="container mx-auto px-3 md:px-4">
        <div className="flex items-center justify-between mb-3 text-white">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 md:h-6 md:w-6" />
            <h2 className="text-lg md:text-2xl font-extrabold tracking-tight">Flash Deals</h2>
            <div className="flex items-center gap-1 ml-2 md:ml-4 font-mono text-xs md:text-sm">
              {remaining.split(":").map((seg, i) => (
                <span key={i} className="bg-black/70 text-white rounded px-1.5 py-0.5">{seg}</span>
              ))}
            </div>
          </div>
          <Link to="/search?deals=flash" className="text-xs md:text-sm underline opacity-90 hover:opacity-100">
            See all →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
          {items.map((p) => (
            <AliProductCard key={p.id} product={p} compact />
          ))}
        </div>
      </div>
    </section>
  );
}
