import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { CATEGORIES, STATUSES, PRIORITIES, labelFor } from "@/lib/constants";
import { Search, Eye, ArrowUpDown, Flame } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

const PAGE_SIZE = 10;

function TasksPage() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (role !== "staff") return <Navigate to="/dashboard" />;
  return <TasksInner userId={user!.id} />;
}

function TasksInner({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState<"priority_desc" | "due_asc" | "due_desc">("priority_desc");
  const [page, setPage] = useState(1);

  const { data: assignments = [], refetch } = useQuery({
    queryKey: ["staff-assignments", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select("*")
        .eq("staff_id", userId)
        .order("assigned_date", { ascending: false });
      return data ?? [];
    },
  });

  const ids = useMemo(() => assignments.map((a) => a.complaint_id), [assignments]);

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["staff-complaints", userId, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("complaints").select("*").in("id", ids);
      return data ?? [];
    },
  });

  // Realtime: refresh on new assignment or complaint status change
  useEffect(() => {
    const ch = supabase
      .channel(`tasks:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignments", filter: `staff_id=eq.${userId}` },
        () => refetch(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, () =>
        refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, refetch]);

  const etaMap = useMemo(() => {
    const m = new Map<string, string | null>();
    assignments.forEach((a) => {
      if (!m.has(a.complaint_id))
        m.set(
          a.complaint_id,
          (a as { expected_completion_date: string | null }).expected_completion_date ?? null,
        );
    });
    return m;
  }, [assignments]);

  const filtered = useMemo(() => {
    const priOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    let list = [...complaints];
    if (status === "active") list = list.filter((c) => !["resolved", "closed"].includes(c.status));
    else if (status !== "all") list = list.filter((c) => c.status === status);
    if (priority !== "all") list = list.filter((c) => c.priority === priority);
    if (q) {
      const s = q.toLowerCase();
      list = list.filter(
        (c) =>
          c.id.toLowerCase().includes(s) ||
          c.title.toLowerCase().includes(s) ||
          c.building?.toLowerCase().includes(s),
      );
    }
    if (sort === "priority_desc")
      list.sort((a, b) => (priOrder[b.priority] ?? 0) - (priOrder[a.priority] ?? 0));
    if (sort === "due_asc" || sort === "due_desc") {
      list.sort((a, b) => {
        const da = etaMap.get(a.id);
        const db = etaMap.get(b.id);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        const diff = new Date(da).getTime() - new Date(db).getTime();
        return sort === "due_asc" ? diff : -diff;
      });
    }
    // Critical always pinned top
    list.sort((a, b) => (b.priority === "critical" ? 1 : 0) - (a.priority === "critical" ? 1 : 0));
    return list;
  }, [complaints, q, status, priority, sort, etaMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Maintenance work assigned to you ({filtered.length}).
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search ID, title, building…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priority}
          onValueChange={(v) => {
            setPriority(v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority_desc">Highest priority</SelectItem>
              <SelectItem value="due_asc">Due date (soonest)</SelectItem>
              <SelectItem value="due_desc">Due date (latest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-[var(--card-glow)]">
        {isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && pageRows.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No tasks match those filters.
          </div>
        )}
        {!isLoading && pageRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Issue</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageRows.map((c) => {
                  const eta = etaMap.get(c.id);
                  const isOverdue =
                    eta &&
                    new Date(eta).getTime() < today.getTime() &&
                    !["resolved", "closed"].includes(c.status);
                  const isCritical = c.priority === "critical";
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-accent/30 ${isCritical ? "bg-destructive/5" : ""}`}
                    >
                      <td className="px-3 py-2 font-mono text-[11px]">
                        {isCritical && <Flame className="mr-1 inline h-3 w-3 text-destructive" />}
                        {c.id.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{c.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {labelFor(CATEGORIES, c.category)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {c.building || "—"}
                        {c.room_number ? ` · ${c.room_number}` : ""}
                      </td>
                      <td className="px-3 py-2">
                        <PriorityBadge priority={c.priority} />
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={c.status} />
                      </td>
                      <td
                        className={`px-3 py-2 text-xs ${isOverdue ? "font-semibold text-destructive" : "text-muted-foreground"}`}
                      >
                        {eta ? new Date(eta).toLocaleDateString() : "—"}
                        {isOverdue && <span className="ml-1">(overdue)</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate({ to: "/complaints/$id", params: { id: c.id } })}
                        >
                          <Eye className="mr-1 h-4 w-4" /> Open
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
