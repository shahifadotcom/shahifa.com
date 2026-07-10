import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Camera, ShoppingCart, User, Heart, Menu, Bell } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";

/**
 * AliExpress-style top header — desktop + mobile.
 * Red bar, giant pill search, icon actions.
 */
export function AliHeader() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { getCartItemCount } = useCart();
  const { user } = useAuth();
  const cartCount = getCartItemCount();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="ali-header sticky top-0 z-40 w-full">
      {/* Desktop top-strip */}
      <div className="hidden md:block bg-[hsl(var(--ali-red,0_85%_50%))] text-white text-xs">
        <div className="container mx-auto flex justify-between h-8 items-center px-4">
          <div className="flex gap-4 opacity-90">
            <Link to="/" className="hover:underline">Welcome to Shahifa</Link>
            <span>Free shipping on Choice items</span>
          </div>
          <div className="flex gap-4 opacity-90">
            <Link to="/orders" className="hover:underline">Orders</Link>
            <Link to="/dashboard" className="hover:underline">Account</Link>
            <Link to="/blog" className="hover:underline">Help</Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="bg-[hsl(var(--ali-red,0_85%_50%))] text-white">
        <div className="container mx-auto flex items-center gap-2 md:gap-6 px-3 md:px-4 h-14 md:h-16">
          <Link to="/" className="flex items-center gap-1 shrink-0">
            <span className="text-white font-extrabold text-xl md:text-2xl tracking-tight">
              Shahifa<span className="text-[hsl(var(--ali-orange,30_100%_55%))]">.</span>
            </span>
          </Link>

          <form onSubmit={submit} className="flex-1 min-w-0">
            <div className="flex items-center bg-white rounded-full overflow-hidden shadow-inner border-2 border-[hsl(var(--ali-orange,30_100%_55%))]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search millions of products..."
                className="flex-1 min-w-0 px-3 md:px-4 py-2 md:py-2.5 text-sm text-gray-800 bg-transparent outline-none"
              />
              <button
                type="button"
                aria-label="Image search"
                className="p-2 text-gray-500 hover:text-gray-800"
                onClick={() => navigate("/search?mode=camera")}
              >
                <Camera className="h-4 w-4 md:h-5 md:w-5" />
              </button>
              <button
                type="submit"
                aria-label="Search"
                className="bg-[hsl(var(--ali-orange,30_100%_55%))] hover:brightness-110 text-white px-3 md:px-5 py-2 md:py-2.5"
              >
                <Search className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </div>
          </form>

          <nav className="hidden md:flex items-center gap-5 shrink-0">
            <Link to="/dashboard" className="flex flex-col items-center text-xs hover:opacity-90">
              <User className="h-5 w-5" />
              <span>{user ? "Account" : "Sign in"}</span>
            </Link>
            <Link to="/dashboard?tab=wishlist" className="flex flex-col items-center text-xs hover:opacity-90">
              <Heart className="h-5 w-5" />
              <span>Wishlist</span>
            </Link>
            <Link to="/checkout" className="flex flex-col items-center text-xs relative hover:opacity-90">
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[hsl(var(--ali-orange,30_100%_55%))] text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <span>Cart</span>
            </Link>
          </nav>

          {/* Mobile right icons */}
          <div className="flex md:hidden items-center gap-1 shrink-0">
            <Link to="/checkout" className="relative p-2" aria-label="Cart">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-[hsl(var(--ali-orange,30_100%_55%))] text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
