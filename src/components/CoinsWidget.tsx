import { Coins, Check } from "lucide-react";
import { useCoins } from "@/hooks/useCoupons";
import { useToast } from "@/hooks/use-toast";

/** Daily check-in coins widget — AliExpress-style. */
export function CoinsWidget() {
  const { coins, claimedToday, checkIn, loading } = useCoins();
  const { toast } = useToast();

  if (loading) return null;

  const handleClaim = async () => {
    const reward = await checkIn();
    if (reward) {
      toast({ title: `+${reward} coins!`, description: "Come back tomorrow for more." });
    }
  };

  return (
    <div className="rounded-xl bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500 text-white p-3 shadow flex items-center gap-3">
      <Coins className="h-8 w-8 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs opacity-90">Your coins</p>
        <p className="text-lg font-extrabold">{coins}</p>
      </div>
      <button
        onClick={handleClaim}
        disabled={claimedToday}
        className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full ${
          claimedToday ? "bg-white/30 cursor-default" : "bg-white text-red-600 hover:brightness-110"
        }`}
      >
        {claimedToday ? <><Check className="h-3 w-3 inline mr-1" />Claimed</> : "Check in +5"}
      </button>
    </div>
  );
}
