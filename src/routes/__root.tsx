import { useEffect } from "react";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "sonner";
import { resetStoreForSsr } from "@/lib/store";
import { I18nProvider } from "@/i18n/provider";
import { registerServiceWorker } from "@/lib/register-sw";
import appCss from "../styles.css?url";

const APP_NAME = "OVITECH";

export const Route = createRootRoute({
  beforeLoad: () => {
    if (typeof window === "undefined") {
      resetStoreForSsr();
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "OVITECH — écosystème agritech ovin. Identité RFID, Offline First, moteur nutritionnel et indicateurs de production.",
      },
      { name: "theme-color", content: "#08110e" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: Root,
});

function Root() {
  const href = useRouterState({ select: (s) => s.location.href });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [href]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <html lang="fr" dir="ltr" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <I18nProvider>
          <AuthProvider>
            <AppShell>
              <Outlet />
            </AppShell>
            <Toaster
              theme="dark"
              position="top-center"
              offset={72}
              toastOptions={{
                style: {
                  background: "#15221c",
                  border: "1px solid rgba(242,235,224,0.12)",
                  color: "#f2ebe0",
                },
              }}
            />
          </AuthProvider>
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  );
}
