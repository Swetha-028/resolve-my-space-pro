import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, PRIORITIES } from "@/lib/constants";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role !== "admin") return <Navigate to="/dashboard" />;
  return <SettingsInner />;
}

function SettingsInner() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*").maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    college_name: "Smart Campus",
    college_address: "",
    support_email: "",
    notify_on_new_complaint: true,
    notify_on_assignment: true,
    notify_on_critical: true,
    theme: "system",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        college_name: settings.college_name ?? "Smart Campus",
        college_address: settings.college_address ?? "",
        support_email: settings.support_email ?? "",
        notify_on_new_complaint: settings.notify_on_new_complaint,
        notify_on_assignment: settings.notify_on_assignment,
        notify_on_critical: settings.notify_on_critical,
        theme: settings.theme ?? "system",
      });
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("app_settings").update(form).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage college information, notifications, and system preferences.
        </p>
      </div>

      <Section title="College information">
        <Field label="College name">
          <Input
            value={form.college_name}
            onChange={(e) => setForm({ ...form, college_name: e.target.value })}
          />
        </Field>
        <Field label="Address">
          <Input
            value={form.college_address}
            onChange={(e) => setForm({ ...form, college_address: e.target.value })}
          />
        </Field>
        <Field label="Support email">
          <Input
            type="email"
            value={form.support_email}
            onChange={(e) => setForm({ ...form, support_email: e.target.value })}
          />
        </Field>
      </Section>

      <Section title="Notification preferences">
        <Toggle
          label="Notify on new complaint"
          value={form.notify_on_new_complaint}
          onChange={(v) => setForm({ ...form, notify_on_new_complaint: v })}
        />
        <Toggle
          label="Notify on staff assignment"
          value={form.notify_on_assignment}
          onChange={(v) => setForm({ ...form, notify_on_assignment: v })}
        />
        <Toggle
          label="Notify on critical complaint"
          value={form.notify_on_critical}
          onChange={(v) => setForm({ ...form, notify_on_critical: v })}
        />
      </Section>

      <Section title="Theme">
        <Field label="App theme">
          <Select value={form.theme} onValueChange={(v) => setForm({ ...form, theme: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section
        title="Complaint categories"
        description="Read-only reference list. Changes require a migration."
      >
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <span key={c.value} className="rounded-full border bg-muted/40 px-3 py-1 text-xs">
              {c.label}
            </span>
          ))}
        </div>
      </Section>

      <Section
        title="Priority levels"
        description="Color-coded priorities used throughout the app."
      >
        <div className="space-y-2 text-sm">
          {PRIORITIES.map((p) => (
            <div key={p.value} className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium">{p.label}</span>
              <span className="text-xs text-muted-foreground">
                {p.value === "low" && "Minor inconvenience"}
                {p.value === "medium" && "Normal maintenance"}
                {p.value === "high" && "Requires quick attention"}
                {p.value === "critical" && "Immediate action — safety risk"}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-20 lg:bottom-4 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2 shadow-lg">
          <Save className="h-4 w-4" />
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--card-glow)]">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
