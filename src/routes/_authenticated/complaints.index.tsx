import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, STATUSES, PRIORITIES, labelFor } from "@/lib/constants";
import { Search, Eye, Trash2, ArrowUpDown, Users } from "lucide-react";
import { adminDeleteComplaint } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/complaints/")({
  component: ComplaintsList,
});

const PAGE_SIZE = 10;

function ComplaintsList() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [building, setBuilding] = useState<string>("all");
  const [sort, setSort] = useState<"date_desc" | "date_asc" | "priority_desc" | "affected_desc">(
    "date_desc",
  );
  const [page, setPage] = useState(1);

  const isAdmin = role === "admin";

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["complaints", "list", role, user?.id],
    enabled: !!user && !!role,
    queryFn: async () => {
      let query = supabase.from("complaints").select("*").limit(1000);
      if (role === "student") query = query.eq("user_id", user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: profilesMap = {} } = useQuery({
    queryKey: ["profiles-map"],
    enabled: isAdmin || role === "staff",
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, email, phone");
      const m: Record<string, { name: string; email: string; phone: string | null }> = {};
      (data ?? []).forEach((p) => {
        m[p.id] = { name: p.name, email: p.email, phone: p.phone };
      });
      return m;
    },
  });

  const { data: assignMap = {} } = useQuery({
    queryKey: ["assignments-map"],
    enabled: isAdmin || role === "staff",
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select("complaint_id, staff_id, assigned_date")
        .order("assigned_date", { ascending: false });
      const m: Record<string, string> = {};
      (data ?? []).forEach((a) => {
        if (!m[a.complaint_id]) m[a.complaint_id] = a.staff_id;
      });
      return m;
    },
  });

  const { data: affectedMap = {} } = useQuery({
    queryKey: ["followers-count-map"],
    queryFn: async () => {
      const { data } = await supabase.from("complaint_followers").select("complaint_id");
      const m: Record<string, number> = {};
      (data ?? []).forEach((f) => {
        m[f.complaint_id] = (m[f.complaint_id] ?? 0) + 1;
      });
      return m;
    },
  });
  const affected = (cid: string) => (affectedMap[cid] ?? 0) + 1;

  const buildings = useMemo(
    () => Array.from(new Set(rows.map((r) => r.building).filter(Boolean))) as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    const priOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    const list = rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (category !== "all" && r.category !== category) return false;
      if (priority !== "all" && r.priority !== priority) return false;
      if (building !== "all" && r.building !== building) return false;
      if (q) {
        const s = q.toLowerCase();
        const idMatch = r.id.toLowerCase().includes(s);
        if (
          !idMatch &&
          !r.title.toLowerCase().includes(s) &&
          !r.building?.toLowerCase().includes(s) &&
          !r.room_number?.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
    if (sort === "date_desc")
      list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "date_asc") list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    if (sort === "priority_desc")
      list.sort((a, b) => {
        const pd = (priOrder[b.priority] ?? 0) - (priOrder[a.priority] ?? 0);
        return pd !== 0 ? pd : affected(b.id) - affected(a.id);
      });
    if (sort === "affected_desc") list.sort((a, b) => affected(b.id) - affected(a.id));
    return list;
  }, [rows, q, status, category, priority, building, sort, affectedMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const delFn = useServerFn(adminDeleteComplaint);
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["complaints"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">
        Complaints{" "}
        {isAdmin && (
          <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span>
        )}
      </h1>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
        <div className="relative md:col-span-2 lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search ID, title, building, room…"
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
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
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
        <Select
          value={priority}
          onValueChange={(v) => {
            setPriority(v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
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
        {isAdmin && (
          <Select
            value={building}
            onValueChange={(v) => {
              setBuilding(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Building" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All buildings</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-44 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Newest first</SelectItem>
              <SelectItem value="date_asc">Oldest first</SelectItem>
              <SelectItem value="priority_desc">Highest priority</SelectItem>
              <SelectItem value="affected_desc">Most affected students</SelectItem>
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
            No complaints match those filters.
          </div>
        )}
        {!isLoading && pageRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Location</th>
                  {isAdmin && <th className="px-3 py-2">Student</th>}
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Priority</th>
                  {(isAdmin || role === "staff") && <th className="px-3 py-2">Assigned</th>}
                  {(isAdmin || role === "staff") && <th className="px-3 py-2">Affected</th>}
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageRows.map((c) => {
                  const student = profilesMap[c.user_id];
                  const staffId = assignMap[c.id];
                  const staff = staffId ? profilesMap[staffId] : null;
                  return (
                    <tr key={c.id} className="hover:bg-accent/30">
                      <td className="px-3 py-2 font-mono text-[11px]">{c.id.slice(0, 8)}</td>
                      <td className="px-3 py-2">{labelFor(CATEGORIES, c.category)}</td>
                      <td className="px-3 py-2 text-xs">
                        {c.building || "—"}
                        {c.room_number ? ` · ${c.room_number}` : ""}
                      </td>
                      {isAdmin && <td className="px-3 py-2 text-xs">{student?.name || "—"}</td>}
                      <td className="px-3 py-2">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-3 py-2">
                        <PriorityBadge priority={c.priority} />
                      </td>
                      {(isAdmin || role === "staff") && (
                        <td className="px-3 py-2 text-xs">
                          {staff?.name || <span className="text-muted-foreground">Unassigned</span>}
                        </td>
                      )}
                      {(isAdmin || role === "staff") && (
                        <td className="px-3 py-2 text-xs">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {affected(c.id)}
                          </span>
                        </td>
                      )}
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              navigate({ to: "/complaints/$id", params: { id: c.id } })
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("Delete this complaint?")) delMut.mutate(c.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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

      {/* Card list fallback for very small screens */}
      <div className="grid gap-2 md:hidden">
        {pageRows.map((c) => (
          <Link
            key={c.id}
            to="/complaints/$id"
            params={{ id: c.id }}
            className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 hover:bg-accent/40"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{c.title}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {labelFor(CATEGORIES, c.category)} · {c.building || "—"}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <PriorityBadge priority={c.priority} />
              <StatusBadge status={c.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
