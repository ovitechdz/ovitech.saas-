import type { ErrorComponentProps, NotFoundRouteProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Home, RefreshCw, TriangleAlert } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useAppT } from "@/i18n/hooks";

export function AppErrorComponent({ error, reset }: ErrorComponentProps) {
  const t = useAppT();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-lg font-medium">{t("app.error.title")}</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {error instanceof Error && error.message ? error.message : t("app.error.sub")}
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        <RefreshCw className="size-4" />
        {t("app.error.retry")}
      </Button>
    </main>
  );
}

export function AppNotFoundComponent({ isNotFound }: NotFoundRouteProps) {
  const t = useAppT();
  if (!isNotFound) return null;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="font-display text-6xl text-gold" aria-hidden="true">
        404
      </span>
      <h1 className="font-display text-lg font-medium">{t("app.notFound.title")}</h1>
      <p className="max-w-md text-sm text-muted">{t("app.notFound.sub")}</p>
      <Button variant="outline" size="sm" asChild>
        <Link to="/">
          <Home className="size-4" />
          {t("app.notFound.home")}
        </Link>
      </Button>
    </main>
  );
}

export function AppPendingComponent() {
  const t = useAppT();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-fg">
      <Spinner label={t("app.loading.title")} />
    </main>
  );
}