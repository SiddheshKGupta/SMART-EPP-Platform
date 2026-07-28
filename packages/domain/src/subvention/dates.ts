const DAY_MS = 86_400_000;

function parseIsoDate(value: string) {
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) throw new Error(`Invalid ISO date: ${value}`);
  return parsed;
}

export function dateIsWithinInclusive(date: string, start: string, end: string) {
  const value = parseIsoDate(date);
  return value >= parseIsoDate(start) && value <= parseIsoDate(end);
}

export function intervalsOverlapInclusive(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) {
  return (
    parseIsoDate(aStart) <= parseIsoDate(bEnd) &&
    parseIsoDate(bStart) <= parseIsoDate(aEnd)
  );
}

export function addDaysIso(date: string, days: number) {
  return new Date(parseIsoDate(date) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}
