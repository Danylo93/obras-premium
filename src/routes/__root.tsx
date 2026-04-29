import { Outlet, Link, createRootRoute, useLocation } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { LayoutDashboard, ReceiptText, Crown, User } from "lucide-react";
import { cn } from "@/lib/utils";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <>
      <Toaster richColors position="top-right" />
  const location = useLocation();
  
  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/" },
    { label: "Lançamentos", icon: ReceiptText, to: "/lancamentos" },
    { label: "Perfil", icon: User, to: "/perfil" },
  ];

      <div className="flex flex-col min-h-screen bg-[#F9FAFB]">
      <div className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </div>
      
      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t h-16 flex items-center justify-around px-2 z-50 md:hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isActive ? "text-primary" : "text-slate-400"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar for Desktop (simplified) */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-primary p-2 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight leading-none">Obras <span className="text-primary">Master</span></h1>
            <div className="flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-[10px] font-bold text-amber-600 uppercase">Premium</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl font-bold transition-all",
                  isActive ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="hidden md:block md:pl-64">
        {/* The content is already rendered by Outlet above, this is just for spacing if needed */}
      </div>
    </div>
    </>
  );
}
