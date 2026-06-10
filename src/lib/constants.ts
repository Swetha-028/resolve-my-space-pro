export const CATEGORIES = [
  { value: "electrical", label: "Electrical" },
  { value: "projector", label: "Projector" },
  { value: "fan", label: "Fan" },
  { value: "water_leakage", label: "Water Leakage" },
  { value: "furniture", label: "Furniture" },
  { value: "internet", label: "Internet" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "washroom", label: "Washroom" },
  { value: "other", label: "Other" },
] as const;

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

export const STATUS_VARIANT: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/40",
  assigned: "bg-info/15 text-info border-info/40",
  in_progress: "bg-secondary/15 text-secondary border-secondary/40",
  resolved: "bg-success/15 text-success border-success/40",
  closed: "bg-muted text-muted-foreground border-border",
};

export const PRIORITY_VARIANT: Record<string, string> = {
  low: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  medium: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  high: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  critical: "bg-destructive text-destructive-foreground animate-pulse",
};

export function labelFor(list: readonly { value: string; label: string }[], v: string) {
  return list.find((i) => i.value === v)?.label ?? v;
}
