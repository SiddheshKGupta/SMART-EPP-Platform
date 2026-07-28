import { CheckCircle2, Clock3 } from "lucide-react";
import type { AuditEvent } from "@smart-epp/domain";

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="detail-empty">
        No audit events have been recorded for this version.
      </p>
    );
  }

  return (
    <ol className="audit-timeline" aria-label="Audit history">
      {[...events]
        .sort((left, right) =>
          right.occurredAt.localeCompare(left.occurredAt),
        )
        .map((event, index) => (
          <li key={event.id}>
            <span className="audit-marker" aria-hidden>
              {index === 0 ? <CheckCircle2 /> : <Clock3 />}
            </span>
            <div>
              <strong>{event.action}</strong>
              <span>
                {event.actor.userId} ·{" "}
                <time dateTime={event.occurredAt}>
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Kolkata",
                  }).format(new Date(event.occurredAt))}
                </time>
              </span>
              <p>{event.remarks}</p>
            </div>
          </li>
        ))}
    </ol>
  );
}
