import { z } from "zod";

export const PurchaseTransactionSchema = z.object({
  leaseId: z.string().min(1),
  employerId: z.string().min(1),
  oemId: z.string().min(1),
  imei: z.string().min(8),
  invoiceValue: z.number().nonnegative(),
  baseValue: z.number().nonnegative(),
  invoiceDate: z.coerce.date(),
  schemeId: z.string().min(1),
  programmeId: z.string().min(1),
});

export {
  assertBatchMutable,
  assertMakerChecker,
  assertUniqueImei,
  assertWithinClaimTimeline,
} from "./controls";
export * from "./subvention/dates";
export * from "./subvention/issues";
export * from "./subvention/master-workflow";
export * from "./subvention/money";
export * from "./subvention/programme-mapping";
export * from "./subvention/schemas";
export * from "./subvention/scheme-rules";
export * from "./subvention/types";
