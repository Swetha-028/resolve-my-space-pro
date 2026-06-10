import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User as UserIcon, Mail, Briefcase, ClipboardCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: jobsCount = 0 } = useQuery({
    queryKey: ["my-jobs-count", user?.id],
    enabled: !!user && role === "staff",
    queryFn: async () => {
      const { count } = await supabase
        .from("assignments")
        .select("id", { count: "exact", head: true })
        .eq("staff_id", user!.id);
      return count ?? 0;
    },
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // hydrate when profile loads
  if (profile && name === "" && phone === "") {
    if (profile.name) setName(profile.name);
    if (profile.phone) setPhone(profile.phone);
  }

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ name, phone: phone || null })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password updated");
      setNewPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account.</p>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-[var(--card-glow)]">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full gradient-brand text-2xl font-bold text-primary-foreground">
            {(profile?.name || user.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-semibold">{profile?.name || "—"}</div>
            <div className="text-xs capitalize text-muted-foreground">{role}</div>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <Info icon={Mail} label="Email" value={user.email ?? "—"} />
          <Info icon={UserIcon} label="Employee ID" value={user.id.slice(0, 8).toUpperCase()} />
          <Info icon={Briefcase} label="Role" value={role ?? "—"} />
          {role === "staff" && (
            <Info icon={ClipboardCheck} label="Assigned Jobs" value={String(jobsCount)} />
          )}
        </dl>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-[var(--card-glow)]">
        <h2 className="mb-3 font-semibold">Edit profile</h2>
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
          </div>
          <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-[var(--card-glow)]">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <KeyRound className="h-4 w-4" /> Change password
        </h2>
        <div className="space-y-3">
          <Input
            type="password"
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => changePassword.mutate()}
            disabled={changePassword.isPending || !newPassword}
          >
            {changePassword.isPending ? "Updating…" : "Update password"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
