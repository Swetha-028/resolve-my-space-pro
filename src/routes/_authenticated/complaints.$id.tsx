import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { CATEGORIES, STATUSES, PRIORITIES, labelFor } from "@/lib/constants";
import {
  ArrowLeft,
  MapPin,
  UserPlus,
  Phone,
  Mail,
  Play,
  CheckCircle2,
  Upload,
  MessageSquarePlus,
  Sparkles,
  Users,
  BellPlus,
  BellOff,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/complaints/$id")({
  component: ComplaintDetail,
});

function ComplaintDetail() {
  const { id } = Route.useParams();
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const { data: complaint, isLoading } = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("complaints").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: reporter } = useQuery({
    queryKey: ["profile", complaint?.user_id],
    enabled: !!complaint?.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", complaint!.user_id)
        .maybeSingle();
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["history", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("complaint_status_history")
        .select("*")
        .eq("complaint_id", id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select("*")
        .eq("complaint_id", id)
        .order("assigned_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: staffOptions = [] } = useQuery({
    queryKey: ["staff-list"],
    enabled: role === "admin",
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "staff");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("id, name, email").in("id", ids);
      return data ?? [];
    },
  });

  const currentStaffId = assignments[0]?.staff_id ?? null;
  const { data: currentStaff } = useQuery({
    queryKey: ["staff", currentStaffId],
    enabled: !!currentStaffId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", currentStaffId!)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!complaint?.image_url) {
      setSignedUrl(null);
      return;
    }
    supabase.storage
      .from("complaint-images")
      .createSignedUrl(complaint.image_url, 60 * 60)
      .then(({ data }) => {
        setSignedUrl(data?.signedUrl ?? null);
      });
  }, [complaint?.image_url]);

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("complaints")
        .update({ status: status as never })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["complaint", id] });
      qc.invalidateQueries({ queryKey: ["history", id] });
      qc.invalidateQueries({ queryKey: ["complaints"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePriority = useMutation({
    mutationFn: async (priority: string) => {
      const { error } = await supabase
        .from("complaints")
        .update({ priority: priority as never })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Priority updated");
      qc.invalidateQueries({ queryKey: ["complaint", id] });
      qc.invalidateQueries({ queryKey: ["complaints"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["followers", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("complaint_followers")
        .select("user_id")
        .eq("complaint_id", id);
      return data ?? [];
    },
  });
  const affectedCount = followers.length + 1; // followers + original reporter
  const isFollowing = !!user && followers.some((f) => f.user_id === user.id);
  const isReporter = !!complaint && complaint.user_id === user?.id;

  const follow = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("complaint_followers")
        .insert({ complaint_id: id, user_id: user!.id });
      if (error && !/duplicate key|unique/i.test(error.message)) throw error;
    },
    onSuccess: () => {
      toast.success("You're now following this complaint");
      qc.invalidateQueries({ queryKey: ["followers", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const unfollow = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("complaint_followers")
        .delete()
        .eq("complaint_id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Unfollowed");
      qc.invalidateQueries({ queryKey: ["followers", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!complaint)
    return <div className="p-8 text-center text-sm text-muted-foreground">Not found.</div>;

  const canUpdateStatus = role === "admin" || role === "staff" || complaint.user_id === user?.id;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/complaints"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to complaints
      </Link>

      <div className="rounded-2xl border bg-card p-5 shadow-[var(--card-glow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-mono text-muted-foreground">
              #{complaint.id.slice(0, 8)}
            </div>
            <h1 className="text-xl font-bold">{complaint.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {labelFor(CATEGORIES, complaint.category)} · Reported{" "}
              {new Date(complaint.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <PriorityBadge priority={complaint.priority} />
              <StatusBadge status={complaint.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs">
                <Users className="h-3 w-3" /> {affectedCount} affected
              </span>
              {role === "student" &&
                !isReporter &&
                (isFollowing ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1"
                    onClick={() => unfollow.mutate()}
                    disabled={unfollow.isPending}
                  >
                    <BellOff className="h-3.5 w-3.5" /> Unfollow
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-7 gap-1"
                    onClick={() => follow.mutate()}
                    disabled={follow.isPending}
                  >
                    <BellPlus className="h-3.5 w-3.5" /> I'm affected too
                  </Button>
                ))}
            </div>
          </div>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm">{complaint.description}</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Building</dt>
            <dd>{complaint.building || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Room</dt>
            <dd>{complaint.room_number || "—"}</dd>
          </div>
          {complaint.latitude && complaint.longitude && (
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Location</dt>
              <dd>
                <a
                  href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <MapPin className="h-3 w-3" /> {complaint.latitude.toFixed(5)},{" "}
                  {complaint.longitude.toFixed(5)}
                </a>
              </dd>
            </div>
          )}
        </dl>

        {signedUrl && (
          <div className="mt-5 overflow-hidden rounded-lg border">
            <img src={signedUrl} alt="complaint" className="max-h-96 w-full object-cover" />
          </div>
        )}

        {complaint.ai_suggested_priority && (
          <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">AI suggested priority:</span>
              <PriorityBadge priority={complaint.ai_suggested_priority} />
              {complaint.ai_confidence != null && (
                <span className="text-xs text-muted-foreground">
                  Confidence {Math.round(Number(complaint.ai_confidence) * 100)}%
                </span>
              )}
              {complaint.ai_suggested_priority !== complaint.priority && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Final: <PriorityBadge priority={complaint.priority} />
                </span>
              )}
            </div>
            {complaint.ai_reason && (
              <p className="mt-1 text-xs text-muted-foreground">{complaint.ai_reason}</p>
            )}
          </div>
        )}

        {(role === "admin" || role === "staff") && reporter && (
          <div className="mt-5 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="text-xs font-medium text-muted-foreground">Reporter</div>
            <div className="mt-1 font-medium">{reporter.name}</div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {reporter.email}
              </span>
              {reporter.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {reporter.phone}
                </span>
              )}
            </div>
          </div>
        )}

        {(role === "admin" || role === "staff") && currentStaff && (
          <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="text-xs font-medium text-muted-foreground">Assigned to</div>
            <div className="mt-1 font-medium">
              {currentStaff.name}{" "}
              <span className="text-xs text-muted-foreground">· {currentStaff.email}</span>
            </div>
          </div>
        )}

        {canUpdateStatus && (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-5">
            {role === "staff" && complaint.status === "assigned" && (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => updateStatus.mutate("in_progress")}
              >
                <Play className="h-4 w-4" /> Start work
              </Button>
            )}
            {role === "staff" && complaint.status === "in_progress" && (
              <Button
                size="sm"
                className="gap-2 bg-success text-success-foreground hover:bg-success/90"
                onClick={() => updateStatus.mutate("resolved")}
              >
                <CheckCircle2 className="h-4 w-4" /> Mark resolved
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Label className="text-xs">Status</Label>
              <Select value={complaint.status} onValueChange={(v) => updateStatus.mutate(v)}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.filter((s) => (role === "admin" ? true : s.value !== "closed")).map(
                    (s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            {role === "admin" && (
              <>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Priority</Label>
                  <Select
                    value={complaint.priority}
                    onValueChange={(v) => updatePriority.mutate(v)}
                  >
                    <SelectTrigger className="w-32 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <AssignDialog
                  complaintId={complaint.id}
                  currentPriority={complaint.priority}
                  staffOptions={staffOptions}
                />
              </>
            )}
          </div>
        )}
      </div>

      {(role === "staff" || role === "admin") && assignments[0] && (
        <RepairEvidence
          assignmentId={assignments[0].id}
          canEdit={role === "staff" && assignments[0].staff_id === user?.id}
        />
      )}

      {(role === "staff" || role === "admin" || complaint.user_id === user?.id) && (
        <WorkNotes complaintId={complaint.id} canAdd={role === "staff" || role === "admin"} />
      )}

      <div className="rounded-2xl border bg-card p-5 shadow-[var(--card-glow)]">
        <h2 className="mb-3 font-semibold">Status timeline</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history yet.</p>
        ) : (
          <ol className="relative space-y-3 border-l pl-4">
            {history.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[21px] top-1 grid h-3 w-3 place-items-center rounded-full bg-primary ring-2 ring-background" />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {h.from_status && (
                    <>
                      <StatusBadge status={h.from_status} />
                      <span className="text-muted-foreground">→</span>
                    </>
                  )}
                  <StatusBadge status={h.to_status} />
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function WorkNotes({ complaintId, canAdd }: { complaintId: string; canAdd: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: ["complaint-notes", complaintId],
    queryFn: async () => {
      const { data } = await supabase
        .from("complaint_notes")
        .select("*")
        .eq("complaint_id", complaintId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: authorMap = {} } = useQuery({
    queryKey: ["note-authors", notes.map((n) => n.author_id).join(",")],
    enabled: notes.length > 0,
    queryFn: async () => {
      const ids = Array.from(new Set(notes.map((n) => n.author_id)));
      const { data } = await supabase.from("profiles").select("id, name").in("id", ids);
      const m: Record<string, string> = {};
      (data ?? []).forEach((p) => {
        m[p.id] = p.name;
      });
      return m;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!note.trim()) throw new Error("Note is empty");
      const { error } = await supabase
        .from("complaint_notes")
        .insert({ complaint_id: complaintId, author_id: user!.id, note: note.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setNote("");
      toast.success("Note added");
      qc.invalidateQueries({ queryKey: ["complaint-notes", complaintId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--card-glow)]">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <MessageSquarePlus className="h-4 w-4" /> Work notes
      </h2>
      {canAdd && (
        <div className="mb-4 space-y-2">
          <Textarea
            rows={2}
            placeholder="e.g. Replaced damaged wiring, checked connections…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button size="sm" onClick={() => add.mutate()} disabled={add.isPending || !note.trim()}>
            {add.isPending ? "Adding…" : "Add note"}
          </Button>
        </div>
      )}
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ol className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="whitespace-pre-wrap">{n.note}</p>
              <div className="mt-1.5 text-xs text-muted-foreground">
                {authorMap[n.author_id] || "Unknown"} · {new Date(n.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RepairEvidence({ assignmentId, canEdit }: { assignmentId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<"before" | "after" | null>(null);

  const { data: assignment } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .maybeSingle();
      return data as {
        id: string;
        before_image_url: string | null;
        after_image_url: string | null;
      } | null;
    },
  });

  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);

  useEffect(() => {
    const sign = async (path: string | null, set: (s: string | null) => void) => {
      if (!path) {
        set(null);
        return;
      }
      const { data } = await supabase.storage.from("complaint-images").createSignedUrl(path, 3600);
      set(data?.signedUrl ?? null);
    };
    sign(assignment?.before_image_url ?? null, setBeforeUrl);
    sign(assignment?.after_image_url ?? null, setAfterUrl);
  }, [assignment?.before_image_url, assignment?.after_image_url]);

  const upload = async (file: File, kind: "before" | "after") => {
    setBusy(kind);
    try {
      const path = `repairs/${assignmentId}/${kind}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("complaint-images").upload(path, file);
      if (upErr) throw upErr;
      const patch = kind === "before" ? { before_image_url: path } : { after_image_url: path };
      const { error: updErr } = await supabase
        .from("assignments")
        .update(patch)
        .eq("id", assignmentId);
      if (updErr) throw updErr;
      toast.success(`${kind === "before" ? "Before" : "After"} photo uploaded`);
      qc.invalidateQueries({ queryKey: ["assignment", assignmentId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--card-glow)]">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <Upload className="h-4 w-4" /> Repair evidence
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <PhotoSlot
          label="Before repair"
          url={beforeUrl}
          canEdit={canEdit}
          busy={busy === "before"}
          onPick={(f) => upload(f, "before")}
        />
        <PhotoSlot
          label="After repair"
          url={afterUrl}
          canEdit={canEdit}
          busy={busy === "after"}
          onPick={(f) => upload(f, "after")}
        />
      </div>
    </div>
  );
}

function PhotoSlot({
  label,
  url,
  canEdit,
  busy,
  onPick,
}: {
  label: string;
  url: string | null;
  canEdit: boolean;
  busy: boolean;
  onPick: (f: File) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="aspect-video overflow-hidden rounded-lg border bg-muted/30">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            No photo
          </div>
        )}
      </div>
      {canEdit && (
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-primary hover:underline">
          <Upload className="h-3 w-3" />
          {busy ? "Uploading…" : url ? "Replace photo" : "Upload photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
            }}
          />
        </label>
      )}
    </div>
  );
}

function AssignDialog({
  complaintId,
  currentPriority,
  staffOptions,
}: {
  complaintId: string;
  currentPriority: string;
  staffOptions: { id: string; name: string; email: string }[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [priority, setPriority] = useState(currentPriority);
  const [eta, setEta] = useState("");
  const [notes, setNotes] = useState("");

  const assign = useMutation({
    mutationFn: async () => {
      if (!staffId) throw new Error("Select a staff member");
      const { error: aErr } = await supabase.from("assignments").insert({
        complaint_id: complaintId,
        staff_id: staffId,
        priority: priority as never,
        expected_completion_date: eta || null,
        notes: notes || null,
      });
      if (aErr) throw aErr;
      const { error: cErr } = await supabase
        .from("complaints")
        .update({ status: "assigned" as never, priority: priority as never })
        .eq("id", complaintId);
      if (cErr) throw cErr;
      await supabase.from("notifications").insert({
        user_id: staffId,
        message: `New assignment for complaint ${complaintId.slice(0, 8)}`,
      });
    },
    onSuccess: () => {
      toast.success("Staff assigned");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["complaint", complaintId] });
      qc.invalidateQueries({ queryKey: ["assignments", complaintId] });
      qc.invalidateQueries({ queryKey: ["complaints"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Assign staff
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign maintenance staff</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Staff member</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staffOptions.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No staff available
                  </div>
                )}
                {staffOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.email})
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
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Expected completion</Label>
            <Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional instructions"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => assign.mutate()} disabled={assign.isPending}>
            {assign.isPending ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
