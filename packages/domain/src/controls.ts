export function assertUniqueImei(existing: string[], imei: string) {
  if (existing.includes(imei)) throw new Error("Duplicate IMEI");
}

export function assertWithinClaimTimeline(
  invoiceDate: Date,
  filingDate: Date,
  days: number,
) {
  const elapsed = Math.floor(
    (filingDate.getTime() - invoiceDate.getTime()) / 86_400_000,
  );
  if (elapsed > days) throw new Error("Claim timeline expired");
}

export function assertMakerChecker(maker: string, checker: string) {
  if (maker === checker) throw new Error("Maker cannot approve own work");
}

export function assertBatchMutable(status: string) {
  if (["APPROVED", "LOCKED"].includes(status)) {
    throw new Error("Approved batch is immutable");
  }
}
