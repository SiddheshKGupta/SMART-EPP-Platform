import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import type { RuleResult } from "@smart-epp/domain";

export interface RuleTraceProps {
  results: RuleResult[];
}

function sourceHref(result: RuleResult): string | undefined {
  if (!result.sourceEntityId) return undefined;
  return result.sourceEntityType === "SchemeVersion"
    ? `/subvention/schemes?scheme=${encodeURIComponent(result.sourceEntityId)}`
    : result.sourceEntityType === "EmployerProgrammeMappingVersion"
      ? `/subvention/programme-mappings?mapping=${encodeURIComponent(result.sourceEntityId)}`
      : undefined;
}

const outcomeCopy = {
  PASS: "Passed",
  FAIL: "Failed",
  REVIEW: "Review required",
} as const;

export function RuleTrace({ results }: RuleTraceProps) {
  return (
    <ol className="rule-trace" aria-label="Ordered rule trace">
      {results.map((result, index) => {
        const href = sourceHref(result);
        const Icon =
          result.outcome === "PASS"
            ? CheckCircle2
            : result.outcome === "FAIL"
              ? ShieldAlert
              : CircleAlert;
        return (
          <li
            key={`${result.code}-${index}`}
            data-outcome={result.outcome}
          >
            <span className="rule-trace-marker" aria-hidden>
              <Icon />
            </span>
            <div>
              <div className="rule-trace-heading">
                <strong>{result.label}</strong>
                <span>{outcomeCopy[result.outcome]}</span>
              </div>
              <p>{result.reason}</p>
              {result.recoveryAction ? (
                <p className="rule-recovery">
                  <strong>Recovery action:</strong>{" "}
                  {result.recoveryAction}
                </p>
              ) : null}
              {href ? (
                <Link href={href} className="rule-source-link">
                  Open source control
                  <ExternalLink aria-hidden />
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
