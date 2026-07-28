const DAY_MS = 86_400_000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error(`Invalid ISO date: ${value}`);
  }

  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed) ||
    new Date(parsed).toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
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
