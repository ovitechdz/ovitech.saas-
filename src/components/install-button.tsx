import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useAppT } from "@/i18n/hooks";

const INSTALL_STAMP = "ovitech-pwa-installed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone();
}

function wasInstalled(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(INSTALL_STAMP) === "1";
  } catch {
    return false;
  }
}

function markInstalled(): void {
  try {
    window.localStorage.setItem(INSTALL_STAMP, "1");
  } catch {
    return;
  }
}

export function InstallButton({ className }: { className?: string }) {
  const t = useAppT();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosSafari, setIosSafari] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasInstalled()) {
      setInstalled(true);
      return;
    }
    setIosSafari(isIosSafari());

    const mql = window.matchMedia("(display-mode: standalone)");
    const onModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setDeferredPrompt(null);
        setInstalled(true);
        markInstalled();
      }
    };
    mql.addEventListener("change", onModeChange);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setInstalled(true);
      markInstalled();
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      mql.removeEventListener("change", onModeChange);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      void deferredPrompt.prompt().then(() =>
        deferredPrompt.userChoice.then((choice) => {
          if (choice.outcome === "accepted") {
            setDeferredPrompt(null);
            setInstalled(true);
            markInstalled();
          }
        }),
      );
    } else if (iosSafari) {
      toast.info(t("shell.install.iosToast"), { duration: 9000 });
    } else {
      toast.info(t("shell.install.fallback"), { duration: 7000 });
      if (!installed) {
        window.open(window.location.href, "_blank", "noopener");
      }
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("shrink-0", className)}
      onClick={handleInstall}
      aria-label={t("shell.install.aria")}
    >
      <Download className="sm:hidden" />
      <span className="hidden sm:inline">{t("shell.install.label")}</span>
    </Button>
  );
}