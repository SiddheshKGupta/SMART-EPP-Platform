import {
  assertProgrammeMappingApprovalValid,
  assertMasterMutationAuthorized,
  assertSubventionCommandAuthorized,
  evaluateEligibility,
  issue,
  listMasterRecords,
  masterDependencies,
  programmeMappingScopesOverlap,
  programmeMappingDraftSchema,
  validatePurchaseImport,
  transitionMaster,
  validateSchemeOverlap,
  validateMasterRecord,
  schemeDraftSchema,
  type Actor,
  type AuditEvent,
  type EligibilityDecision,
  type EmployerProgrammeMappingVersion,
  type ImportResult,
  type MasterCatalogue,
  type MasterCommand,
  type MasterKind,
  type MasterRecord,
  type OemConfiguration,
  type PurchaseTransaction,
  type PurchaseTransactionInput,
  type PurchaseImportMasterData,
  type ProgrammeMappingEffectiveWindow,
  type QuarantinedPurchaseImportRow,
  type RepositoryDependencies,
  type SchemeVersion,
  type SchemeEffectiveWindow,
  type SubventionCommandAction,
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
  private masters: MasterCatalogue;
  private oems: OemConfiguration[];
  private schemes: SchemeVersion[];
  private programmeMappings: EmployerProgrammeMappingVersion[];
  private transactions: PurchaseTransaction[];
  private quarantinedImports: QuarantinedPurchaseImportRow[];
  private eligibilityDecisions: EligibilityDecision[];
  private auditEvents: AuditEvent[];
  private actors: Actor[];
  private purchaseImportMasterData: PurchaseImportMasterData;
  private existingClaimedDeviceIdentifiers: string[];
  private existingClaimedLeaseIds: string[];
  private alternativePartnerDeviceIdentifiers: string[];
  private alternativePartnerLeaseIds: string[];
  private duplicateDeviceIdentifiers: string[];
  private duplicateLeaseIds: string[];
  private evaluationQueue: Promise<void> = Promise.resolve();

  constructor(
    seed: SubventionSeed,
    private readonly dependencies: RepositoryDependencies,
  ) {
    const copied = clone(seed);
    this.masters = copied.masters;
    this.oems = copied.oems;
    this.schemes = copied.schemes;
    this.programmeMappings = copied.programmeMappings;
    this.transactions = copied.transactions;
    this.quarantinedImports = copied.quarantinedImports;
    this.eligibilityDecisions = copied.eligibilityDecisions;
    this.auditEvents = copied.auditEvents;
    this.actors = copied.actors;
    this.purchaseImportMasterData = copied.purchaseImportMasterData;
    this.existingClaimedDeviceIdentifiers =
      copied.existingClaimedDeviceIdentifiers;
    this.existingClaimedLeaseIds = copied.existingClaimedLeaseIds;
    this.alternativePartnerDeviceIdentifiers =
      copied.alternativePartnerDeviceIdentifiers;
    this.alternativePartnerLeaseIds = copied.alternativePartnerLeaseIds;
    this.duplicateDeviceIdentifiers = copied.duplicateDeviceIdentifiers;
    this.duplicateLeaseIds = copied.duplicateLeaseIds;
    this.assertSeedIdentitiesUnique();
  }

  async listSchemes(): Promise<SchemeVersion[]> {
    return clone(this.schemes);
  }

  async getSnapshot(): Promise<SubventionSnapshot> {
    return clone({
      masters: this.masters,
      oems: this.oems,
      schemes: this.schemes,
      programmeMappings: this.programmeMappings,
      transactions: this.transactions,
      eligibilityDecisions: this.eligibilityDecisions,
      quarantinedImports: this.quarantinedImports,
      auditEvents: this.auditEvents,
      actors: this.actors,
      purchaseImportMasterData: this.purchaseImportMasterData,
      existingClaimedDeviceIdentifiers:
        this.existingClaimedDeviceIdentifiers,
      existingClaimedLeaseIds: this.existingClaimedLeaseIds,
      alternativePartnerDeviceIdentifiers:
        this.alternativePartnerDeviceIdentifiers,
      alternativePartnerLeaseIds: this.alternativePartnerLeaseIds,
      duplicateDeviceIdentifiers: this.duplicateDeviceIdentifiers,
      duplicateLeaseIds: this.duplicateLeaseIds,
    });
  }

  async listMasters(kind?: MasterKind): Promise<MasterRecord[]> {
    return clone(listMasterRecords(this.masters, kind));
  }

  async saveMasterDraft(
    master: MasterRecord,
    command: MasterCommand,
  ): Promise<MasterRecord> {
    this.assertMasterCommand(command, "SAVE");
    const input = clone(master);
    const current = listMasterRecords(this.masters).find(
      (candidate) => candidate.id === input.id,
    );
    if (current && current.kind !== input.kind) {
      throw new Error("Master discriminator cannot be changed");
    }
    if (current?.status === "INACTIVE") {
      throw new Error("Inactive master records cannot be edited");
    }
    if (input.status !== "ACTIVE") {
      throw new Error("Master drafts must be active");
    }
    const occurredAt = this.dependencies.now();
    const saved: MasterRecord = {
      ...input,
      createdAt: current?.createdAt ?? occurredAt,
      updatedAt: occurredAt,
    };
    const issues = validateMasterRecord(saved, this.masters);
    if (issues.length > 0) throw issues;

    const auditIds = new Set(this.auditEvents.map((event) => event.id));
    const auditEvent: AuditEvent = {
      id: this.nextUniqueId("audit", "AuditEvent", auditIds),
      entityType: "MasterRecord",
      entityId: saved.id,
      action: "MASTER_DRAFT_SAVED",
      actor: clone(command.actor),
      occurredAt,
      remarks: command.reason,
      beforeState: current ? clone(current) : null,
      afterState: clone(saved),
      provenance: {
        source: command.source,
        sourceEntityId: saved.id,
      },
    };

    this.upsertMaster(saved);
    this.auditEvents.push(auditEvent);
    return clone(saved);
  }

  async deactivateMaster(
    id: string,
    command: MasterCommand,
  ): Promise<MasterRecord> {
    this.assertMasterCommand(command, "DEACTIVATE");
    const current = listMasterRecords(this.masters).find(
      (candidate) => candidate.id === id,
    );
    if (!current) throw new Error(`Master record ${id} was not found`);
    if (current.status === "INACTIVE") {
      throw new Error(`Master record ${id} is already inactive`);
    }

    const dependencies = masterDependencies(id, {
      masters: this.masters,
      schemes: this.schemes,
      programmeMappings: this.programmeMappings,
    });
    if (dependencies.length > 0) {
      throw [
        issue({
          code: "MASTER_HAS_ACTIVE_DEPENDENCIES",
          severity: "ERROR",
          entityType: "MasterRecord",
          entityId: id,
          message: `Master record ${id} has ${dependencies.length} active dependency or dependencies.`,
          recoveryAction:
            "Deactivate or replace dependent records before deactivating this master.",
        }),
      ];
    }
    const occurredAt = this.dependencies.now();
    const deactivated: MasterRecord = {
      ...current,
      status: "INACTIVE",
      updatedAt: occurredAt,
    };
    const auditIds = new Set(this.auditEvents.map((event) => event.id));
    const auditEvent: AuditEvent = {
      id: this.nextUniqueId("audit", "AuditEvent", auditIds),
      entityType: "MasterRecord",
      entityId: id,
      action: "MASTER_DEACTIVATED",
      actor: clone(command.actor),
      occurredAt,
      remarks: command.reason,
      beforeState: clone(current),
      afterState: clone(deactivated),
      provenance: {
        source: command.source,
        sourceEntityId: id,
      },
      metadata: { dependencies: [] },
    };

    this.upsertMaster(deactivated);
    this.auditEvents.push(auditEvent);
    return clone(deactivated);
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
    effectiveWindow: SchemeEffectiveWindow,
  ): Promise<SchemeVersion> {
    this.assertCommandActor(actor, "CREATE");
    assertMasterMutationAuthorized(actor, "CREATE");
    const source = this.schemes.find((scheme) => scheme.id === id);
    if (!source) throw new Error(`Scheme version ${id} was not found`);
    if (source.workflowStatus !== "APPROVED") {
      throw new Error("New versions can only derive from an approved scheme");
    }
    if (!remarks.trim()) throw new Error("Remarks are required");
    if (effectiveWindow.effectiveFrom <= source.effectiveTo) {
      throw new Error(
        "Successor scheme effective from must be after the approved source window",
      );
    }

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
      effectiveFrom: effectiveWindow.effectiveFrom,
      effectiveTo: effectiveWindow.effectiveTo,
      supersedesVersionId: source.id,
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
      beforeState: null,
      afterState: clone(draft),
      provenance: {
        source: "SUBVENTION_REPOSITORY_COMMAND",
        sourceEntityId: source.id,
      },
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
    effectiveWindow: ProgrammeMappingEffectiveWindow,
  ): Promise<EmployerProgrammeMappingVersion> {
    this.assertCommandActor(actor, "CREATE");
    assertMasterMutationAuthorized(actor, "CREATE");
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
    if (effectiveWindow.effectiveFrom <= source.effectiveFrom) {
      throw new Error(
        "Successor effective from must be after prior effective from",
      );
    }

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
      effectiveFrom: effectiveWindow.effectiveFrom,
      effectiveTo: effectiveWindow.effectiveTo,
      supersedesVersionId: source.id,
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
      beforeState: null,
      afterState: clone(draft),
      provenance: {
        source: "SUBVENTION_REPOSITORY_COMMAND",
        sourceEntityId: source.id,
      },
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
    this.assertCommandActor(actor, "SAVE");
    assertMasterMutationAuthorized(actor, "SAVE");
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
    if (
      current &&
      current.workflowStatus !== "DRAFT" &&
      current.workflowStatus !== "RETURNED"
    ) {
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
      current?.workflowStatus !== "RETURNED" &&
      (input.checkerUserId !== undefined ||
        input.approvedAt !== undefined)
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
      checkerUserId:
        current?.workflowStatus === "RETURNED"
          ? undefined
          : input.checkerUserId,
      approvedAt:
        current?.workflowStatus === "RETURNED"
          ? undefined
          : input.approvedAt,
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
      beforeState: current ? clone(current) : null,
      afterState: clone(saved),
      provenance: {
        source: "SUBVENTION_REPOSITORY_COMMAND",
        sourceEntityId: saved.id,
      },
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
    this.assertCommandActor(actor, "SAVE");
    assertMasterMutationAuthorized(actor, "SAVE");
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
    if (
      current &&
      current.workflowStatus !== "DRAFT" &&
      current.workflowStatus !== "RETURNED"
    ) {
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
      current?.workflowStatus !== "RETURNED" &&
      (input.checkerUserId !== undefined ||
        input.approvedAt !== undefined)
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
      checkerUserId:
        current?.workflowStatus === "RETURNED"
          ? undefined
          : input.checkerUserId,
      approvedAt:
        current?.workflowStatus === "RETURNED"
          ? undefined
          : input.approvedAt,
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
      beforeState: current ? clone(current) : null,
      afterState: clone(saved),
      provenance: {
        source: "SUBVENTION_REPOSITORY_COMMAND",
        sourceEntityId: saved.id,
      },
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
    this.assertCommandActor(actor, "IMPORT_PURCHASE");
    const occurredAt = this.dependencies.now();
    const usedImportIds = new Set(
      this.quarantinedImports.map((row) => row.importId),
    );
    const importId = this.nextUniqueId(
      "purchase-import",
      "PurchaseImport",
      usedImportIds,
    );
    const transactionIds = new Set(
      this.transactions.map((transaction) => transaction.id),
    );
    const quarantineEntityIds = new Set([
      ...this.quarantinedImports.map((row) => row.id),
      ...this.auditEvents.flatMap((event) =>
        event.entityType === "PurchaseImportRow" ? [event.entityId] : [],
      ),
    ]);
    const result = validatePurchaseImport(
      clone(this.transactions),
      clone(rows),
      {
        importId,
        importedAt: occurredAt,
        importedBy: actor.userId,
        idForRow: () =>
          this.nextUniqueId(
            "purchase-transaction",
            "PurchaseTransaction",
            transactionIds,
          ),
        idForQuarantineRow: () =>
          this.nextUniqueId(
            "purchase-import-row",
            "PurchaseImportRow",
            quarantineEntityIds,
          ),
        masterData: clone(this.purchaseImportMasterData),
        programmeMappings: clone(this.programmeMappings),
        schemes: clone(this.schemes),
        existingClaimedDeviceIdentifiers: new Set(
          this.existingClaimedDeviceIdentifiers,
        ),
        existingClaimedLeaseIds: new Set(this.existingClaimedLeaseIds),
        alternativePartnerDeviceIdentifiers: new Set(
          this.alternativePartnerDeviceIdentifiers,
        ),
        alternativePartnerLeaseIds: new Set(
          this.alternativePartnerLeaseIds,
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
      beforeState: null,
      afterState: clone(transaction),
      provenance: {
        source: "PURCHASE_SOURCE_EVIDENCE",
        sourceEntityId: transaction.id,
        sourceChecksum: transaction.sourceEvidence.sourceChecksum,
        sourceSheetName: transaction.sourceEvidence.sourceSheetName,
        sourceRowNumber: transaction.sourceEvidence.sourceRowNumber,
      },
      metadata: {
        importId,
        sourceChecksum: transaction.sourceEvidence.sourceChecksum,
        sourceSheetName: transaction.sourceEvidence.sourceSheetName,
        sourceRowNumber: transaction.sourceEvidence.sourceRowNumber,
      },
    }));
    const quarantineEvents = result.quarantined.map<AuditEvent>((row) => ({
        id: this.nextUniqueId("audit", "AuditEvent", auditIds),
        entityType: "PurchaseImportRow",
        entityId: row.id,
        action: "PURCHASE_IMPORT_QUARANTINED",
        actor: clone(actor),
        occurredAt,
        remarks: `Quarantined purchase import row ${row.rowNumber}`,
        beforeState: null,
        afterState: clone(row),
        provenance: {
          source: "PURCHASE_SOURCE_EVIDENCE",
          sourceEntityId: row.id,
          sourceChecksum: row.sourceChecksum,
          sourceSheetName: row.sourceSheetName,
          sourceRowNumber: row.sourceRowNumber,
        },
        metadata: {
          importId: row.importId,
          rowNumber: row.rowNumber,
          sourceChecksum: row.sourceChecksum,
          sourceSheetName: row.sourceSheetName,
          sourceRowNumber: row.sourceRowNumber,
          issueCodes: row.issueCodes,
        },
      }));

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
    const evaluation = this.enqueueEvaluation(
      () => {
        this.assertCommandActor(actorCopy, "EVALUATE_ELIGIBILITY");
        return this.evaluateTransactionsNow([transactionId], actorCopy)[0]!;
      },
    );
    return evaluation;
  }

  evaluateTransactions(
    transactionIds: string[],
    actor: Actor,
  ): Promise<EligibilityDecision[]> {
    const idsCopy = clone(transactionIds);
    const actorCopy = clone(actor);
    return this.enqueueEvaluation(
      () => {
        this.assertCommandActor(actorCopy, "EVALUATE_ELIGIBILITY");
        return this.evaluateTransactionsNow(idsCopy, actorCopy);
      },
    );
  }

  private enqueueEvaluation<T>(command: () => T): Promise<T> {
    const evaluation = this.evaluationQueue.then(command);
    this.evaluationQueue = evaluation.then(
      () => undefined,
      () => undefined,
    );
    return evaluation;
  }

  private evaluateTransactionsNow(
    transactionIds: string[],
    actor: Actor,
  ): EligibilityDecision[] {
    const uniqueIds = new Set(transactionIds);
    if (uniqueIds.size !== transactionIds.length) {
      throw new Error("Bulk evaluation transaction IDs must be unique");
    }
    const transactions = transactionIds.map((transactionId) => {
      const transaction = this.transactions.find(
        (candidate) => candidate.id === transactionId,
      );
      if (!transaction) {
        throw new Error(
          `Purchase transaction ${transactionId} was not found`,
        );
      }
      return transaction;
    });

    const occurredAt = this.dependencies.now();
    const decisionIds = new Set(
      this.eligibilityDecisions.map((decision) => decision.id),
    );
    const auditIds = new Set(this.auditEvents.map((event) => event.id));
    const stagedDecisions = clone(this.eligibilityDecisions);
    const decisions: EligibilityDecision[] = [];
    const auditEvents: AuditEvent[] = [];

    transactions.forEach((transaction) => {
      const previousDecision = stagedDecisions
        .filter(
          (decision) => decision.transactionId === transaction.id,
        )
        .reduce<EligibilityDecision | undefined>(
          (latest, decision) =>
            latest === undefined || decision.version > latest.version
              ? decision
              : latest,
          undefined,
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
        duplicateDeviceIdentifiers: this.duplicateValues(
          this.transactions.map((purchase) => purchase.deviceIdentifier),
          this.duplicateDeviceIdentifiers,
        ),
        duplicateLeaseIds: this.duplicateValues(
          this.transactions.map((purchase) => purchase.leaseId),
          this.duplicateLeaseIds,
        ),
        existingClaimedDeviceIdentifiers: new Set(
          this.existingClaimedDeviceIdentifiers,
        ),
        existingClaimedLeaseIds: new Set(this.existingClaimedLeaseIds),
        evaluationDate: occurredAt.slice(0, 10),
        evaluatedAt: occurredAt,
        actor: clone(actor),
        decisionId,
        version: (previousDecision?.version ?? 0) + 1,
        previousDecision,
      });
      const auditEvent: AuditEvent = {
        id: this.nextUniqueId("audit", "AuditEvent", auditIds),
        entityType: "EligibilityDecision",
        entityId: decision.id,
        action: "ELIGIBILITY_EVALUATED",
        actor: clone(actor),
        occurredAt,
        remarks: `Evaluated transaction ${transaction.id}`,
        beforeState: previousDecision ? clone(previousDecision) : null,
        afterState: clone(decision),
        provenance: {
          source: "SUBVENTION_REPOSITORY_COMMAND",
          sourceEntityId: transaction.id,
          sourceChecksum: transaction.sourceEvidence.sourceChecksum,
          sourceSheetName: transaction.sourceEvidence.sourceSheetName,
          sourceRowNumber: transaction.sourceEvidence.sourceRowNumber,
        },
        metadata: {
          transactionId: transaction.id,
          decisionVersion: decision.version,
          status: decision.status,
        },
      };
      decisions.push(decision);
      auditEvents.push(auditEvent);
      stagedDecisions.push(decision);
    });

    this.eligibilityDecisions.push(...decisions);
    this.auditEvents.push(...auditEvents);
    return clone(decisions);
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
    this.assertCommandActor(actor, action);
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
    if (action === "APPROVE") {
      const issues = validateSchemeOverlap(updated, this.schemes);
      if (issues.length > 0) throw issues;
    }
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
      beforeState: clone(current),
      afterState: clone(updated),
      provenance: {
        source: "SUBVENTION_REPOSITORY_COMMAND",
        sourceEntityId: updated.id,
      },
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
    this.assertCommandActor(actor, action);
    const index = this.programmeMappings.findIndex(
      (mapping) => mapping.id === id,
    );
    const current = this.programmeMappings[index];
    if (!current) {
      throw new Error(`Programme mapping version ${id} was not found`);
    }

    const occurredAt = this.dependencies.now();
    let updated = transitionMaster(
      clone(current),
      action,
      clone(actor),
      remarks,
      occurredAt,
    );
    if (action === "APPROVE") {
      assertProgrammeMappingApprovalValid(updated, this.schemes);
      const prior = this.programmeMappings
        .filter(
          (mapping) =>
            mapping.id !== current.id &&
            mapping.mappingId === current.mappingId &&
            mapping.workflowStatus === "APPROVED" &&
            mapping.version < current.version,
        )
        .sort((left, right) => right.version - left.version)[0];
      if (prior && !updated.supersedesVersionId) {
        updated = {
          ...updated,
          supersedesVersionId: prior.id,
        };
      }
      if (updated.supersedesVersionId) {
        const predecessor = this.programmeMappings.find(
          (mapping) => mapping.id === updated.supersedesVersionId,
        );
        if (
          !predecessor ||
          predecessor.workflowStatus !== "APPROVED" ||
          predecessor.mappingId !== updated.mappingId ||
          predecessor.version !== updated.version - 1 ||
          predecessor.id !== prior?.id
        ) {
          throw new Error(
            "Superseded programme mapping version must be the approved immediate predecessor",
          );
        }
      }
      if (prior && updated.effectiveFrom <= prior.effectiveFrom) {
        throw new Error(
          "Successor effective from must be after prior effective from",
        );
      }
      const approvedCandidates = this.programmeMappings
        .filter(
          (mapping) =>
            mapping.id !== updated.id &&
            mapping.id !== updated.supersedesVersionId &&
            mapping.workflowStatus === "APPROVED",
        );
      const conflict = approvedCandidates.find(
        (mapping) =>
          programmeMappingScopesOverlap(mapping, updated, this.schemes),
      );
      if (conflict) {
        throw new Error(
          `Programme mapping effective period overlaps approved mapping ${conflict.id}`,
        );
      }
    }
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
      beforeState: clone(current),
      afterState: clone(updated),
      provenance: {
        source: "SUBVENTION_REPOSITORY_COMMAND",
        sourceEntityId: updated.id,
      },
      metadata: updated.supersedesVersionId
        ? { supersedesVersionId: updated.supersedesVersionId }
        : undefined,
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

  private assertMasterCommand(
    command: MasterCommand,
    action: "SAVE" | "DEACTIVATE",
  ): void {
    if (command.actor.role !== "MASTER_DATA_ADMIN") {
      throw new Error(
        `${command.actor.role} is not authorized to ${action} master data`,
      );
    }
    const configured = this.actors.some(
      (candidate) =>
        candidate.userId === command.actor.userId &&
        candidate.role === command.actor.role,
    );
    if (!configured) {
      throw new Error(`Actor ${command.actor.userId} is not configured`);
    }
    if (!command.reason.trim()) throw new Error("Reason is required");
  }

  private upsertMaster(master: MasterRecord): void {
    const replace = <T extends MasterRecord>(records: T[], value: T) => {
      const index = records.findIndex((record) => record.id === value.id);
      if (index === -1) records.push(value);
      else records[index] = value;
    };

    switch (master.kind) {
      case "OEM":
        replace(this.masters.oems, master);
        break;
      case "DISTRIBUTOR":
        replace(this.masters.distributors, master);
        break;
      case "RESELLER":
        replace(this.masters.resellers, master);
        break;
      case "PRODUCT":
        replace(this.masters.products, master);
        break;
      case "EMPLOYER":
        replace(this.masters.employers, master);
        break;
    }
  }

  private assertCommandActor(
    actor: Actor,
    action: SubventionCommandAction,
  ): void {
    try {
      assertSubventionCommandAuthorized(actor, action);
    } catch {
      if (
        action === "CREATE" ||
        action === "SAVE" ||
        action === "SUBMIT" ||
        action === "APPROVE" ||
        action === "RETURN" ||
        action === "REJECT"
      ) {
        throw new Error(
          `${actor.role} is not authorized to ${action} master data`,
        );
      }
      throw new Error(`${actor.role} is not authorized to ${action}`);
    }
    const configured = this.actors.some(
      (candidate) =>
        candidate.userId === actor.userId && candidate.role === actor.role,
    );
    if (!configured) {
      throw new Error(`Actor ${actor.userId} is not configured`);
    }
  }

  private assertSeedIdentitiesUnique(): void {
    const masters = listMasterRecords(this.masters);
    this.assertUniqueIdentity(
      masters,
      (master) => master.id,
      (master) => master.id,
      "MasterRecord ID",
    );
    this.assertUniqueIdentity(
      masters,
      (master) => JSON.stringify([
        master.kind,
        master.code.trim().toLocaleUpperCase("en-IN"),
      ]),
      (master) => `${master.kind}:${master.code}`,
      "MasterRecord code",
    );
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
