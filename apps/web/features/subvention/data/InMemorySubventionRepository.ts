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
  private evaluationQueue: Promise<void> = Promise.resolve();

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
    this.assertSeedIdentitiesUnique();
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

  async returnScheme(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<SchemeVersion> {
    return this.transitionScheme(id, "RETURN", actor, remarks);
  }

  async rejectScheme(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<SchemeVersion> {
    return this.transitionScheme(id, "REJECT", actor, remarks);
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

  async returnProgrammeMapping(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<EmployerProgrammeMappingVersion> {
    return this.transitionProgrammeMapping(id, "RETURN", actor, remarks);
  }

  async rejectProgrammeMapping(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<EmployerProgrammeMappingVersion> {
    return this.transitionProgrammeMapping(id, "REJECT", actor, remarks);
  }

  async createNextSchemeVersion(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<SchemeVersion> {
    const source = this.schemes.find((scheme) => scheme.id === id);
    if (!source) throw new Error(`Scheme version ${id} was not found`);
    if (source.workflowStatus !== "APPROVED") {
      throw new Error("New versions can only derive from an approved scheme");
    }
    if (!remarks.trim()) throw new Error("Remarks are required");

    const usedSchemeIds = new Set(this.schemes.map((scheme) => scheme.id));
    const usedAuditIds = new Set(this.auditEvents.map((event) => event.id));
    const createdAt = this.dependencies.now();
    const draft: SchemeVersion = {
      ...clone(source),
      id: this.nextUniqueId(
        "scheme-version",
        "SchemeVersion",
        usedSchemeIds,
      ),
      version:
        Math.max(
          ...this.schemes
            .filter((scheme) => scheme.schemeId === source.schemeId)
            .map((scheme) => scheme.version),
        ) + 1,
      workflowStatus: "DRAFT",
      makerUserId: actor.userId,
      checkerUserId: undefined,
      approvedAt: undefined,
      createdAt,
    };
    schemeDraftSchema.parse(draft);
    const auditEvent: AuditEvent = {
      id: this.nextUniqueId("audit", "AuditEvent", usedAuditIds),
      entityType: "SchemeVersion",
      entityId: draft.id,
      action: "SCHEME_DRAFT_SAVED",
      actor: clone(actor),
      occurredAt: createdAt,
      remarks,
      metadata: { derivedFromVersionId: source.id },
    };

    this.schemes.push(draft);
    this.auditEvents.push(auditEvent);
    return clone(draft);
  }

  async createNextProgrammeMappingVersion(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<EmployerProgrammeMappingVersion> {
    const source = this.programmeMappings.find((mapping) => mapping.id === id);
    if (!source) {
      throw new Error(`Programme mapping version ${id} was not found`);
    }
    if (source.workflowStatus !== "APPROVED") {
      throw new Error(
        "New versions can only derive from an approved programme mapping",
      );
    }
    if (!remarks.trim()) throw new Error("Remarks are required");

    const usedMappingIds = new Set(
      this.programmeMappings.map((mapping) => mapping.id),
    );
    const usedAuditIds = new Set(this.auditEvents.map((event) => event.id));
    const createdAt = this.dependencies.now();
    const draft: EmployerProgrammeMappingVersion = {
      ...clone(source),
      id: this.nextUniqueId(
        "programme-mapping-version",
        "EmployerProgrammeMappingVersion",
        usedMappingIds,
      ),
      version:
        Math.max(
          ...this.programmeMappings
            .filter((mapping) => mapping.mappingId === source.mappingId)
            .map((mapping) => mapping.version),
        ) + 1,
      workflowStatus: "DRAFT",
      makerUserId: actor.userId,
      checkerUserId: undefined,
      approvedAt: undefined,
      createdAt,
    };
    programmeMappingDraftSchema.parse(draft);
    const auditEvent: AuditEvent = {
      id: this.nextUniqueId("audit", "AuditEvent", usedAuditIds),
      entityType: "EmployerProgrammeMappingVersion",
      entityId: draft.id,
      action: "PROGRAMME_MAPPING_DRAFT_SAVED",
      actor: clone(actor),
      occurredAt: createdAt,
      remarks,
      metadata: { derivedFromVersionId: source.id },
    };

    this.programmeMappings.push(draft);
    this.auditEvents.push(auditEvent);
    return clone(draft);
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

    if (
      current &&
      (input.schemeId !== current.schemeId ||
        input.version !== current.version)
    ) {
      throw new Error("Scheme draft identity cannot be changed");
    }
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
    if (!current) {
      const logicalVersions = this.schemes.filter(
        (candidate) => candidate.schemeId === input.schemeId,
      );
      const expectedVersion =
        Math.max(0, ...logicalVersions.map((version) => version.version)) + 1;
      if (input.version !== expectedVersion) {
        throw new Error(
          `Scheme version must be exactly ${expectedVersion}`,
        );
      }
    }
    if (!remarks.trim()) {
      throw new Error("Remarks are required");
    }
    schemeDraftSchema.parse(input);

    const saved: SchemeVersion = {
      ...input,
      makerUserId: actor.userId,
    };
    const auditIds = new Set(this.auditEvents.map((event) => event.id));
    const auditEvent: AuditEvent = {
      id: this.nextUniqueId("audit", "AuditEvent", auditIds),
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

    if (
      current &&
      (input.mappingId !== current.mappingId ||
        input.version !== current.version)
    ) {
      throw new Error("Programme mapping draft identity cannot be changed");
    }
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
    if (!current) {
      const logicalVersions = this.programmeMappings.filter(
        (candidate) => candidate.mappingId === input.mappingId,
      );
      const expectedVersion =
        Math.max(0, ...logicalVersions.map((version) => version.version)) + 1;
      if (input.version !== expectedVersion) {
        throw new Error(
          `Programme mapping version must be exactly ${expectedVersion}`,
        );
      }
    }
    if (!remarks.trim()) {
      throw new Error("Remarks are required");
    }
    programmeMappingDraftSchema.parse(input);

    const saved: EmployerProgrammeMappingVersion = {
      ...input,
      makerUserId: actor.userId,
    };
    const auditIds = new Set(this.auditEvents.map((event) => event.id));
    const auditEvent: AuditEvent = {
      id: this.nextUniqueId("audit", "AuditEvent", auditIds),
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
    const transactionIds = new Set(
      this.transactions.map((transaction) => transaction.id),
    );
    const result = validatePurchaseImport(
      clone(this.transactions),
      clone(rows),
      {
        importedAt: occurredAt,
        idForRow: () =>
          this.nextUniqueId(
            "purchase-transaction",
            "PurchaseTransaction",
            transactionIds,
          ),
      },
    );
    const auditIds = new Set(this.auditEvents.map((event) => event.id));
    const acceptedEvents = result.accepted.map<AuditEvent>((transaction) => ({
      id: this.nextUniqueId("audit", "AuditEvent", auditIds),
      entityType: "PurchaseTransaction",
      entityId: transaction.id,
      action: "PURCHASE_IMPORTED",
      actor: clone(actor),
      occurredAt,
      remarks: `Imported purchase transaction ${transaction.id}`,
    }));
    const quarantineEntityIds = new Set(
      this.auditEvents.flatMap((event) =>
        event.entityType === "PurchaseImportRow" ? [event.entityId] : [],
      ),
    );
    const quarantineEvents = result.quarantined.map<AuditEvent>((row) => {
      const entityId = this.nextUniqueId(
        "purchase-import-row",
        "PurchaseImportRow",
        quarantineEntityIds,
      );
      return {
        id: this.nextUniqueId("audit", "AuditEvent", auditIds),
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

  evaluateTransaction(
    transactionId: string,
    actor: Actor,
  ): Promise<EligibilityDecision> {
    const actorCopy = clone(actor);
    const evaluation = this.evaluationQueue.then(() =>
      this.evaluateTransactionNow(transactionId, actorCopy),
    );
    this.evaluationQueue = evaluation.then(
      () => undefined,
      () => undefined,
    );
    return evaluation;
  }

  private async evaluateTransactionNow(
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
    const decisionIds = new Set(
      this.eligibilityDecisions.map((decision) => decision.id),
    );
    const decisionId = this.nextUniqueId(
      "eligibility-decision",
      "EligibilityDecision",
      decisionIds,
    );
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
    const auditIds = new Set(this.auditEvents.map((event) => event.id));
    const auditEvent: AuditEvent = {
      id: this.nextUniqueId("audit", "AuditEvent", auditIds),
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
    action: "SUBMIT" | "APPROVE" | "RETURN" | "REJECT",
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
    const auditIds = new Set(this.auditEvents.map((event) => event.id));
    const auditAction: AuditEvent["action"] = ({
      SUBMIT: "SCHEME_SUBMITTED",
      APPROVE: "SCHEME_APPROVED",
      RETURN: "SCHEME_RETURNED",
      REJECT: "SCHEME_REJECTED",
    } as const)[action];
    const auditEvent: AuditEvent = {
      id: this.nextUniqueId("audit", "AuditEvent", auditIds),
      entityType: "SchemeVersion",
      entityId: updated.id,
      action: auditAction,
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
    action: "SUBMIT" | "APPROVE" | "RETURN" | "REJECT",
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
    const auditIds = new Set(this.auditEvents.map((event) => event.id));
    const auditAction: AuditEvent["action"] = ({
      SUBMIT: "PROGRAMME_MAPPING_SUBMITTED",
      APPROVE: "PROGRAMME_MAPPING_APPROVED",
      RETURN: "PROGRAMME_MAPPING_RETURNED",
      REJECT: "PROGRAMME_MAPPING_REJECTED",
    } as const)[action];
    const auditEvent: AuditEvent = {
      id: this.nextUniqueId("audit", "AuditEvent", auditIds),
      entityType: "EmployerProgrammeMappingVersion",
      entityId: updated.id,
      action: auditAction,
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

  private assertSeedIdentitiesUnique(): void {
    this.assertUniqueIdentity(
      this.oems,
      (oem) => oem.id,
      (oem) => oem.id,
      "OemConfiguration ID",
    );
    this.assertUniqueIdentity(
      this.actors,
      (actor) => actor.userId,
      (actor) => actor.userId,
      "Actor user ID",
    );
    this.assertUniqueIdentity(
      this.schemes,
      (scheme) => scheme.id,
      (scheme) => scheme.id,
      "SchemeVersion ID",
    );
    this.assertUniqueIdentity(
      this.schemes,
      (scheme) => JSON.stringify([scheme.schemeId, scheme.version]),
      (scheme) => `${scheme.schemeId}:${scheme.version}`,
      "SchemeVersion logical version",
    );
    this.assertUniqueIdentity(
      this.programmeMappings,
      (mapping) => mapping.id,
      (mapping) => mapping.id,
      "EmployerProgrammeMappingVersion ID",
    );
    this.assertUniqueIdentity(
      this.programmeMappings,
      (mapping) => JSON.stringify([mapping.mappingId, mapping.version]),
      (mapping) => `${mapping.mappingId}:${mapping.version}`,
      "EmployerProgrammeMappingVersion logical version",
    );
    this.assertUniqueIdentity(
      this.transactions,
      (transaction) => transaction.id,
      (transaction) => transaction.id,
      "PurchaseTransaction ID",
    );
    this.assertUniqueIdentity(
      this.eligibilityDecisions,
      (decision) => decision.id,
      (decision) => decision.id,
      "EligibilityDecision ID",
    );
    this.assertUniqueIdentity(
      this.eligibilityDecisions,
      (decision) =>
        JSON.stringify([decision.transactionId, decision.version]),
      (decision) => `${decision.transactionId}:${decision.version}`,
      "EligibilityDecision logical version",
    );
    this.assertUniqueIdentity(
      this.auditEvents,
      (event) => event.id,
      (event) => event.id,
      "AuditEvent ID",
    );
    this.assertUniqueIdentity(
      this.auditEvents.filter(
        (event) => event.entityType === "PurchaseImportRow",
      ),
      (event) => event.entityId,
      (event) => event.entityId,
      "PurchaseImportRow correlated identity",
    );
  }

  private nextUniqueId(
    prefix: string,
    label: string,
    usedIds: Set<string>,
  ): string {
    const id = this.dependencies.nextId(prefix);
    if (usedIds.has(id)) {
      throw new Error(`Generated ${label} ID ${id} already exists`);
    }
    usedIds.add(id);
    return id;
  }

  private assertUniqueIdentity<T>(
    values: T[],
    keyFor: (value: T) => string,
    displayFor: (value: T) => string,
    label: string,
  ): void {
    const seen = new Set<string>();
    values.forEach((value) => {
      const key = keyFor(value);
      if (seen.has(key)) {
        throw new Error(`Duplicate ${label} ${displayFor(value)}`);
      }
      seen.add(key);
    });
  }
}
