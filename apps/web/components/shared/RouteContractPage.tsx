import { Filter, Route } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";

export type RouteFilters = Record<string, string | string[] | undefined>;
export type RouteSearchParams = Promise<RouteFilters>;

function filterEntries(filters: RouteFilters): Array<[string, string[]]> {
  return Object.entries(filters).flatMap(([key, value]) => {
    if (value === undefined) return [];
    return [[key, Array.isArray(value) ? value : [value]]];
  });
}

export function RouteContractPage({
  title,
  description,
  filters,
}: {
  title: string;
  description: string;
  filters: RouteFilters;
}) {
  const entries = filterEntries(filters);

  return (
    <div className="route-contract">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Source work queue</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <StatusBadge status="INFO" label="Route ready" />
      </header>

      <section
        className="route-contract-workspace"
        aria-labelledby="route-context-title"
      >
        <div className="route-contract-marker" aria-hidden="true">
          <Route />
        </div>
        <div className="route-contract-copy">
          <span className="eyebrow">Destination contract</span>
          <h2 id="route-context-title">Filtered operational context</h2>
          <p>
            This destination preserves the source queue and active filters while
            its task-specific workspace is delivered.
          </p>
        </div>

        <div className="filter-context">
          <div className="filter-context-heading">
            <Filter aria-hidden />
            <h2>Active filters</h2>
          </div>
          {entries.length > 0 ? (
            <dl>
              {entries.map(([key, values]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>
                    {values.map((value) => (
                      <code key={value}>{value}</code>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="filter-empty">No active filters</p>
          )}
        </div>
      </section>
    </div>
  );
}
