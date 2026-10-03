import { Fragment, type ReactNode, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  Camera,
  ChevronDown,
  ClipboardList,
  Cpu,
  DoorOpen,
  FileBadge,
  FlaskConical,
  GitFork,
  Handshake,
  HeartPulse,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  RefreshCw,
  Scale,
  Wifi,
  WifiOff,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  SunMedium,
  Utensils,
  Users,
  Wheat,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimeText } from "@/components/time-text";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/cn";
import { pendingCount, useFarmStore } from "@/lib/store";
import { InstallButton } from "@/components/install-button";
import { LangToggle } from "@/components/lang-toggle";
import { consumePersistError } from "@/lib/indexed-db-storage";
import { toast } from "sonner";
import { useAppT } from "@/i18n/hooks";

type Leaf = { to: string; id: string; exact?: boolean };
type NavGroup = { id: string; children: Leaf[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "troupeau",
    children: [
      { to: "/journee", id: "journee" },
      { to: "/troupeau", id: "troupeau" },
      { to: "/sante", id: "sante" },
    ],
  },
  {
    id: "nutrition",
    children: [
      { to: "/nutrition", id: "nutrition" },
      { to: "/ration", id: "ration" },
    ],
  },
  {
    id: "autonomie",
    children: [
      { to: "/fourrage", id: "fourrage" },
      { to: "/energie", id: "energie" },
    ],
  },
  {
    id: "pilotage",
    children: [
      { to: "/indicateurs", id: "indicateurs" },
      { to: "/preuve", id: "preuve" },
      { to: "/verification", id: "verification" },
      { to: "/journal", id: "journal" },
      { to: "/sync", id: "sync" },
    ],
  },
  {
    id: "ecosysteme",
    children: [
      { to: "/ecosysteme", id: "ecosysteme", exact: true },
      { to: "/ecosysteme/cameras", id: "ecosystemeCameras" },
      { to: "/ecosysteme/portails", id: "ecosystemePortails" },
      { to: "/ecosysteme/balance", id: "ecosystemeBalance" },
      { to: "/ecosysteme/iot", id: "ecosystemeIot" },
    ],
  },
  {
    id: "dossier",
    children: [
      { to: "/label", id: "label" },
      { to: "/vision", id: "vision" },
      { to: "/team", id: "team" },
      { to: "/investisseurs", id: "investisseurs" },
    ],
  },
];

const MOBILE_SLOTS: { to: string; id: string; fab?: boolean }[] = [
  { to: "/", id: "commande" },
  { to: "/journee", id: "journee" },
  { to: "/scan", id: "scan", fab: true },
  { to: "/troupeau", id: "troupeau" },
  { to: "/sync", id: "sync" },
];

const ICONS: Record<string, typeof Activity> = {
  commande: LayoutDashboard,
  journee: ClipboardList,
  troupeau: Activity,
  sante: HeartPulse,
  nutrition: Cpu,
  ration: Utensils,
  fourrage: Wheat,
  energie: SunMedium,
  indicateurs: Zap,
  sync: RefreshCw,
  preuve: ShieldCheck,
  verification: FlaskConical,
  journal: ShieldAlert,
  label: FileBadge,
  investisseurs: Handshake,
  vision: ScrollText,
  team: Users,
  ecosysteme: GitFork,
  ecosystemeCameras: Camera,
  ecosystemePortails: DoorOpen,
  ecosystemeBalance: Scale,
  ecosystemeIot: Cpu,
  scan: Radio,
};

const GROUP_ICON: Record<string, typeof Activity> = {
  troupeau: Activity,
  nutrition: Cpu,
  autonomie: Wheat,
  pilotage: Zap,
  ecosysteme: GitFork,
  dossier: FileBadge,
};

function isActivePath(pathname: string, to: string, exact = false): boolean {
  if (to === "/") return pathname === "/";
  if (exact) return pathname === to || pathname === `${to}/`;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useAppT();
  const persistedOnce = useRef(false);
  useEffect(() => {
    if (persistedOnce.current) return;
    persistedOnce.current = true;
    void useFarmStore.persist.rehydrate();
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const err = consumePersistError();
      if (err) toast.warning(t("shell.persistFail"));
    }, 1500);
    return () => window.clearInterval(timer);
  }, [t]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const network = useFarmStore((s) => s.network);
  const setNetwork = useFarmStore((s) => s.setNetwork);
  const lastSyncedAt = useFarmStore((s) => s.lastSyncedAt);
  const pending = useFarmStore((s) => pendingCount(s));
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem("ovitech-nav-collapsed") === "1";
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem("ovitech-nav-collapsed", next ? "1" : "0");
      } catch {
        return next;
      }
      return next;
    });
  };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-gold focus:px-3 focus:py-2 focus:text-gold-fg"
      >
        {t("shell.skip")}
      </a>
      <div className="flex min-h-dvh">
        <aside
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-bg-elevated lg:flex print:hidden",
            collapsed ? "w-16" : "w-64",
          )}
        >
          <Brand collapsed={collapsed} />
          <Nav
            pathname={pathname}
            pending={pending}
            collapsed={collapsed}
            onNavigate={() => setOpen(false)}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur-md print:hidden">
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-md border border-gold/30 bg-surface text-fg lg:hidden"
              onClick={() => setOpen(true)}
              aria-label={t("shell.openMenu")}
            >
              <Menu className="size-5" />
            </button>
            <button
              type="button"
              className="hidden size-11 items-center justify-center rounded-md border border-gold/30 bg-surface text-fg lg:inline-flex"
              onClick={toggleCollapsed}
              aria-label={collapsed ? t("shell.expandMenu") : t("shell.collapseMenu")}
              aria-expanded={!collapsed}
            >
              {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
            </button>
            <div className="min-w-0 flex-1" />
            <div className="hidden items-center gap-2 sm:flex">
              <LangToggle />
              <Badge tone={network === "online" ? "ok" : "warn"}>
                {network === "online" ? t("shell.network.online") : t("shell.network.offline")}
              </Badge>
              {pending > 0 && (
                <Badge tone="gold">{t("shell.network.pending", { count: pending })}</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setNetwork(network === "online" ? "offline" : "online")}
              aria-label={
                network === "online" ? t("shell.network.ariaCut") : t("shell.network.ariaRestore")
              }
            >
              {network === "online" ? (
                <WifiOff className="sm:hidden" />
              ) : (
                <Wifi className="sm:hidden" />
              )}
              <span className="hidden sm:inline">
                {network === "online" ? t("shell.network.cut") : t("shell.network.restore")}
              </span>
            </Button>
            <InstallButton />
          </header>

          {network === "offline" && (
            <div className="border-b border-warn/30 bg-warn/10 px-4 py-2 text-center text-sm text-warn">
              {t("shell.offlineBanner")}
              <TimeText iso={lastSyncedAt} />
            </div>
          )}

          <main id="contenu" className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-10">
            <LazyMotion features={domAnimation} strict>
              <MotionConfig reducedMotion="user">{children}</MotionConfig>
            </LazyMotion>
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-bg-elevated/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden lg:hidden">
        {MOBILE_SLOTS.map((slot) => {
          const active = isActivePath(pathname, slot.to);
          if (slot.fab) {
            return (
              <div key={slot.to} className="flex flex-col items-center justify-end">
                <Link
                  to={slot.to}
                  className={cn(
                    "flex size-14 translate-y-[-14px] items-center justify-center rounded-full border-2 border-bg bg-green-600 text-leaf-fg shadow-lg shadow-black/40 transition-transform active:scale-95",
                    active ? "ring-2 ring-gold/70" : "",
                  )}
                  aria-label={t("shell.nav.scanFab")}
                >
                  <Radio className="size-7" strokeWidth={2.5} />
                </Link>
                <p className="-mt-1 text-[10px] uppercase tracking-wide text-gold">
                  {t("shell.nav.scanShort")}
                </p>
              </div>
            );
          }
          const Icon = ICONS[slot.id];
          return (
            <Link
              key={slot.to}
              to={slot.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 pt-2 text-[10px] uppercase tracking-wide",
                active ? "text-gold" : "text-muted",
              )}
            >
              {Icon ? <Icon className="size-5" /> : null}
              {t(`shell.nav.${slot.id}`)}
            </Link>
          );
        })}
      </nav>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/70 lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-bg-elevated outline-none lg:hidden">
            <Dialog.Title className="sr-only">{t("shell.openMenu")}</Dialog.Title>
            <div className="flex items-center justify-between pr-2">
              <Brand />
              <Dialog.Close asChild>
                <button type="button" className="size-11" aria-label={t("shell.closeMenu")}>
                  <X className="mx-auto size-5" />
                </button>
              </Dialog.Close>
            </div>
            <Nav pathname={pathname} pending={pending} onNavigate={() => setOpen(false)} />
            <div className="mt-auto flex flex-wrap gap-2 p-4">
              <InstallButton className="flex-1" />
              <LangToggle />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  const t = useAppT();
  return (
    <Link to="/" className={cn("flex items-center gap-3 px-4 py-5", collapsed && "justify-center px-0")}>
      <BrandMark />
      {!collapsed && (
        <div>
          <p className="font-display text-lg leading-none tracking-tight">{t("shell.brand")}</p>
          <div aria-hidden="true" className="gold-rule mt-1.5 w-24" />
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gold">
            {t("shell.brandSub")}
          </p>
        </div>
      )}
    </Link>
  );
}

function Nav({
  pathname,
  pending,
  collapsed = false,
  onNavigate,
}: {
  pathname: string;
  pending: number;
  collapsed?: boolean;
  onNavigate: () => void;
}) {
  const t = useAppT();
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const g of NAV_GROUPS) {
      if (g.children.some((c) => isActivePath(pathname, c.to))) initial.add(g.id);
    }
    return initial;
  });

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (collapsed) {
    return (
      <nav className="flex flex-col gap-0.5 overflow-y-auto px-3" aria-label={t("shell.openMenu")}>
        {NAV_GROUPS.flatMap((g) => g.children).map((item) => {
          const Icon = ICONS[item.id]!;
          const active = isActivePath(pathname, item.to, item.exact);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              activeOptions={item.exact ? { exact: true } : undefined}
              title={t(`shell.nav.${item.id}`)}
              aria-label={t(`shell.nav.${item.id}`)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center justify-center rounded-md text-sm transition-colors duration-150",
                active ? "bg-surface text-gold" : "text-muted hover:bg-surface/60 hover:text-fg",
              )}
            >
              <Icon className="size-4" />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-0.5 overflow-y-auto px-3" aria-label={t("shell.openMenu")}>
      {NAV_GROUPS.map((g, gi) => {
        const GroupIcon = GROUP_ICON[g.id]!;
        const open = openIds.has(g.id);
        const groupActive = g.children.some((c) => isActivePath(pathname, c.to));
        return (
          <Fragment key={g.id}>
            {gi > 0 && <div className="my-2 border-t border-gold/20" />}
            <button
              type="button"
              onClick={() => toggle(g.id)}
              aria-expanded={open}
              className={cn(
                "flex h-11 w-full items-center gap-3 rounded-md text-sm transition-colors duration-150",
                "px-3",
                groupActive ? "text-gold" : "text-muted hover:text-fg",
              )}
            >
              <GroupIcon className="size-4" />
              <span className="flex-1 text-start">{t(`shell.groups.${g.id}`)}</span>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-150",
                  open ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>
            {open && (
              <div className="mt-0.5 flex flex-col gap-0.5">
                {g.children.map((item) => {
                  const Icon = ICONS[item.id]!;
                  const active = isActivePath(pathname, item.to, item.exact);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      activeOptions={item.exact ? { exact: true } : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-md ps-6 pe-3 text-sm transition-colors duration-150",
                        active ? "bg-surface text-gold" : "text-muted hover:bg-surface/60 hover:text-fg",
                      )}
                    >
                      <Icon className="size-4" />
                      <span className="flex-1">{t(`shell.nav.${item.id}`)}</span>
                      {item.to === "/sync" && pending > 0 && (
                        <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] text-gold tabular">
                          {pending}
                        </span>
                      )}
                      {item.to === "/journee" && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                          {t("shell.journeePill")}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}