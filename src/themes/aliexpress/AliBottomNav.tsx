import { NavLink } from "react-router-dom";
import { Home, Sparkles, ShoppingCart, Heart, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/search?category=choice", label: "Choice", icon: Sparkles },
  { to: "/checkout", label: "Cart", icon: ShoppingCart },
  { to: "/dashboard?tab=wishlist", label: "Wishlist", icon: Heart },
  { to: "/dashboard", label: "Account", icon: User },
];

export function AliBottomNav() {
  return (
    <nav className="ali-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)]">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <NavLink
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors ${
                    isActive ? "text-[hsl(var(--ali-red,0_85%_50%))]" : "text-gray-500"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{it.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
