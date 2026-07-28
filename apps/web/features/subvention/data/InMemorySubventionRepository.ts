import {
  evaluateEligibility,
  programmeMappingDraftSchema,
  validatePurchaseImport,
  transitionMaster,
  schemeDraftSchema,
  type Actor,
  type AuditEvent,
  type EligibilityDecision,
  type EmployerProgrammeMappingVersion,
  type ImportResult,
  type OemConfiguration,
  type PurchaseTransaction,
  type PurchaseTransactionInput,
  type QuarantinedPurchaseImportRow,
  type RepositoryDependencies,
  type SchemeVersion,
  type SubventionRepository,
  type SubventionSeed,
  type SubventionSnapshot,
} from "@smart-epp/domain";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemorySubventionRepository
  implements SubventionRepository
{
  private oems: OemConfiguration[];
  private schemes: SchemeVersion[];
  private programmeMappings: EmployerProgrammeMappingVersion[];
  private transactions: PurchaseTransaction[];
  private quarantinedImports: QuarantinedPurchaseImportRow[];
  private eligibilityDecisions: EligibilityDecision[];
  private auditEvents: AuditEvent[];
  private actors: Actor[];
  private existingClaimedImeis: string[];
  private existingClaimedLeaseIds: string[];
  private duplicateImeis: string[];
  private duplicateLeaseIds: string[];

  constructor(
    seed: SubventionSeed,
    private readonly dependencies: RepositoryDependencies,
  ) {
    const copied = clone(seed);
    this.oems = copied.oems;
    this.schemes = copied.schemes;
    this.programmeMappings = copied.programmeMappings;
    this.transactions = copied.transactions;
    this.quarantinedImports = copied.quarantinedImports;
    this.eligibilityDecisions = copied.eligibilityDecisions;
    this.auditEvents = copied.auditEvents;
    this.actors = copied.actors;
    this.existingClaimedImeis = copied.existingClaimedImeis;
    this.existingClaimedLeaseIds = copied.existingClaimedLeaseIds;
    this.duplicateImeis = copied.duplicateImeis;
    this.duplicateLeaseIds = copied.duplicateLeaseIds;
  }

  async listSchemes(): Promise<SchemeVersion[]> {
    return clone(this.schemes);
  }

  async getSnapshot(): Promise<SubventionSnapshot> {
    return clone({
      oems: this.oems,
      schemes: this.schemes,
      programmeMappings: this.programmeMappings,
      transactions: this.transactions,
      eligibilityDecisions: this.eligibilityDecisions,
      quarantinedImports: this.quarantinedImports,
      auditEvents: this.auditEvents,
      actors: this.actors,
      existingClaimedImeis: this.existingClaimedImeis,
      existingClaimedLeaseIds: this.existingClaimedLeaseIds,
      duplicateImeis: this.duplicateImeis,
      duplicateLeaseIds: this.duplicateLeaseIds,
    });
  }

  async listProgrammeMappings(): Promise<
    EmployerProgrammeMappingVersion[]
  > {
    return clone(this.programmeMappings);
  }

  async getScheme(id: string): Promise<SchemeVersion | undefined> {
    return clone(this.schemes.find((scheme) => scheme.id === id));
  }

  async getProgrammeMapping(
    id: string,
  ): Promise<EmployerProgrammeMappingVersion | undefined> {
    return clone(
      this.programmeMappings.find((mapping) => mapping.id === id),
    );
  }

  async submitScheme(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<SchemeVersion> {
    return this.transitionScheme(id, "SUBMIT", actor, remarks);
  }

  async approveScheme(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<SchemeVersion> {
    return this.transitionScheme(id, "APPROVE", actor, remarks);
  }

  async submitProgrammeMapping(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<EmployerProgrammeMappingVersion> {
    return this.transitionProgrammeMapping(id, "SUBMIT", actor, remarks);
  }

  async approveProgrammeMapping(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<EmployerProgrammeMappingVersion> {
    return this.transitionProgrammeMapping(id, "APPROVE", actor, remarks);
  }

  async saveSchemeDraft(
    scheme: SchemeVersion,
    actor: Actor,
    remarks: string,
  ): Promise<SchemeVersion> {
    const input = clone(scheme);
    const index = this.schemes.findIndex(
      (candidate) => candidate.id === input.id,
    );
    const current = this.schemes[index];
    const occurredAt = this.dependencies.now();

    if (current && current.workflowStatus !== "DRAFT") {
      transitionMaster(
        clone(current),
        "SUBMIT",
        clone(actor),
        remarks,
        occurredAt,
      );
      throw new Error("Only draft scheme versions can be saved");
    }
    if (input.workflowStatus !== "DRAFT") {
      throw new Error("Only draft scheme versions can be saved");
    }
    if (
      input.checkerUserId !== undefined ||
      input.approvedAt !== undefined
    ) {
      throw new Error("Approved payload cannot be saved as a draft");
    }
    if (!remarks.trim()) {
      throw new Error("Remarks are required");
    }
    schemeDraftSchema.parse(input);

    const saved: SchemeVersion = {
      ...input,
      makerUserId: actor.userId,
    };
    const auditEvent: AuditEvent = {
      id: this.dependencies.nextId("audit"),
      entityType: "SchemeVersion",
      entityId: saved.id,
      action: "SCHEME_DRAFT_SAVED",
      actor: clone(actor),
      occurredAt,
      remarks,
    };

    if (index === -1) {
      this.schemes.push(saved);
    } else {
      this.schemes[index] = saved;
    }
    this.auditEvents.push(auditEvent);
    return clone(saved);
  }

  async saveProgrammeMappingDraft(
    mapping: EmployerProgrammeMappingVersion,
    actor: Actor,
    remarks: string,
  ): Promise<EmployerProgrammeMappingVersion> {
    const input = clone(mapping);
    const index = this.programmeMappings.findIndex(
      (candidate) => candidate.id === input.id,
    );
    const current = this.programmeMappings[index];
    const occurredAt = this.dependencies.now();

    if (current && current.workflowStatus !== "DRAFT") {
      transitionMaster(
        clone(current),
        "SUBMIT",
        clone(actor),
        remarks,
        occurredAt,
      );
      throw new Error("Only draft programme mapping versions can be saved");
    }
    if (input.workflowStatus !== "DRAFT") {
      throw new Error("Only draft programme mapping versions can be saved");
    }
    if (
      input.checkerUserId !== undefined ||
      input.approvedAt !== undefined
    ) {
      throw new Error("Approved payload cannot be saved as a draft");
    }
    if (!remarks.trim()) {
      throw new Error("Remarks are required");
    }
    programmeMappingDraftSchema.parse(input);

    const saved: EmployerProgrammeMappingVersion = {
      ...input,
      makerUserId: actor.userId,
    };
    const auditEvent: AuditEvent = {
      id: this.dependencies.nextId("audit"),
      entityType: "EmployerProgrammeMappingVersion",
      entityId: saved.id,
      action: "PROGRAMME_MAPPING_DRAFT_SAVED",
      actor: clone(actor),
      occurredAt,
      remarks,
    };

    if (index === -1) {
      this.programmeMappings.push(saved);
    } else {
      this.programmeMappings[index] = saved;
    }
    this.auditEvents.push(auditEvent);
    return clone(saved);
  }

  async listAuditEvents(): Promise<AuditEvent[]> {
    return clone(this.auditEvents);
  }

  async listTransactions(): Promise<PurchaseTransaction[]> {
    return clone(this.transactions);
  }

  async getTransaction(
    id: string,
  ): Promise<PurchaseTransaction | undefined> {
    return clone(
      this.transactions.find((transaction) => transaction.id === id),
    );
  }

  async importTransactions(
    rows: PurchaseTransactionInput[],
    actor: Actor,
  ): Promise<ImportResult> {
    const occurredAt = this.dependencies.now();
    const result = validatePurchaseImport(
      clone(this.transactions),
      clone(rows),
      {
        importedAt: occurredAt,
        idForRow: () => this.dependencies.nextId("purchase-transaction"),
      },
    );
    const acceptedEvents = result.accepted.map<AuditEvent>((transaction) => ({
      id: this.dependencies.nextId("audit"),
      entityType: "PurchaseTransaction",
      entityId: transaction.id,
      action: "PURCHASE_IMPORTED",
      actor: clone(actor),
      occurredAt,
      remarks: `Imported purchase transaction ${transaction.id}`,
    }));
    const quarantineEvents = result.quarantined.map<AuditEvent>((row) => {
      const entityId = this.dependencies.nextId("purchase-import-row");
      return {
        id: this.dependencies.nextId("audit"),
        entityType: "PurchaseImportRow",
        entityId,
        action: "PURCHASE_IMPORT_QUARANTINED",
        actor: clone(actor),
        occurredAt,
        remarks: `Quarantined purchase import row ${row.rowNumber}`,
        metadata: {
          rowNumber: row.rowNumber,
          issueCodes: row.issues.map((foundIssue) => foundIssue.code),
        },
      };
    });

    this.transactions.push(...result.accepted);
    this.quarantinedImports.push(...result.quarantined);
    this.auditEvents.push(...acceptedEvents, ...quarantineEvents);
    return clone(result);
  }

  async listEligibilityDecisions(
    transactionId?: string,
  ): Promise<EligibilityDecision[]> {
    return clone(
      transactionId === undefined
        ? this.eligibilityDecisions
        : this.eligibilityDecisions.filter(
            (decision) => decision.transactionId === transactionId,
          ),
    );
  }

  async getLatestEligibilityDecision(
    transactionId: string,
  ): Promise<EligibilityDecision | undefined> {
    const decisions = this.eligibilityDecisions.filter(
      (decision) => decision.transactionId === transactionId,
    );
    return clone(
      decisions.reduce<EligibilityDecision | undefined>(
        (latest, decision) =>
          latest === undefined || decision.version > latest.version
            ? decision
            : latest,
        undefined,
      ),
    );
  }

  async evaluateTransaction(
    transactionId: string,
    actor: Actor,
  ): Promise<EligibilityDecision> {
    const transaction = this.transactions.find(
      (candidate) => candidate.id === transactionId,
    );
    if (!transaction) {
      throw new Error(`Purchase transaction ${transactionId} was not found`);
    }
    const previousDecision = await this.getLatestEligibilityDecision(
      transactionId,
    );
    const occurredAt = this.dependencies.now();
    const decisionId = this.dependencies.nextId("eligibility-decision");
    const decision = evaluateEligibility({
      transaction: clone(transaction),
      schemes: clone(this.schemes),
      mappings: clone(this.programmeMappings),
      oemDefaults: clone(
        this.oems.find((oem) => oem.id === transaction.oemId)?.defaults,
      ),
      duplicateImeis: this.duplicateValues(
        this.transactions.map((purchase) => purchase.imei),
        this.duplicateImeis,
      ),
      duplicateLeaseIds: this.duplicateValues(
        this.transactions.map((purchase) => purchase.leaseId),
        this.duplicateLeaseIds,
      ),
      existingClaimedImeis: new Set(this.existingClaimedImeis),
      existingClaimedLeaseIds: new Set(this.existingClaimedLeaseIds),
      evaluationDate: occurredAt.slice(0, 10),
      evaluatedAt: occurredAt,
      actor: clone(actor),
      decisionId,
      version: (previousDecision?.version ?? 0) + 1,
      previousDecision,
    });
    const auditEvent: AuditEvent = {
      id: this.dependencies.nextId("audit"),
      entityType: "EligibilityDecision",
      entityId: decision.id,
      action: "ELIGIBILITY_EVALUATED",
      actor: clone(actor),
      occurredAt,
      remarks: `Evaluated transaction ${transaction.id}`,
      metadata: {
        transactionId: transaction.id,
        decisionVersion: decision.version,
        status: decision.status,
      },
    };

    this.eligibilityDecisions.push(decision);
    this.auditEvents.push(auditEvent);
    return clone(decision);
  }

  async listForEntity(
    entityType: AuditEvent["entityType"],
    entityId: string,
  ): Promise<AuditEvent[]> {
    return clone(
      this.auditEvents.filter(
        (event) =>
          event.entityType === entityType && event.entityId === entityId,
      ),
    );
  }

  private async transitionScheme(
    id: string,
    action: "SUBMIT" | "APPROVE",
    actor: Actor,
    remarks: string,
  ): Promise<SchemeVersion> {
    const index = this.schemes.findIndex((scheme) => scheme.id === id);
    const current = this.schemes[index];
    if (!current) {
      throw new Error(`Scheme version ${id} was not found`);
    }

    const occurredAt = this.dependencies.now();
    const updated = transitionMaster(
      clone(current),
      action,
      clone(actor),
      remarks,
      occurredAt,
    );
    const auditEvent: AuditEvent = {
      id: this.dependencies.nextId("audit"),
      entityType: "SchemeVersion",
      entityId: updated.id,
      action:
        action === "SUBMIT" ? "SCHEME_SUBMITTED" : "SCHEME_APPROVED",
      actor: clone(actor),
      occurredAt,
      remarks,
    };

    this.schemes[index] = updated;
    this.auditEvents.push(auditEvent);
    return clone(updated);
  }

  private async transitionProgrammeMapping(
    id: string,
    action: "SUBMIT" | "APPROVE",
    actor: Actor,
    remarks: string,
  ): Promise<EmployerProgrammeMappingVersion> {
    const index = this.programmeMappings.findIndex(
      (mapping) => mapping.id === id,
    );
    const current = this.programmeMappings[index];
    if (!current) {
      throw new Error(`Programme mapping version ${id} was not found`);
    }

    const occurredAt = this.dependencies.now();
    const updated = transitionMaster(
      clone(current),
      action,
      clone(actor),
      remarks,
      occurredAt,
    );
    const auditEvent: AuditEvent = {
      id: this.dependencies.nextId("audit"),
      entityType: "EmployerProgrammeMappingVersion",
      entityId: updated.id,
      action:
        action === "SUBMIT"
          ? "PROGRAMME_MAPPING_SUBMITTED"
          : "PROGRAMME_MAPPING_APPROVED",
      actor: clone(actor),
      occurredAt,
      remarks,
    };

    this.programmeMappings[index] = updated;
    this.auditEvents.push(auditEvent);
    return clone(updated);
  }

  private duplicateValues(
    values: string[],
    configuredDuplicates: string[],
  ): ReadonlySet<string> {
    const counts = new Map<string, number>();
    values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
    const duplicates = new Set(configuredDuplicates);
    counts.forEach((count, value) => {
      if (count > 1) duplicates.add(value);
    });
    return duplicates;
  }
}
