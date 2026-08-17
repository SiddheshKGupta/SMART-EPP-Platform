export function assertUniqueDeviceIdentifier(
  existing: string[],
  deviceIdentifier: string,
) {
  if (existing.includes(deviceIdentifier)) {
    throw new Error("Duplicate device identifier");
  }
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
