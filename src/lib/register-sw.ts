const REGISTER_STAMP = "ovitech-sw-registered";

function tryRegister(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;
  if (sessionStorage.getItem(REGISTER_STAMP)) return;
  sessionStorage.setItem(REGISTER_STAMP, "1");
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err: unknown) => {
    console.warn("[OVITECH] enregistrement du service worker impossible", err);
    sessionStorage.removeItem(REGISTER_STAMP);
  });
}

tryRegister();

export function registerServiceWorker(): void {
  tryRegister();
}