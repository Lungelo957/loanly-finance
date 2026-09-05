import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const installed = () => setDeferred(null);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  useEffect(() => {
    setDismissed(localStorage.getItem("cashflow.install.dismissed") === "1");
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:left-auto sm:right-4 sm:w-80">
      <div className="card-surface p-4 shadow-lift">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg bg-accent p-2 text-accent-foreground">
            <Download className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Install CashFlow</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Install CashFlow on your phone or computer for quick access.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  await deferred.prompt();
                  await deferred.userChoice;
                  setDeferred(null);
                }}
              >
                Install
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  localStorage.setItem("cashflow.install.dismissed", "1");
                  setDismissed(true);
                }}
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
