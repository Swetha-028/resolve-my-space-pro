import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, STATUSES, PRIORITIES, labelFor } from "@/lib/constants";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role !== "admin") return <Navigate to="/dashboard" />;
  return <ReportsInner />;
}

function ReportsInner() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [building, setBuilding] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["report-complaints"],
    queryFn: async () => {
      const { data } = await supabase.from("complaints").select("*").limit(5000);
      return data ?? [];
    },
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["report-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, email");
      return data ?? [];
    },
  });
  const pmap = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])), [profiles]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const created = new Date(r.created_at);
      if (from && created < new Date(from)) return false;
      if (to && created > new Date(to + "T23:59:59")) return false;
      if (category !== "all" && r.category !== category) return false;
      if (status !== "all" && r.status !== status) return false;
      if (priority !== "all" && r.priority !== priority) return false;
      if (building && !r.building?.toLowerCase().includes(building.toLowerCase())) return false;
      return true;
    });
  }, [rows, from, to, category, status, priority, building]);

  const summary = useMemo(
    () => ({
      total: filtered.length,
      resolved: filtered.filter((r) => ["resolved", "closed"].includes(r.status)).length,
      pending: filtered.filter((r) => r.status === "pending").length,
      critical: filtered.filter((r) => r.priority === "critical").length,
    }),
    [filtered],
  );

  const tableData = useMemo(
    () =>
      filtered.map((r) => ({
        ID: r.id.slice(0, 8),
        Title: r.title,
        Category: labelFor(CATEGORIES, r.category),
        Status: labelFor(STATUSES, r.status),
        Priority: labelFor(PRIORITIES, r.priority),
        Building: r.building ?? "",
        Room: r.room_number ?? "",
        Student: pmap[r.user_id]?.name ?? "",
        Email: pmap[r.user_id]?.email ?? "",
        Created: new Date(r.created_at).toLocaleString(),
        Updated: new Date(r.updated_at).toLocaleString(),
      })),
    [filtered, pmap],
  );

  const exportCSV = () => {
    if (!tableData.length) return;
    const headers = Object.keys(tableData[0]);
    const csv = [
      headers.join(","),
      ...tableData.map((row) =>
        headers
          .map((h) => `"${String((row as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), `complaints-${Date.now()}.csv`);
  };

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(tableData);
    XLSX.utils.book_append_sheet(wb, ws, "Complaints");
    const summarySheet = XLSX.utils.json_to_sheet([summary]);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
    XLSX.writeFile(wb, `complaints-${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Filter complaints and export to CSV or Excel.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-[var(--card-glow)]">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Building</Label>
            <Input
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="Any"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Matched" value={summary.total} />
        <Stat label="Pending" value={summary.pending} />
        <Stat label="Resolved" value={summary.resolved} />
        <Stat label="Critical" value={summary.critical} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={exportCSV} disabled={!filtered.length} className="gap-2">
          <FileText className="h-4 w-4" />
          Export CSV
        </Button>
        <Button
          onClick={exportXLSX}
          disabled={!filtered.length}
          className="gap-2"
          variant="secondary"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export Excel
        </Button>
        <span className="ml-auto inline-flex items-center text-xs text-muted-foreground">
          <Download className="mr-1 h-3 w-3" />
          {filtered.length} records
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-[var(--card-glow)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tableData.slice(0, 50).map((r, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-mono text-[11px]">{r.ID}</td>
                  <td className="px-3 py-2">{r.Title}</td>
                  <td className="px-3 py-2 text-xs">{r.Category}</td>
                  <td className="px-3 py-2 text-xs">{r.Priority}</td>
                  <td className="px-3 py-2 text-xs">{r.Status}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.Created}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tableData.length > 50 && (
            <div className="border-t p-3 text-center text-xs text-muted-foreground">
              Showing 50 of {tableData.length} — export to see all.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--card-glow)]">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
