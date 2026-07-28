import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="workspace-empty">
      <Inbox aria-hidden />
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}
