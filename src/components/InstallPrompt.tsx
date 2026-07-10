import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * Small floating "Install App" prompt. Uses the beforeinstallprompt event
 * on Chromium; on iOS Safari it shows a short "Add to Home Screen" hint.
 */
export function InstallPrompt() {
  const [evt, setEvt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(
    typeof window !== "undefined" && localStorage.getItem("install_dismissed") === "1"
  );
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setEvt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    const isStandalone = (window.navigator as any).standalone;
    if (isIOS && !isStandalone && !dismissed) setIosHint(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  const install = async () => {
    if (!evt) return;
    evt.prompt();
    await evt.userChoice;
    setEvt(null);
    localStorage.setItem("install_dismissed", "1");
    setDismissed(true);
  };
  const close = () => {
    localStorage.setItem("install_dismissed", "1");
    setDismissed(true); setEvt(null); setIosHint(false);
  };

  if (dismissed) return null;
  if (!evt && !iosHint) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-2 right-2 md:left-auto md:right-4 md:w-80 z-40 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 flex items-center gap-3 animate-in slide-in-from-bottom">
      <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
        <Download className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Install Shahifa app</p>
        <p className="text-xs text-gray-500 truncate">
          {iosHint ? "Tap Share → Add to Home Screen" : "Faster access, works offline-ready"}
        </p>
      </div>
      {evt && (
        <button onClick={install} className="text-xs font-semibold bg-red-500 text-white px-3 py-1.5 rounded-full">
          Install
        </button>
      )}
      <button onClick={close} className="text-gray-400 hover:text-gray-600" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
