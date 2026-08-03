import type {
  MasterCatalogue,
  MasterKind,
  MasterRecord,
} from "@smart-epp/domain";

export type MasterFieldType = "text" | "number" | "select";

export interface MasterFieldDefinition {
  key: string;
  label: string;
  type: MasterFieldType;
  required?: boolean;
  help?: string;
  options?: (catalogue: MasterCatalogue) => Array<{
    label: string;
    value: string;
  }>;
}

export interface MasterDefinition {
  kind: MasterKind;
  singular: string;
  plural: string;
  description: string;
  fields: MasterFieldDefinition[];
  tableFields: string[];
}

const activeOptions = <T extends MasterRecord>(records: T[]) =>
  records
    .filter((record) => record.status === "ACTIVE")
    .map((record) => ({ label: record.name, value: record.id }));

export const MASTER_DEFINITIONS: MasterDefinition[] = [
  {
    kind: "OEM",
    singular: "OEM",
    plural: "OEMs",
    description: "Default claim and settlement rules inherited by schemes.",
    tableFields: ["defaultClaimTimelineDays", "defaultCalculationBasis"],
    fields: [
      {
        key: "defaultClaimTimelineDays",
        label: "Default claim timeline (days)",
        type: "number",
        required: true,
      },
      {
        key: "defaultCalculationBasis",
        label: "Default calculation basis",
        type: "select",
        required: true,
        options: () => [
          { label: "Invoice value", value: "INVOICE_VALUE" },
          { label: "Base value", value: "BASE_VALUE" },
          { label: "Flat amount", value: "FLAT_AMOUNT" },
        ],
      },
      {
        key: "defaultSettlementCounterpartyType",
        label: "Default settlement route",
        type: "select",
        required: true,
        options: () => [
          { label: "National distributor", value: "DISTRIBUTOR" },
          { label: "Authorised reseller", value: "RESELLER" },
          { label: "OEM", value: "OEM" },
        ],
      },
      {
        key: "defaultRateBps",
        label: "Default rate (basis points)",
        type: "number",
        help: "350 basis points equals 3.5%.",
      },
    ],
  },
  {
    kind: "DISTRIBUTOR",
    singular: "national distributor",
    plural: "National distributors",
    description: "OEM-authorised national settlement counterparties.",
    tableFields: ["oemId"],
    fields: [
      {
        key: "oemId",
        label: "OEM",
        type: "select",
        required: true,
        options: (catalogue) => activeOptions(catalogue.oems),
      },
    ],
  },
  {
    kind: "RESELLER",
    singular: "reseller",
    plural: "Resellers / vendors",
    description: "Authorised vendors mapped to OEM and distributor routes.",
    tableFields: ["oemId", "distributorId"],
    fields: [
      {
        key: "oemId",
        label: "OEM",
        type: "select",
        required: true,
        options: (catalogue) => activeOptions(catalogue.oems),
      },
      {
        key: "distributorId",
        label: "National distributor",
        type: "select",
        required: true,
        options: (catalogue) => activeOptions(catalogue.distributors),
      },
    ],
  },
  {
    kind: "PRODUCT",
    singular: "product",
    plural: "Products",
    description: "OEM device catalogue used by scheme eligibility.",
    tableFields: ["model", "oemId"],
    fields: [
      { key: "model", label: "Model", type: "text", required: true },
      {
        key: "oemId",
        label: "OEM",
        type: "select",
        required: true,
        options: (catalogue) => activeOptions(catalogue.oems),
      },
    ],
  },
  {
    kind: "EMPLOYER",
    singular: "employer",
    plural: "Employers",
    description: "Contractual obligors and their programme references.",
    tableFields: ["programmeCode"],
    fields: [
      {
        key: "programmeCode",
        label: "Programme code",
        type: "text",
        required: true,
      },
    ],
  },
];

export const MASTER_DEFINITION_BY_KIND = Object.fromEntries(
  MASTER_DEFINITIONS.map((definition) => [definition.kind, definition]),
) as Record<MasterKind, MasterDefinition>;

export function masterFieldValue(
  record: MasterRecord,
  key: string,
): string {
  const value = (record as unknown as Record<string, unknown>)[key];
  return value === undefined || value === null ? "—" : String(value);
}

export function masterLabel(
  catalogue: MasterCatalogue,
  id: string,
): string {
  const record = Object.values(catalogue)
    .flat()
    .find((candidate) => candidate.id === id);
  return record?.name ?? id;
}
