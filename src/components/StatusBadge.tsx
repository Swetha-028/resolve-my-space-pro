import { STATUS_VARIANT, PRIORITY_VARIANT, labelFor, STATUSES, PRIORITIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_VARIANT[status] ?? "",
        className,
      )}
    >
      {labelFor(STATUSES, status)}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        PRIORITY_VARIANT[priority] ?? "",
        className,
      )}
    >
      {labelFor(PRIORITIES, priority)}
    </span>
  );
}
