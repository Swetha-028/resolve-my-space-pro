import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  UserCheck,
  Timer,
  Users,
} from "lucide-react";
import { CATEGORIES, labelFor } from "@/lib/constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const CHART_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#64748b",
];

function Dashboard() {
  const { user, role } = useAuth();

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["complaints", "dashboard", role, user?.id],
    enabled: !!user && !!role,
    queryFn: async () => {
      let q = supabase.from("complaints").select("*").order("created_at", { ascending: false });
      if (role === "student") q = q.eq("user_id", user!.id);
      const { data, error } = await q.limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const { data: staffCount = 0 } = useQuery({
    queryKey: ["staff-count"],
    enabled: role === "admin",
    queryFn: async () => {
      const { count } = await supabase
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "staff");
      return count ?? 0;
    },
  });

  const { data: affectedTotal = 0 } = useQuery({
    queryKey: ["affected-total"],
    enabled: role === "admin",
    queryFn: async () => {
      const { count } = await supabase
        .from("complaint_followers")
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  // Staff: load own assignments to compute job stats
  const { data: myAssignments = [] } = useQuery({
    queryKey: ["my-assignments", user?.id],
    enabled: role === "staff" && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("assignments").select("*").eq("staff_id", user!.id);
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const resolved = complaints.filter((c) => ["resolved", "closed"].includes(c.status));
    const resolutionHours = resolved
      .map((c) => (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 36e5)
      .filter((h) => h > 0);
    const avgHrs = resolutionHours.length
      ? resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length
      : 0;

    // Staff-scoped stats
    const myIds = new Set(myAssignments.map((a) => a.complaint_id));
    const myComplaints = complaints.filter((c) => myIds.has(c.id));
    const etaMap = new Map<string, string | null>();
    myAssignments.forEach((a) => {
      etaMap.set(a.complaint_id, a.expected_completion_date ?? null);
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();
    const resolvedToday = myComplaints.filter(
      (c) =>
        ["resolved", "closed"].includes(c.status) &&
        new Date(c.updated_at).getTime() >= startOfToday,
    ).length;
    const overdue = myComplaints.filter((c) => {
      if (["resolved", "closed"].includes(c.status)) return false;
      const eta = etaMap.get(c.id);
      return eta && new Date(eta).getTime() < startOfToday;
    }).length;

    return {
      total: complaints.length,
      pending: complaints.filter((c) => c.status === "pending").length,
      inProgress: complaints.filter((c) => ["assigned", "in_progress"].includes(c.status)).length,
      resolved: resolved.length,
      high: complaints.filter((c) => c.priority === "high").length,
      critical: complaints.filter((c) => c.priority === "critical").length,
      avgResolution: avgHrs,
      myAssigned: myComplaints.filter((c) => c.status === "assigned").length,
      myInProgress: myComplaints.filter((c) => c.status === "in_progress").length,
      myResolvedToday: resolvedToday,
      myOverdue: overdue,
    };
  }, [complaints, myAssignments]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    complaints.forEach((c) => m.set(c.category, (m.get(c.category) ?? 0) + 1));
    return Array.from(m.entries()).map(([k, v]) => ({ name: labelFor(CATEGORIES, k), value: v }));
  }, [complaints]);

  const byBuilding = useMemo(() => {
    const m = new Map<string, number>();
    complaints.forEach((c) =>
      m.set(c.building || "Unspecified", (m.get(c.building || "Unspecified") ?? 0) + 1),
    );
    return Array.from(m.entries())
      .map(([k, v]) => ({ name: k, count: v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [complaints]);

  const monthlyTrend = useMemo(() => {
    const m = new Map<string, number>();
    complaints.forEach((c) => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      m.set(key, (m.get(key) ?? 0) + 1);
    });
    return Array.from(m.entries())
      .sort()
      .slice(-6)
      .map(([k, v]) => ({ month: k, count: v }));
  }, [complaints]);

  const resolutionRate = stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {role === "admin"
              ? "Admin Dashboard"
              : role === "staff"
                ? "Maintenance Dashboard"
                : "Your Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {role === "student"
              ? "Track your complaints and report new issues."
              : "Monitor and resolve campus issues."}
          </p>
        </div>
        {role === "student" && (
          <Button asChild className="gap-2">
            <Link to="/complaints/new">
              <PlusCircle className="h-4 w-4" />
              New complaint
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {role === "staff" ? (
          <>
            <StatCard
              icon={ClipboardList}
              label="Assigned jobs"
              value={stats.myAssigned}
              tone="info"
            />
            <StatCard
              icon={AlertTriangle}
              label="In progress"
              value={stats.myInProgress}
              tone="warning"
            />
            <StatCard
              icon={CheckCircle2}
              label="Resolved today"
              value={stats.myResolvedToday}
              tone="success"
            />
            <StatCard icon={Timer} label="Overdue" value={stats.myOverdue} tone="destructive" />
          </>
        ) : (
          <>
            <StatCard icon={ClipboardList} label="Total" value={stats.total} tone="primary" />
            <StatCard icon={Clock} label="Pending" value={stats.pending} tone="warning" />
            <StatCard
              icon={AlertTriangle}
              label="In progress"
              value={stats.inProgress}
              tone="info"
            />
            <StatCard icon={CheckCircle2} label="Resolved" value={stats.resolved} tone="success" />
          </>
        )}
        {role === "admin" && (
          <>
            <StatCard icon={Flame} label="High priority" value={stats.high} tone="warning" />
            <StatCard icon={Flame} label="Critical" value={stats.critical} tone="destructive" />
            <StatCard icon={UserCheck} label="Active staff" value={staffCount} tone="info" />
            <StatCard
              icon={Timer}
              label="Avg resolution"
              value={`${stats.avgResolution.toFixed(1)}h`}
              tone="primary"
            />
            <StatCard
              icon={Users}
              label="Affected students (followers)"
              value={affectedTotal}
              tone="info"
            />
          </>
        )}
      </div>

      {role === "admin" && complaints.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title="Complaints by category">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {byCategory.map((c, i) => (
                <span key={c.name} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  {c.name} <span className="text-muted-foreground">({c.value})</span>
                </span>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Complaints by building">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byBuilding}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Monthly trend">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Resolution rate">
            <div className="flex h-[240px] flex-col items-center justify-center gap-3">
              <div className="text-6xl font-bold tabular-nums">{resolutionRate}%</div>
              <div className="text-sm text-muted-foreground">
                {stats.resolved} of {stats.total} resolved
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-success transition-all"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
            </div>
          </ChartCard>
        </div>
      )}

      <div className="rounded-2xl border bg-card shadow-[var(--card-glow)]">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">
            {role === "staff" ? "My recent tasks" : "Recent complaints"}
          </h2>
          <Link
            to={role === "staff" ? "/tasks" : "/complaints"}
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="divide-y">
          {isLoading && (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
          )}
          {!isLoading &&
            (() => {
              const list =
                role === "staff"
                  ? complaints.filter((c) =>
                      new Set(myAssignments.map((a) => a.complaint_id)).has(c.id),
                    )
                  : complaints;
              if (list.length === 0) {
                return (
                  <div className="p-10 text-center text-sm text-muted-foreground">
                    {role === "staff" ? "No assigned tasks yet." : "No complaints yet."}{" "}
                    {role === "student" && (
                      <Link to="/complaints/new" className="text-primary hover:underline">
                        Report your first issue →
                      </Link>
                    )}
                  </div>
                );
              }
              return list.slice(0, 8).map((c) => (
                <Link
                  key={c.id}
                  to="/complaints/$id"
                  params={{ id: c.id }}
                  className="flex items-center justify-between gap-3 p-4 transition hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.title}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {c.building || "—"}
                      {c.room_number ? ` · Room ${c.room_number}` : ""} ·{" "}
                      {new Date(c.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                  </div>
                </Link>
              ));
            })()}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--card-glow)]">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: "primary" | "warning" | "info" | "success" | "destructive";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground",
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  };
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--card-glow)]">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
