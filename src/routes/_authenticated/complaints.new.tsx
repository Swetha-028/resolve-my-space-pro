import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATEGORIES, PRIORITIES, labelFor } from "@/lib/constants";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { suggestPriority } from "@/lib/priority-ai";
import {
  scoreCandidate,
  DUPLICATE_THRESHOLD,
  type DuplicateCandidate,
} from "@/lib/duplicate-detection";
import { toast } from "sonner";
import { AlertTriangle, MapPin, Sparkles, Upload, Users, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/complaints/new")({
  component: NewComplaint,
});

const schema = z.object({
  title: z.string().trim().min(3, "Title too short").max(120),
  description: z.string().trim().min(10, "Add a few details").max(2000),
  category: z.enum([
    "electrical",
    "projector",
    "fan",
    "water_leakage",
    "furniture",
    "internet",
    "cleanliness",
    "washroom",
    "other",
  ]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  building: z.string().trim().max(100).optional().or(z.literal("")),
  room_number: z.string().trim().max(50).optional().or(z.literal("")),
});

function NewComplaint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("electrical");
  const [priority, setPriority] = useState<string>("medium");
  const [building, setBuilding] = useState("");
  const [room, setRoom] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [priorityTouched, setPriorityTouched] = useState(false);

  const suggestion = useMemo(() => suggestPriority(title, description), [title, description]);

  // Auto-fill priority from the suggestion until the user changes it manually.
  // Auto-fill priority from the suggestion until the user changes it manually.
  useEffect(() => {
    if (!priorityTouched) setPriority(suggestion.priority);
  }, [suggestion.priority, priorityTouched]);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location captured");
      },
      (err) => toast.error(err.message),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const onFile = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const [dupes, setDupes] = useState<(DuplicateCandidate & { followers: number })[]>([]);
  const [dupeOpen, setDupeOpen] = useState(false);

  const doCreate = async (parsed: z.infer<typeof schema>) => {
    if (!user) return;
    let image_url: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("complaint-images")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      image_url = path;
    }
    const { data, error } = await supabase
      .from("complaints")
      .insert({
        user_id: user.id,
        title: parsed.title,
        description: parsed.description,
        category: parsed.category,
        priority: parsed.priority,
        building: parsed.building || null,
        room_number: parsed.room_number || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        image_url,
        ai_suggested_priority: suggestion.priority,
        ai_confidence: Number(suggestion.confidence.toFixed(3)),
        ai_reason: suggestion.reason,
      })
      .select("id")
      .single();
    if (error) throw error;
    toast.success("Complaint submitted");
    navigate({ to: "/complaints/$id", params: { id: data.id }, replace: true });
  };

  const followExisting = async (complaintId: string) => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("complaint_followers")
        .insert({ complaint_id: complaintId, user_id: user.id });
      // Ignore unique-violation: already following
      if (error && !/duplicate key|unique/i.test(error.message)) throw error;
      toast.success("You're now following this complaint");
      navigate({ to: "/complaints/$id", params: { id: complaintId }, replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg ?? "Could not follow complaint");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      title,
      description,
      category,
      priority,
      building,
      room_number: room,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!user) return;
    setBusy(true);
    try {
      // Duplicate check: same category, active status, optionally same building.
      let q = supabase
        .from("complaints")
        .select(
          "id, title, description, category, building, room_number, status, priority, created_at",
        )
        .eq("category", parsed.data.category)
        .neq("status", "closed")
        .limit(50);
      if (parsed.data.building) q = q.ilike("building", parsed.data.building);
      const { data: candidates, error: cErr } = await q;
      if (cErr) throw cErr;

      const scored = (candidates ?? [])
        .map((row) => ({
          ...row,
          score: scoreCandidate(
            {
              title: parsed.data.title,
              description: parsed.data.description,
              building: parsed.data.building || null,
              category: parsed.data.category,
            },
            row,
          ),
        }))
        .filter((r) => r.score >= DUPLICATE_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (scored.length > 0) {
        // Fetch follower counts in one shot.
        const ids = scored.map((s) => s.id);
        const { data: followerRows } = await supabase
          .from("complaint_followers")
          .select("complaint_id")
          .in("complaint_id", ids);
        const counts: Record<string, number> = {};
        (followerRows ?? []).forEach((f) => {
          counts[f.complaint_id] = (counts[f.complaint_id] ?? 0) + 1;
        });
        // Affected = followers + 1 (the original reporter)
        setDupes(scored.map((s) => ({ ...s, followers: (counts[s.id] ?? 0) + 1 })));
        setDupeOpen(true);
        setBusy(false);
        return;
      }

      await doCreate(parsed.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg ?? "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  const createAnyway = async () => {
    const parsed = schema.safeParse({
      title,
      description,
      category,
      priority,
      building,
      room_number: room,
    });
    if (!parsed.success) return;
    setDupeOpen(false);
    setBusy(true);
    try {
      await doCreate(parsed.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg ?? "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Report an issue</h1>
        <p className="text-sm text-muted-foreground">
          Help us fix it faster — add a photo and location.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border bg-card p-5 shadow-[var(--card-glow)]"
      >
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="e.g. Ceiling fan not working"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            rows={4}
            placeholder="Describe the issue…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => {
                setPriority(v);
                setPriorityTouched(true);
              }}
            >
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
        </div>

        {(title.trim().length > 0 || description.trim().length > 0) && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">AI suggestion:</span>
              <PriorityBadge priority={suggestion.priority} />
              <span className="text-xs text-muted-foreground">
                Confidence {Math.round(suggestion.confidence * 100)}%
              </span>
              {priorityTouched && priority !== suggestion.priority && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7"
                  onClick={() => {
                    setPriority(suggestion.priority);
                    setPriorityTouched(false);
                  }}
                >
                  Use suggestion
                </Button>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{suggestion.reason}</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="building">Building</Label>
            <Input
              id="building"
              placeholder="e.g. Block C"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room">Room number</Label>
            <Input
              id="room"
              placeholder="e.g. 204"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={captureLocation}
              className="gap-2"
            >
              <MapPin className="h-4 w-4" /> {coords ? "Update GPS" : "Capture GPS"}
            </Button>
            {coords && (
              <span className="text-xs text-muted-foreground">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="photo">Photo</Label>
          {preview ? (
            <div className="relative w-full overflow-hidden rounded-lg border">
              <img src={preview} alt="preview" className="max-h-72 w-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 h-7 w-7"
                onClick={() => onFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label
              htmlFor="photo"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 px-4 py-8 text-sm text-muted-foreground hover:bg-muted/50"
            >
              <Upload className="h-5 w-5" />
              Tap to add a photo
            </label>
          )}
          <input
            id="photo"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Submitting…" : "Submit complaint"}
        </Button>
      </form>

      <Dialog open={dupeOpen} onOpenChange={setDupeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" /> Similar complaint already exists
            </DialogTitle>
            <DialogDescription>
              We found{" "}
              {dupes.length === 1 ? "an active complaint" : `${dupes.length} active complaints`}{" "}
              that look like the issue you're reporting. Following an existing complaint helps us
              prioritise it faster.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-[55vh] space-y-3 overflow-y-auto">
            {dupes.map((d) => (
              <li key={d.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-muted-foreground">
                      #{d.id.slice(0, 8)}
                    </div>
                    <div className="font-medium">{d.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {labelFor(CATEGORIES, d.category)} · {d.building || "—"}
                      {d.room_number ? ` · ${d.room_number}` : ""} ·{" "}
                      {new Date(d.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={d.status} />
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {d.followers} affected
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      match {Math.round(d.score * 100)}%
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={() => followExisting(d.id)} disabled={busy}>
                    Follow this complaint
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDupeOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={createAnyway} disabled={busy}>
              Create new complaint anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
