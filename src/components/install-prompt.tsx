import { useEffect, useState } from "react";
import { Check, Download, PlusSquare, Share, WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand";
import {
  isIos,
  isSnoozed,
  isStandalone,
  snooze,
  startInstallListener,
  triggerInstall,
  useInstallState,
} from "@/lib/pwa-install";
import { registerAppServiceWorker } from "@/lib/pwa-register";

const BENEFITS = [
  "Quick access from your home screen",
  "Opens like an app",
  "Easy access to your business dashboard",
  "No need to search for the website every time",
];

export function InstallPrompt() {
  const { deferred, installed } = useInstallState();
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [ios, setIos] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    startInstallListener();
    registerAppServiceWorker(() =>
      toast("A new CashFlow update is available.", {
        duration: Infinity,
        action: { label: "Update", onClick: () => window.location.reload() },
      }),
    );
    setIos(isIos() && !isStandalone());
    setMobile(window.matchMedia("(max-width: 640px)").matches);
    setHidden(isSnoozed() || isStandalone());
    const t = window.setTimeout(() => setReady(true), 4000);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready || hidden || installed) return null;
  const canInstall = !!deferred;
  if (!canInstall && !ios) return null;

  const close = () => {
    snooze();
    setHidden(true);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      className="fixed inset-x-3 bottom-20 z-50 animate-in fade-in-0 slide-in-from-bottom-4 duration-300 sm:bottom-4 sm:left-auto sm:right-4 sm:w-[360px] lg:bottom-6 lg:right-6"
    >
      <div className="card-surface relative p-5 shadow-lift">
        <button
          aria-label="Close"
          onClick={close}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <Logo className="text-gold-foreground" />
          <p id="install-title" className="text-base font-semibold">
            {ios ? "Install CashFlow on your iPhone" : mobile ? "Install CashFlow" : "Install CashFlow on your computer"}
          </p>
        </div>

        {ios ? (
          <ol className="mt-4 space-y-2.5 text-sm">
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-semibold">1</span>
              Tap the <Share className="h-4 w-4 text-gold" aria-label="Share" /> Share button in Safari.
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-semibold">2</span>
              Select <PlusSquare className="h-4 w-4 text-gold" aria-hidden /> Add to Home Screen.
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-semibold">3</span>
              Tap Add.
            </li>
          </ol>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              {mobile
                ? "Install CashFlow on your device for a faster and easier experience."
                : "Access your CashFlow business system directly from your desktop like a normal application."}
            </p>
            <ul className="mt-3 space-y-1.5">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {b}
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {canInstall ? (
            <Button className="flex-1" onClick={() => void triggerInstall()}>
              <Download className="h-4 w-4" /> Install CashFlow
            </Button>
          ) : null}
          <Button variant="outline" className={canInstall ? "sm:w-auto" : "flex-1"} onClick={close}>
            {ios ? "Got it" : "Not now"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InstallAppButton() {
  const { deferred, installed } = useInstallState();
  const [standalone, setStandalone] = useState(true);
  useEffect(() => {
    startInstallListener();
    setStandalone(isStandalone());
  }, []);
  if (!deferred || installed || standalone) return null;
  return (
    <Button variant="outline" size="sm" onClick={() => void triggerInstall()}>
      <Download className="h-4 w-4" /> Install App
    </Button>
  );
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="alert" className="fixed inset-x-0 top-0 z-[60] border-b border-border bg-card px-4 py-2.5 shadow-lift">
      <div className="mx-auto flex max-w-3xl items-start gap-3 text-sm">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <p>
          <span className="font-semibold">You're offline.</span>{" "}
          <span className="text-muted-foreground">
            Some CashFlow features require an internet connection. Please reconnect to continue.
          </span>
        </p>
      </div>
    </div>
  );
}
