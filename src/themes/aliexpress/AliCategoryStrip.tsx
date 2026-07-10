import { Link } from "react-router-dom";
import {
  Flame, Sparkles, Shirt, Cpu, Home as HomeIcon, Sparkle,
  Baby, Car, Dumbbell, Wrench, Grid3x3
} from "lucide-react";

const CATS = [
  { icon: Flame,     label: "SuperDeals", slug: "superdeals", color: "text-orange-500" },
  { icon: Sparkles,  label: "Choice",     slug: "choice",     color: "text-red-500" },
  { icon: Shirt,     label: "Fashion",    slug: "fashion",    color: "text-pink-500" },
  { icon: Cpu,       label: "Electronics",slug: "electronics",color: "text-blue-500" },
  { icon: HomeIcon,  label: "Home",       slug: "home",       color: "text-green-600" },
  { icon: Sparkle,   label: "Beauty",     slug: "beauty",     color: "text-fuchsia-500" },
  { icon: Baby,      label: "Kids",       slug: "kids",       color: "text-yellow-500" },
  { icon: Car,       label: "Auto",       slug: "auto",       color: "text-slate-600" },
  { icon: Dumbbell,  label: "Sports",     slug: "sports",     color: "text-cyan-600" },
  { icon: Wrench,    label: "Tools",      slug: "tools",      color: "text-amber-600" },
  { icon: Grid3x3,   label: "More",       slug: "more",       color: "text-gray-500" },
];

export function AliCategoryStrip() {
  return (
    <div className="ali-cat-strip bg-white border-b">
      <div className="container mx-auto px-2 md:px-4 py-3">
        <div className="flex md:grid md:grid-cols-11 gap-2 md:gap-4 overflow-x-auto snap-x snap-mandatory md:overflow-visible scrollbar-thin">
          {CATS.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.slug}
                to={`/search?category=${c.slug}`}
                className="snap-start shrink-0 flex flex-col items-center text-center gap-1 min-w-16 md:min-w-0 p-1 hover:bg-red-50 rounded-lg transition-colors"
              >
                <div className={`h-11 w-11 md:h-12 md:w-12 rounded-full bg-red-50 flex items-center justify-center ${c.color}`}>
                  <Icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <span className="text-[11px] md:text-xs text-gray-700 truncate max-w-full">{c.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
