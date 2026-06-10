import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  LogOut,
  Wrench,
  Users,
  BarChart3,
  Settings,
  Bell,
  ClipboardCheck,
  CheckCircle2,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications", "unread", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      return count ?? 0;
    },
  });

  const nav =
    role === "admin"
      ? [
          { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/complaints", label: "Complaints", icon: ListChecks },
          { to: "/users", label: "Users", icon: Users },
          { to: "/reports", label: "Reports", icon: BarChart3 },
          { to: "/settings", label: "Settings", icon: Settings },
        ]
      : role === "staff"
        ? [
            { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { to: "/tasks", label: "My Tasks", icon: ClipboardCheck },
            { to: "/completed", label: "Completed", icon: CheckCircle2 },
            { to: "/notifications", label: "Alerts", icon: Bell },
            { to: "/profile", label: "Profile", icon: UserIcon },
          ]
        : [
            { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { to: "/complaints", label: "Complaints", icon: ListChecks },
            { to: "/complaints/new", label: "Report", icon: PlusCircle },
          ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-primary-foreground shadow-md">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Smart Campus</div>
              <div className="text-xs text-muted-foreground capitalize">
                {role ?? "—"} · {user?.email}
              </div>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {nav.map((n) => {
              const active = n.to === "/dashboard" ? path === "/dashboard" : path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50",
                  )}
                >
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1">
            <Link
              to="/notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/50"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around px-1 py-1.5">
          {nav.map((n) => {
            const active = n.to === "/dashboard" ? path === "/dashboard" : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[10px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
