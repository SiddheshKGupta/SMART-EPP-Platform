import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SemanticStatus =
  | "INFO"
  | "ATTENTION"
  | "CRITICAL"
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "RETURNED"
  | "REJECTED"
  | "SUPERSEDED"
  | "INACTIVE"
  | "INELIGIBLE"
  | "ELIGIBLE";

const tone: Record<SemanticStatus, string> = {
  INFO: "status-info",
  ATTENTION: "status-attention",
  CRITICAL: "status-critical",
  DRAFT: "status-info",
  SUBMITTED: "status-attention",
  APPROVED: "status-approved",
  RETURNED: "status-attention",
  REJECTED: "status-critical",
  SUPERSEDED: "status-info",
  INACTIVE: "status-info",
  INELIGIBLE: "status-critical",
  ELIGIBLE: "status-approved",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: SemanticStatus;
  label?: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("status-badge", tone[status], className)}
    >
      <span className="status-dot" aria-hidden="true" />
      {label ?? status.replaceAll("_", " ")}
    </Badge>
  );
}
