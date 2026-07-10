import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Coupon {
  id: string;
  code: string;
  discount_type: "percent" | "amount";
  discount_value: number;
  min_order: number | null;
  expires_at: string | null;
  active: boolean;
}

export function useCoupons() {
  const [applied, setApplied] = useState<Coupon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const apply = useCallback(async (code: string, subtotal: number) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("coupons")
        .select("*")
        .ilike("code", code.trim())
        .eq("active", true)
        .maybeSingle();
      if (err) throw err;
      if (!data) { setError("Invalid coupon code"); setApplied(null); return null; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError("Coupon expired"); setApplied(null); return null;
      }
      if (data.min_order && subtotal < data.min_order) {
        setError(`Minimum order ${data.min_order} required`); setApplied(null); return null;
      }
      setApplied(data as Coupon);
      return data as Coupon;
    } catch (e: any) {
      setError(e.message || "Failed to apply coupon");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const discountFor = useCallback((subtotal: number) => {
    if (!applied) return 0;
    return applied.discount_type === "percent"
      ? Math.round(subtotal * (applied.discount_value / 100) * 100) / 100
      : Math.min(applied.discount_value, subtotal);
  }, [applied]);

  return { applied, apply, discountFor, error, loading, clear: () => setApplied(null) };
}

/* ============ COINS ============ */
export function useCoins() {
  const { user } = useAuth();
  const [coins, setCoins] = useState(0);
  const [claimedToday, setClaimedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("user_coins")
      .select("balance, last_checkin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setCoins(data.balance || 0);
      const today = new Date().toISOString().slice(0, 10);
      setClaimedToday(data.last_checkin === today);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const checkIn = useCallback(async () => {
    if (!user || claimedToday) return null;
    const today = new Date().toISOString().slice(0, 10);
    const reward = 5;
    const { data } = await supabase
      .from("user_coins")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    const newBal = (data?.balance || 0) + reward;
    await supabase.from("user_coins").upsert({
      user_id: user.id,
      balance: newBal,
      last_checkin: today,
    });
    setCoins(newBal);
    setClaimedToday(true);
    return reward;
  }, [user, claimedToday]);

  return { coins, claimedToday, checkIn, loading, refresh };
}

/* ============ FLASH SALES ============ */
export interface FlashSale {
  id: string;
  product_id: string;
  flash_price: number;
  stock: number;
  sold: number;
  starts_at: string;
  ends_at: string;
}

export function useFlashSales() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("flash_sales")
        .select("*")
        .lte("starts_at", now)
        .gte("ends_at", now);
      setSales((data as FlashSale[]) || []);
      setLoading(false);
    };
    load();
  }, []);
  return { sales, loading };
}
