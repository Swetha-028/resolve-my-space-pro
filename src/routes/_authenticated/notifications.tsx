import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All marked read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unread} unread · {items.length} total
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" onClick={() => markAll.mutate()}>
            <Check className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="rounded-2xl border bg-card shadow-[var(--card-glow)]">
        {isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && items.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No notifications yet.
          </div>
        )}
        <div className="divide-y">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 ${!n.read ? "bg-primary/5" : ""}`}
            >
              <div
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${!n.read ? "bg-primary" : "bg-muted-foreground/30"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm">{n.message}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
              {!n.read && (
                <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
