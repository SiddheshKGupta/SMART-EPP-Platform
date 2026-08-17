import {
  assertProgrammeMappingApprovalValid,
  approveClaimBatch,
  addClaimReconciliationAdjustment,
  assertMasterMutationAuthorized,
  assertSubventionCommandAuthorized,
  evaluateEligibility,
  closeClaimBatch,
  createClaimBatch,
  issue,
  listMasterRecords,
  masterDependencies,
  transitionMasterRecord,
  programmeMappingScopesOverlap,
  recordClaimResponse,
  recordClaimSubmission,
  programmeMappingDraftSchema,
  validatePurchaseImport,
  validateEvidenceLink,
  transitionMaster,
  transitionClaimFinancials,
  submitClaimBatch,
  validateSchemeOverlap,
  validateMasterRecord,
  validateMasterVersionApproval,
  schemeDraftSchema,
  type Actor,
  type AuditEvent,
  type ClaimBatch,
  type ClaimAccountingInput,
  type ClaimAdjustmentInput,
  type ClaimCollectionInput,
  type ClaimEvidenceSnapshot,
  type ClaimInvoiceInput,
  type ClaimLineResponse,
  type EligibilityDecision,
  type EWayBillEvidence,
  type EmployerProgrammeMappingVersion,
  type ImportResult,
  type MasterCatalogue,
  type MasterCommand,
  type MasterKind,
  type MasterEffectiveWindow,
  type MasterRecord,
  type OemConfiguration,
  type PurchaseTransaction,
  type PurchaseOrderEvidence,
  type PurchaseTransactionInput,
  type PurchaseImportMasterData,
  type ProgrammeMappingEffectiveWindow,
  type QuarantinedPurchaseImportRow,
  type RepositoryDependencies,
  type RuleResult,
  type SchemeVersion,
  type SchemeEffectiveWindow,
  type SubventionCommandAction,
  type SubventionRepository,
  type SubventionSeed,
  type SubventionSnapshot,
  type TransactionEvidenceLink,
  type VendorInvoiceEvidence,
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
  private claimBatches: ClaimBatch[];
  private purchaseOrders: PurchaseOrderEvidence[];
  private vendorInvoices: VendorInvoiceEvidence[];
  private eWayBills: EWayBillEvidence[];
  private evidenceLinks: TransactionEvidenceLink[];
  private auditEvents: AuditEvent[];
  private actors: Actor[];
  private purchaseImportMasterData: PurchaseImportMasterData;
  private existingClaimedDeviceIdentifiers: string[];
  private existingClaimedLeaseIds: string[];
  private alternativePartnerDeviceIdentifiers: string[];
  private alternativePartnerLeaseIds: string[];
  private duplicateDeviceIdentifiers: string[];
  private duplicateLeaseIds: string[];
  private readonly eligibilityInvalidatedTransactions = new Set<string>();
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
    this.claimBatches = copied.claimBatches;
    this.purchaseOrders = copied.purchaseOrders ?? [];
    this.vendorInvoices = copied.vendorInvoices ?? [];
    this.eWayBills = copied.eWayBills ?? [];
    this.evidenceLinks = copied.evidenceLinks ?? [];
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
      eligibilityDecisions: this.activeEligibilityDecisions(),
      claimBatches: this.claimBatches,
      purchaseOrders: this.purchaseOrders,
      vendorInvoices: this.vendorInvoices,
      eWayBills: this.eWayBills,
      evidenceLinks: this.evidenceLinks,
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

  async listPurchaseOrders(): Promise<PurchaseOrderEvidence[]> {
    return clone(this.purchaseOrders);
  }

  async listVendorInvoices(): Promise<VendorInvoiceEvidence[]> {
    return clone(this.vendorInvoices);
  }

  async listEWayBills(): Promise<EWayBillEvidence[]> {
    return clone(this.eWayBills);
  }

  async listEvidenceLinks(transactionId?: string): Promise<TransactionEvidenceLink[]> {
    return clone(
      transactionId
        ? this.evidenceLinks.filter((link) => link.transactionId === transactionId)
        : this.evidenceLinks,
    );
  }

  private activeEligibilityDecisions(): EligibilityDecision[] {
    return this.eligibilityDecisions.filter(
      (decision) => !this.eligibilityInvalidatedTransactions.has(decision.transactionId),
    );
  }

  private invalidateEligibilityForEvidenceChange(
    transactionId: string,
    evidenceLinkKey: string,
    sourceChecksum: string,
    actor: Actor,
    remarks: string,
  ): void {
    const previousDecision = this.eligibilityDecisions
      .filter((decision) => decision.transactionId === transactionId)
      .reduce<EligibilityDecision | undefined>(
        (latest, decision) => latest === undefined || decision.version > latest.version
          ? decision
          : latest,
        undefined,
      );
    if (!previousDecision || this.eligibilityInvalidatedTransactions.has(transactionId)) {
      return;
    }

    this.eligibilityInvalidatedTransactions.add(transactionId);
    this.auditEvents.push({
      id: this.nextUniqueId(
        "audit",
        "AuditEvent",
        new Set(this.auditEvents.map((event) => event.id)),
      ),
      entityType: "EligibilityDecision",
      entityId: previousDecision.id,
      action: "ELIGIBILITY_INVALIDATED",
      actor: clone(actor),
      occurredAt: this.dependencies.now(),
      remarks: `Evidence changed; re-evaluation required. ${remarks}`,
      beforeState: clone(previousDecision),
      afterState: null,
      provenance: {
        source: "CONTROLLED_IMPORT",
        sourceEntityId: evidenceLinkKey,
        sourceChecksum,
      },
      metadata: {
        transactionId,
        invalidatedDecisionId: previousDecision.id,
        invalidatedDecisionVersion: previousDecision.version,
        evidenceLinkKey,
      },
    });
  }

  async saveEvidenceLink(
    link: TransactionEvidenceLink,
    actor: Actor,
    remarks: string,
  ): Promise<TransactionEvidenceLink> {
    this.assertCommandActor(actor, "IMPORT_PURCHASE");
    if (!remarks.trim()) throw new Error("Evidence-link remarks are required");
    const transaction = this.transactions.find((candidate) => candidate.id === link.transactionId);
    if (!transaction) {
      throw new Error(`Purchase transaction ${link.transactionId} was not found`);
    }
    const key = `${link.transactionId}|${link.invoice.id}|${link.invoiceLineId}`;
    const currentIndex = this.evidenceLinks.findIndex(
      (candidate) => `${candidate.transactionId}|${candidate.invoice.id}|${candidate.invoiceLineId}` === key,
    );
    const before = currentIndex >= 0 ? this.evidenceLinks[currentIndex]! : null;
    const saved = clone(link);
    const evidenceMateriallyChanged = before === null ||
      JSON.stringify(before) !== JSON.stringify(saved);
    const poIndex = this.purchaseOrders.findIndex((candidate) => candidate.id === saved.purchaseOrder.id);
    const invoiceIndex = this.vendorInvoices.findIndex((candidate) => candidate.id === saved.invoice.id);
    if (poIndex >= 0) this.purchaseOrders[poIndex] = clone(saved.purchaseOrder);
    else this.purchaseOrders.push(clone(saved.purchaseOrder));
    if (invoiceIndex >= 0) this.vendorInvoices[invoiceIndex] = clone(saved.invoice);
    else this.vendorInvoices.push(clone(saved.invoice));
    if (saved.eWayBill) {
      const eWayIndex = this.eWayBills.findIndex((candidate) => candidate.id === saved.eWayBill?.id);
      if (eWayIndex >= 0) this.eWayBills[eWayIndex] = clone(saved.eWayBill);
      else this.eWayBills.push(clone(saved.eWayBill));
    }
    if (currentIndex >= 0) this.evidenceLinks[currentIndex] = saved;
    else this.evidenceLinks.push(saved);
    this.auditEvents.push({
      id: this.nextUniqueId("audit", "AuditEvent", new Set(this.auditEvents.map((event) => event.id))),
      entityType: "TransactionEvidenceLink",
      entityId: key,
      action: "TRANSACTION_EVIDENCE_LINKED",
      actor: clone(actor),
      occurredAt: this.dependencies.now(),
      remarks,
      beforeState: before ? clone(before) : null,
      afterState: clone(saved),
      provenance: {
        source: "CONTROLLED_IMPORT",
        sourceEntityId: saved.invoice.id,
        sourceChecksum: saved.invoice.sourceChecksum,
      },
      metadata: { validation: validateEvidenceLink(saved, transaction) },
    });
    if (evidenceMateriallyChanged) {
      this.invalidateEligibilityForEvidenceChange(
        saved.transactionId,
        key,
        saved.invoice.sourceChecksum,
        actor,
        remarks,
      );
    }
    return clone(saved);
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
    if (
      current &&
      current.workflowStatus !== "DRAFT" &&
      current.workflowStatus !== "RETURNED"
    ) {
      if (current.workflowStatus === "APPROVED") {
        throw new Error("Approved master version is immutable");
      }
      throw new Error(`Master version cannot be edited from ${current.workflowStatus}`);
    }
    if (input.workflowStatus !== "DRAFT" && input.workflowStatus !== "RETURNED") {
      throw new Error("Only draft or returned master versions can be saved");
    }
    if (current && (input.logicalId !== current.logicalId || input.version !== current.version)) {
      throw new Error("Master version identity cannot be changed");
    }
    if (!current && (input.logicalId !== input.id || input.version !== 1)) {
      throw new Error("New master records must start at logical version 1");
    }
    const occurredAt = this.dependencies.now();
    const saved: MasterRecord = {
      ...input,
      workflowStatus: "DRAFT",
      makerUserId: current?.makerUserId ?? command.actor.userId,
      checkerUserId: undefined,
      approvedAt: undefined,
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

  async createNextMasterVersion(
    id: string,
    command: MasterCommand,
    effectiveWindow: MasterEffectiveWindow,
  ): Promise<MasterRecord> {
    this.assertMasterCommand(command, "CREATE");
    const source = this.findMaster(id);
    if (source.workflowStatus !== "APPROVED") {
      throw new Error("Successors can only derive from an approved master version");
    }
    if (
      effectiveWindow.effectiveFrom <= source.effectiveTo ||
      effectiveWindow.effectiveFrom > effectiveWindow.effectiveTo
    ) {
      throw new Error("Successor effective window must follow the approved source window");
    }
    const occurredAt = this.dependencies.now();
    const versions = listMasterRecords(this.masters).filter(
      (record) => record.logicalId === source.logicalId,
    );
    const draft: MasterRecord = {
      ...clone(source),
      id: this.nextUniqueId(
        "master-version",
        "MasterRecord",
        new Set(listMasterRecords(this.masters).map((record) => record.id)),
      ),
      version: Math.max(...versions.map((record) => record.version)) + 1,
      workflowStatus: "DRAFT",
      effectiveFrom: effectiveWindow.effectiveFrom,
      effectiveTo: effectiveWindow.effectiveTo,
      makerUserId: command.actor.userId,
      checkerUserId: undefined,
      approvedAt: undefined,
      supersedesVersionId: source.id,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    };
    const issues = validateMasterRecord(draft, this.masters);
    if (issues.length > 0) throw issues;
    const auditEvent = this.buildMasterAudit(
      draft,
      "MASTER_SUCCESSOR_CREATED",
      command,
      null,
      { derivedFromVersionId: source.id },
    );
    this.upsertMaster(draft);
    this.auditEvents.push(auditEvent);
    return clone(draft);
  }

  async submitMaster(id: string, command: MasterCommand): Promise<MasterRecord> {
    return this.transitionReferenceMaster(id, "SUBMIT", command);
  }

  async approveMaster(id: string, command: MasterCommand): Promise<MasterRecord> {
    return this.transitionReferenceMaster(id, "APPROVE", command);
  }

  async returnMaster(id: string, command: MasterCommand): Promise<MasterRecord> {
    return this.transitionReferenceMaster(id, "RETURN", command);
  }

  async rejectMaster(id: string, command: MasterCommand): Promise<MasterRecord> {
    return this.transitionReferenceMaster(id, "REJECT", command);
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
    const deactivated = transitionMasterRecord(
      current,
      "DEACTIVATE",
      command.actor,
      this.dependencies.now(),
    );
    const auditEvent = this.buildMasterAudit(
      deactivated,
      "MASTER_DEACTIVATED",
      command,
      current,
      { dependencies: [] },
    );
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
    const active = this.activeEligibilityDecisions();
    return clone(
      transactionId === undefined
        ? active
        : active.filter(
            (decision) => decision.transactionId === transactionId,
          ),
    );
  }

  async getLatestEligibilityDecision(
    transactionId: string,
  ): Promise<EligibilityDecision | undefined> {
    if (this.eligibilityInvalidatedTransactions.has(transactionId)) {
      return undefined;
    }
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
      const commercialDecision = evaluateEligibility({
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
      const decision = this.applyEvidenceGate(commercialDecision);
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
    decisions.forEach((decision) => {
      this.eligibilityInvalidatedTransactions.delete(decision.transactionId);
    });
    this.auditEvents.push(...auditEvents);
    return clone(decisions);
  }

  private applyEvidenceGate(decision: EligibilityDecision): EligibilityDecision {
    const links = this.evidenceLinks.filter(
      (candidate) => candidate.transactionId === decision.transactionId,
    );
    const link = links.find((candidate) => {
      const line = candidate.invoice.lines.find(
        (invoiceLine) => invoiceLine.id === candidate.invoiceLineId,
      );
      return line?.classification === "ELIGIBLE_DEVICE";
    });
    if (!link) {
      return {
        ...decision,
        status: "INELIGIBLE",
        ruleResults: [
          ...decision.ruleResults,
          {
            code: "TRANSACTION_EVIDENCE_MISSING",
            label: "Purchase evidence",
            outcome: "FAIL",
            reason: "No physical-device PO and invoice evidence link is available.",
            recoveryAction: "Link the approved PO, recognised invoice and device identifier, then re-evaluate.",
          },
        ],
      };
    }
    const transaction = this.transactions.find(
      (candidate) => candidate.id === decision.transactionId,
    );
    const evidence = validateEvidenceLink(link, transaction);
    const evidenceRules: RuleResult[] = evidence.rules.map((rule) =>
      rule.outcome === "PASS"
        ? {
            code: rule.code,
            label: rule.label,
            outcome: "PASS",
            reason: rule.reason,
            sourceEntityType: "TransactionEvidenceLink",
            sourceEntityId: `${link.transactionId}|${link.invoice.id}|${link.invoiceLineId}`,
          }
        : {
            code: rule.code,
            label: rule.label,
            outcome: rule.outcome,
            reason: rule.reason,
            recoveryAction: rule.recoveryAction ?? "Resolve the evidence exception, then re-evaluate.",
            sourceEntityType: "TransactionEvidenceLink",
            sourceEntityId: `${link.transactionId}|${link.invoice.id}|${link.invoiceLineId}`,
          },
    );
    return {
      ...decision,
      status:
        evidence.decision === "PASS"
          ? decision.status
          : evidence.decision === "REVIEW"
            ? "EXCEPTION_REVIEW"
            : "INELIGIBLE",
      ruleResults: [...decision.ruleResults, ...evidenceRules],
    };
  }

  async listClaimBatches(): Promise<ClaimBatch[]> {
    return clone(this.claimBatches);
  }

  async createClaimBatch(
    transactionIds: string[],
    settlementCounterpartyId: string,
    actor: Actor,
    remarks: string,
  ): Promise<ClaimBatch> {
    this.assertClaimActor(actor, ["SALES_OPS_MAKER"], remarks);
    const occurredAt = this.dependencies.now();
    const id = this.nextUniqueId(
      "claim-batch",
      "ClaimBatch",
      new Set(this.claimBatches.map((batch) => batch.id)),
    );
    const evidenceSnapshots = Object.fromEntries(transactionIds.map((transactionId): [string, ClaimEvidenceSnapshot] => {
      if (this.eligibilityInvalidatedTransactions.has(transactionId)) {
        throw new Error(`CLAIM_PERSISTED_ELIGIBILITY_REQUIRED:${transactionId}`);
      }
      const transaction = this.transactions.find((row) => row.id === transactionId);
      const link = this.evidenceLinks.find((candidate) => candidate.transactionId === transactionId && candidate.invoice.lines.some((line) => line.id === candidate.invoiceLineId && line.classification === "ELIGIBLE_DEVICE"));
      if (!transaction || !link) throw new Error(`CLAIM_CURRENT_EVIDENCE_REQUIRED:${transactionId}`);
      const validation = validateEvidenceLink(link, transaction);
      if (validation.decision !== "PASS") throw new Error(`CLAIM_CURRENT_EVIDENCE_REQUIRED:${transactionId}`);
      return [transactionId, {
        evidenceLinkIdentity: `${link.transactionId}|${link.invoice.id}|${link.invoiceLineId}|${link.linkedAt}`,
        evidenceLinkedAt: link.linkedAt,
        invoiceId: link.invoice.id,
        invoiceSourceChecksum: link.invoice.sourceChecksum,
        invoiceTemplateVersionId: link.invoice.templateVersionId,
        purchaseOrderId: link.purchaseOrder.id,
        eWayBillId: link.eWayBill?.id,
        eWayBillStatus: !link.invoice.requiresEWayBill ? "NOT_REQUIRED" : link.eWayBill?.partBPresent && link.eWayBill.movementValid ? "VALID_MOVEMENT" : "PART_A_ONLY",
        validation: {
          decision: validation.decision,
          capturedAt: occurredAt,
          rules: validation.rules.map((rule) => ({ code: rule.code, outcome: rule.outcome })),
        },
      }];
    }));
    const created = createClaimBatch({
      id,
      reference: `CLM-${occurredAt.slice(0, 7).replace("-", "")}-${String(this.claimBatches.length + 1).padStart(3, "0")}`,
      transactionIds,
      settlementCounterpartyId,
      transactions: this.transactions,
      eligibilityDecisions: this.activeEligibilityDecisions(),
      evidenceSnapshots,
      existingBatches: this.claimBatches,
      actor,
      occurredAt,
    });
    this.claimBatches.push(created);
    this.auditClaimMutation(null, created, "CLAIM_BATCH_CREATED", actor, remarks);
    return clone(created);
  }

  async submitClaimBatch(id: string, actor: Actor, remarks: string): Promise<ClaimBatch> {
    this.assertClaimActor(actor, ["SALES_OPS_MAKER"], remarks);
    return this.mutateClaim(id, actor, remarks, "CLAIM_BATCH_SUBMITTED", (current) =>
      submitClaimBatch(current, actor, this.dependencies.now()),
    );
  }

  async approveClaimBatch(id: string, actor: Actor, remarks: string): Promise<ClaimBatch> {
    this.assertClaimActor(actor, ["BUSINESS_HEAD_CHECKER"], remarks);
    return this.mutateClaim(id, actor, remarks, "CLAIM_BATCH_APPROVED", (current) =>
      approveClaimBatch(current, actor, this.dependencies.now()),
    );
  }

  async recordClaimSubmission(id: string, reference: string, actor: Actor, remarks: string): Promise<ClaimBatch> {
    this.assertClaimActor(actor, ["SALES_OPS_MAKER"], remarks);
    return this.mutateClaim(id, actor, remarks, "CLAIM_SUBMITTED_TO_COUNTERPARTY", (current) =>
      recordClaimSubmission(current, reference, this.dependencies.now()),
    );
  }

  async recordClaimResponse(id: string, responses: ClaimLineResponse[], actor: Actor, remarks: string): Promise<ClaimBatch> {
    this.assertClaimActor(actor, ["SALES_OPS_MAKER", "BUSINESS_HEAD_CHECKER"], remarks);
    return this.mutateClaim(id, actor, remarks, "CLAIM_RESPONSE_RECORDED", (current) =>
      recordClaimResponse(current, responses, this.dependencies.now()),
    );
  }

  async recordClaimInvoice(id: string, input: ClaimInvoiceInput, actor: Actor, remarks: string): Promise<ClaimBatch> {
    this.assertClaimActor(actor, ["FINANCE_BILLING"], remarks);
    if (!input.reference.trim()) throw new Error("CLAIM_INVOICE_REFERENCE_REQUIRED");
    return this.mutateClaim(id, actor, remarks, "CLAIM_INVOICE_RECORDED", (current) =>
      transitionClaimFinancials(current, { invoicedAmountPaise: input.amountPaise, reference: input.reference, occurredAt: this.dependencies.now() }),
    );
  }

  async recordClaimCollection(id: string, input: ClaimCollectionInput, actor: Actor, remarks: string): Promise<ClaimBatch> {
    this.assertClaimActor(actor, ["FINANCE_RECEIPT"], remarks);
    if (!input.reference.trim()) throw new Error("CLAIM_COLLECTION_REFERENCE_REQUIRED");
    return this.mutateClaim(id, actor, remarks, "CLAIM_COLLECTION_RECORDED", (current) =>
      transitionClaimFinancials(current, { collectedAmountPaise: input.amountPaise, reference: input.reference, occurredAt: this.dependencies.now() }),
    );
  }

  async recordClaimAccounting(id: string, input: ClaimAccountingInput, actor: Actor, remarks: string): Promise<ClaimBatch> {
    this.assertClaimActor(actor, ["FINANCE_ACCOUNTS"], remarks);
    if (!input.journalReference.trim()) throw new Error("CLAIM_ACCOUNTING_REFERENCE_REQUIRED");
    return this.mutateClaim(id, actor, remarks, "CLAIM_ACCOUNTED", (current) =>
      transitionClaimFinancials(current, { accountedAmountPaise: input.amountPaise, reference: input.journalReference, occurredAt: this.dependencies.now() }),
    );
  }

  async approveClaimAdjustment(id: string, input: ClaimAdjustmentInput, actor: Actor, remarks: string): Promise<ClaimBatch> {
    this.assertClaimActor(actor, ["BUSINESS_HEAD_CHECKER", "MANAGEMENT_VIEWER"], remarks);
    return this.mutateClaim(id, actor, remarks, "CLAIM_RECONCILIATION_ADJUSTMENT_APPROVED", (current) =>
      addClaimReconciliationAdjustment(current, input, actor, this.dependencies.now()),
    );
  }

  async closeClaimBatch(id: string, actor: Actor, remarks: string): Promise<ClaimBatch> {
    this.assertClaimActor(actor, ["BUSINESS_HEAD_CHECKER", "MANAGEMENT_VIEWER"], remarks);
    return this.mutateClaim(id, actor, remarks, "CLAIM_CLOSED", (current) =>
      closeClaimBatch(current, this.dependencies.now()),
    );
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

  private async mutateClaim(
    id: string,
    actor: Actor,
    remarks: string,
    action: AuditEvent["action"],
    mutate: (current: ClaimBatch) => ClaimBatch,
  ): Promise<ClaimBatch> {
    const index = this.claimBatches.findIndex((batch) => batch.id === id);
    if (index < 0) throw new Error(`Claim batch ${id} was not found`);
    const before = clone(this.claimBatches[index]!);
    const after = mutate(clone(before));
    this.claimBatches[index] = after;
    this.auditClaimMutation(before, after, action, actor, remarks);
    return clone(after);
  }

  private auditClaimMutation(
    before: ClaimBatch | null,
    after: ClaimBatch,
    action: AuditEvent["action"],
    actor: Actor,
    remarks: string,
  ): void {
    const auditIds = new Set(this.auditEvents.map((event) => event.id));
    this.auditEvents.push({
      id: this.nextUniqueId("audit", "AuditEvent", auditIds),
      entityType: "ClaimBatch",
      entityId: after.id,
      action,
      actor: clone(actor),
      occurredAt: this.dependencies.now(),
      remarks,
      beforeState: before ? clone(before) : null,
      afterState: clone(after),
      provenance: {
        source: "SUBVENTION_REPOSITORY_COMMAND",
        sourceEntityId: after.id,
      },
      metadata: {
        status: after.status,
        ruleSnapshots: after.lines.map((line) => line.ruleSnapshot),
      },
    });
  }

  private assertClaimActor(actor: Actor, roles: string[], remarks: string): void {
    if (!roles.includes(actor.role)) {
      throw new Error(`${actor.role} is not authorized for this claim action`);
    }
    if (!this.actors.some((candidate) => candidate.userId === actor.userId && candidate.role === actor.role)) {
      throw new Error(`Actor ${actor.userId} is not configured`);
    }
    if (!remarks.trim()) throw new Error("Remarks are required");
  }

  private assertMasterCommand(
    command: MasterCommand,
    action:
      | "SAVE"
      | "CREATE"
      | "SUBMIT"
      | "APPROVE"
      | "RETURN"
      | "REJECT"
      | "DEACTIVATE",
  ): void {
    const makerAction = action === "SAVE" || action === "CREATE" || action === "SUBMIT";
    const requiredRole = makerAction ? "MASTER_DATA_ADMIN" : "BUSINESS_HEAD_CHECKER";
    if (command.actor.role !== requiredRole) {
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

  private findMaster(id: string): MasterRecord {
    const record = listMasterRecords(this.masters).find(
      (candidate) => candidate.id === id,
    );
    if (!record) throw new Error(`Master record ${id} was not found`);
    return record;
  }

  private buildMasterAudit(
    after: MasterRecord,
    action: AuditEvent["action"],
    command: MasterCommand,
    before: MasterRecord | null,
    metadata?: Record<string, unknown>,
    usedIds = new Set(this.auditEvents.map((event) => event.id)),
  ): AuditEvent {
    return {
      id: this.nextUniqueId(
        "audit",
        "AuditEvent",
        usedIds,
      ),
      entityType: "MasterRecord",
      entityId: after.id,
      action,
      actor: clone(command.actor),
      occurredAt: after.updatedAt,
      remarks: command.reason,
      beforeState: before ? clone(before) : null,
      afterState: clone(after),
      provenance: {
        source: command.source,
        sourceEntityId: after.id,
      },
      metadata,
    };
  }

  private transitionReferenceMaster(
    id: string,
    action: "SUBMIT" | "APPROVE" | "RETURN" | "REJECT",
    command: MasterCommand,
  ): MasterRecord {
    this.assertMasterCommand(command, action);
    const current = this.findMaster(id);
    const updated = transitionMasterRecord(
      clone(current),
      action,
      command.actor,
      this.dependencies.now(),
    );
    if (action === "APPROVE") {
      const issues = validateMasterVersionApproval(updated, this.masters);
      if (issues.length > 0) throw issues;
    }

    const auditAction: AuditEvent["action"] = ({
      SUBMIT: "MASTER_SUBMITTED",
      APPROVE: "MASTER_APPROVED",
      RETURN: "MASTER_RETURNED",
      REJECT: "MASTER_REJECTED",
    } as const)[action];
    const usedAuditIds = new Set(this.auditEvents.map((event) => event.id));
    const auditEvents = [
      this.buildMasterAudit(updated, auditAction, command, current, undefined, usedAuditIds),
    ];

    if (action === "APPROVE" && updated.supersedesVersionId) {
      const predecessor = this.findMaster(updated.supersedesVersionId);
      const superseded: MasterRecord = {
        ...predecessor,
        workflowStatus: "SUPERSEDED",
        updatedAt: updated.updatedAt,
      };
      auditEvents.push(this.buildMasterAudit(
        superseded,
        "MASTER_SUPERSEDED",
        command,
        predecessor,
        { successorVersionId: updated.id },
        usedAuditIds,
      ));
      this.upsertMaster(superseded);
    }
    this.upsertMaster(updated);
    this.auditEvents.push(...auditEvents);
    return clone(updated);
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
        master.logicalId,
        master.version,
      ]),
      (master) => `${master.logicalId}:${master.version}`,
      "MasterRecord logical version",
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
      this.claimBatches,
      (batch) => batch.id,
      (batch) => batch.id,
      "ClaimBatch ID",
    );
    this.assertUniqueIdentity(
      this.claimBatches,
      (batch) => batch.reference,
      (batch) => batch.reference,
      "ClaimBatch reference",
    );
    this.assertUniqueIdentity(
      this.claimBatches.flatMap((batch) => batch.lines),
      (line) => line.transactionId,
      (line) => line.transactionId,
      "claimed transaction",
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
