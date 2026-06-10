import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, labelFor } from "@/lib/constants";
import { Search, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/completed")({
  component: CompletedPage,
});

function CompletedPage() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (role !== "staff") return <Navigate to="/dashboard" />;
  return <CompletedInner userId={user!.id} />;
}

function CompletedInner({ userId }: { userId: string }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [dateRange, setDateRange] = useState<"all" | "7d" | "30d" | "90d">("30d");

  const { data: assignments = [] } = useQuery({
    queryKey: ["staff-assignments-all", userId],
    queryFn: async () => {
      const { data } = await supabase.from("assignments").select("*").eq("staff_id", userId);
      return data ?? [];
    },
  });

  const ids = assignments.map((a) => a.complaint_id);

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["staff-completed", userId, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("complaints")
        .select("*")
        .in("id", ids)
        .in("status", ["resolved", "closed"])
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: notesMap = {} } = useQuery({
    queryKey: ["staff-notes", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("complaint_notes")
        .select("complaint_id, note, created_at")
        .in("complaint_id", ids)
        .order("created_at", { ascending: false });
      const m: Record<string, string> = {};
      (data ?? []).forEach((n: { complaint_id: string; note: string }) => {
        if (!m[n.complaint_id]) m[n.complaint_id] = n.note;
      });
      return m;
    },
  });

  const filtered = useMemo(() => {
    const cutoff =
      dateRange === "all"
        ? 0
        : Date.now() - { "7d": 7, "30d": 30, "90d": 90 }[dateRange] * 86400000;
    return complaints.filter((c) => {
      if (cutoff && new Date(c.updated_at).getTime() < cutoff) return false;
      if (category !== "all" && c.category !== category) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!c.title.toLowerCase().includes(s) && !c.building?.toLowerCase().includes(s))
          return false;
      }
      return true;
    });
  }, [complaints, category, dateRange, q]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Completed Jobs</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} jobs you've resolved.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title or location…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-[var(--card-glow)]">
        {isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No completed jobs in this range.
          </div>
        )}
        <div className="divide-y">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to="/complaints/$id"
              params={{ id: c.id }}
              className="block p-4 transition hover:bg-accent/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      #{c.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {labelFor(CATEGORIES, c.category)}
                    </span>
                  </div>
                  <div className="mt-1 font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.building || "—"}
                    {c.room_number ? ` · ${c.room_number}` : ""}
                  </div>
                  {notesMap[c.id] && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      "{notesMap[c.id]}"
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  Completed
                  <br />
                  {new Date(c.updated_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
