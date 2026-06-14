import { Outlet, Link, createRootRoute, useLocation } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { LayoutDashboard, ReceiptText, User, HardHat, Crown, Sun, Moon, Monitor, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings, setTheme, type Theme } from "@/store/settings";
import { useProjectsStore, projectTotal } from "@/store/projects";
import { useMemo } from "react";
import { SearchModal } from "@/components/SearchModal";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-7xl font-black text-foreground">404</p>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta página não existe ou foi removida.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

const THEME_ITEMS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Claro" },
  { value: "dark", icon: Moon, label: "Escuro" },
  { value: "system", icon: Monitor, label: "Sistema" },
];

function RootComponent() {
  const location = useLocation();
  const settings = useSettings();
  const projects = useProjectsStore();

  const overBudgetCount = useMemo(
    () => projects.filter((p) => p.budget && projectTotal(p) > p.budget).length,
    [projects],
  );

  const navItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      to: "/" as const,
      badge: overBudgetCount > 0 ? overBudgetCount : null,
    },
    { label: "Lançamentos", icon: ReceiptText, to: "/lancamentos" as const, badge: null },
    { label: "Perfil", icon: User, to: "/perfil" as const, badge: null },
  ];

  return (
    <>
      <Toaster richColors position="top-right" />
      <SearchModal />

      <div className="flex min-h-screen bg-background">
        {/* ── Desktop sidebar ──────────────────────────────── */}
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-sidebar md:flex">
          {/* Logo */}
          <div className="flex items-center gap-3 border-b px-5 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/30">
              <HardHat className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[17px] font-black leading-none tracking-tight text-foreground">
                Obras<span className="text-primary">Master</span>
              </p>
              <div className="mt-0.5 flex items-center gap-1">
                <Crown className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Premium
                </span>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 p-3">
            {navItems.map((item) => {
              const active =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                    active
                      ? "bg-primary/10 text-primary dark:bg-primary/15"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn("h-4 w-4 shrink-0", active && "text-primary")}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== null && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Search trigger */}
          <div className="border-t px-3 py-2">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Buscar…</span>
              <kbd className="rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-bold">⌘K</kbd>
            </button>
          </div>

          {/* Theme toggle */}
          <div className="border-t p-4">
            <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Tema
            </p>
            <div className="grid grid-cols-3 gap-1">
              {THEME_ITEMS.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  title={label}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-bold transition-all",
                    settings.theme === value
                      ? "bg-primary/10 text-primary dark:bg-primary/15"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Page content ──────────────────────────────────── */}
        <main className="flex-1 pb-20 md:pb-0 md:pl-64">
          <Outlet />
        </main>

        {/* ── Mobile bottom nav ─────────────────────────────── */}
        <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t bg-sidebar/95 backdrop-blur-sm md:hidden">
          {navItems.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 px-4 transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {item.label}
                </span>
                {item.badge !== null && (
                  <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-black text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
            className="relative flex flex-col items-center justify-center gap-1 px-4 text-muted-foreground transition-colors"
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Buscar</span>
          </button>
        </nav>
      </div>
    </>
  );
}
