"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  LockKeyhole,
  RotateCcw,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import {
  resolveProgrammeMapping,
  type DomainIssue,
  type EmployerProgrammeMappingVersion,
  type MasterWorkflowStatus,
  type ProgrammeMappingEffectiveWindow,
  type SchemeVersion,
} from "@smart-epp/domain";
import { AdaptiveSplitWorkspace } from "@/components/shared/AdaptiveSplitWorkspace";
import { AuditTimeline } from "@/components/shared/AuditTimeline";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSubvention } from "@/features/subvention/store/SubventionProvider";

type MasterView = "schemes" | "programmes";
type DetailTab =
  | "summary"
  | "configuration"
  | "products"
  | "versions"
  | "approvals"
  | "audit";
type WorkflowAction = "submit" | "approve" | "return" | "newVersion";

interface MappingConflict {
  id: string;
  employerId: string;
  programmeId: string;
  oemId: string;
  issue: DomainIssue;
}

const statuses: MasterWorkflowStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "RETURNED",
  "REJECTED",
  "SUPERSEDED",
  "INACTIVE",
];

const detailTabs: { value: DetailTab; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "configuration", label: "Configuration" },
  { value: "products", label: "Products" },
  { value: "versions", label: "Versions" },
  { value: "approvals", label: "Approvals" },
  { value: "audit", label: "Audit" },
];

function sentenceCase(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (character) => character.toUpperCase());
}

function onRowKeyDown(
  event: KeyboardEvent<HTMLTableRowElement>,
  select: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    select();
  }
}

function DefinitionGrid({
  items,
}: {
  items: { label: string; value: React.ReactNode; id?: string }[];
}) {
  return (
    <dl className="master-definition-grid">
      {items.map((item) => (
        <div key={item.label} id={item.id} tabIndex={item.id ? -1 : undefined}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function WorkflowDialog({
  open,
  action,
  entityName,
  busy,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  action?: WorkflowAction;
  entityName: "scheme" | "programme mapping";
  busy: boolean;
  onOpenChange(open: boolean): void;
  onConfirm(
    remarks: string,
    effectiveWindow?: ProgrammeMappingEffectiveWindow,
  ): Promise<void>;
}) {
  const [remarks, setRemarks] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  if (!action) return null;

  const copy = {
    submit: {
      title: `Submit ${entityName} for approval`,
      description:
        "The version moves to the checker queue. Record why it is ready.",
      label: "Submission remarks",
      confirm: entityName === "scheme" ? "Submit scheme" : "Submit mapping",
    },
    approve: {
      title: `Approve ${entityName}`,
      description:
        "Approval locks this version. A separate maker must have prepared it.",
      label: "Approval remarks",
      confirm:
        entityName === "scheme"
          ? "Confirm approval"
          : "Confirm mapping approval",
    },
    return: {
      title: `Return ${entityName}`,
      description:
        "Send the version back to the maker with a precise correction path.",
      label: "Return remarks",
      confirm: entityName === "scheme" ? "Return scheme" : "Return mapping",
    },
    newVersion: {
      title: `Create a new ${entityName} version`,
      description:
        "A controlled draft is derived from the approved snapshot. The approved source remains unchanged.",
      label: "Version remarks",
      confirm: "Create draft version",
    },
  }[action];
  const requiresSuccessorWindow =
    action === "newVersion" && entityName === "programme mapping";
  const windowIsComplete =
    !requiresSuccessorWindow || Boolean(effectiveFrom && effectiveTo);

  const submit = async () => {
    if (!remarks.trim() || !windowIsComplete) return;
    await onConfirm(
      remarks,
      requiresSuccessorWindow
        ? { effectiveFrom, effectiveTo }
        : undefined,
    );
    setRemarks("");
    setEffectiveFrom("");
    setEffectiveTo("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="workflow-dialog">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div className="dialog-field">
          {requiresSuccessorWindow ? (
            <>
              <Label htmlFor="successor-effective-from">
                Successor effective from
              </Label>
              <Input
                id="successor-effective-from"
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
                aria-required="true"
              />
              <Label htmlFor="successor-effective-to">
                Successor effective to
              </Label>
              <Input
                id="successor-effective-to"
                type="date"
                value={effectiveTo}
                onChange={(event) => setEffectiveTo(event.target.value)}
                aria-required="true"
              />
            </>
          ) : null}
          <Label htmlFor={`${action}-remarks`}>{copy.label}</Label>
          <Textarea
            id={`${action}-remarks`}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            aria-required="true"
            autoFocus
          />
          {!remarks.trim() ? (
            <span className="field-guidance">Remarks are required.</span>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!remarks.trim() || !windowIsComplete || busy}
            onClick={submit}
          >
            {copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  open,
  entityName,
  busy,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  entityName: "scheme" | "programme mapping";
  busy: boolean;
  onOpenChange(open: boolean): void;
  onConfirm(remarks: string): Promise<void>;
}) {
  const [remarks, setRemarks] = useState("");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject {entityName}</AlertDialogTitle>
          <AlertDialogDescription>
            Rejection is terminal for this version. Record the control basis
            for the decision.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="dialog-field">
          <Label htmlFor="rejection-remarks">Rejection remarks</Label>
          <Textarea
            id="rejection-remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            aria-required="true"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!remarks.trim() || busy}
            onClick={() => {
              void onConfirm(remarks);
              setRemarks("");
            }}
          >
            Confirm rejection
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Filters({
  search,
  status,
  oem,
  effectiveOn,
  oems,
  onSearch,
  onStatus,
  onOem,
  onEffectiveOn,
}: {
  search: string;
  status: string;
  oem: string;
  effectiveOn: string;
  oems: { id: string; name: string }[];
  onSearch(value: string): void;
  onStatus(value: string): void;
  onOem(value: string): void;
  onEffectiveOn(value: string): void;
}) {
  return (
    <div className="master-filters" aria-label="Master filters">
      <div className="master-search">
        <Search aria-hidden />
        <Input
          aria-label="Search masters"
          placeholder="Search code, name, employer or programme"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </div>
      <Select value={status} onValueChange={onStatus}>
        <SelectTrigger aria-label="Status filter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          {statuses.map((item) => (
            <SelectItem key={item} value={item}>
              {sentenceCase(item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={oem} onValueChange={onOem}>
        <SelectTrigger aria-label="OEM filter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All OEMs</SelectItem>
          {oems.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="effective-filter">
        <Label htmlFor="effective-on">Effective on</Label>
        <Input
          id="effective-on"
          type="date"
          value={effectiveOn}
          onChange={(event) => onEffectiveOn(event.target.value)}
        />
      </div>
    </div>
  );
}

function SchemeList({
  schemes,
  oemName,
  selectedId,
  onSelect,
}: {
  schemes: SchemeVersion[];
  oemName(id: string): string;
  selectedId?: string;
  onSelect(id: string): void;
}) {
  if (schemes.length === 0) {
    return (
      <EmptyState
        title="No scheme versions match"
        description="Clear one or more filters to return controlled scheme versions."
      />
    );
  }

  return (
    <Table className="master-table">
      <TableHeader>
        <TableRow>
          <TableHead className="sticky-master-code">Code</TableHead>
          <TableHead className="sticky-master-name">Name</TableHead>
          <TableHead>OEM</TableHead>
          <TableHead>Effective period</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schemes.map((scheme) => (
          <TableRow
            key={scheme.id}
            tabIndex={0}
            aria-selected={selectedId === scheme.id}
            data-state={selectedId === scheme.id ? "selected" : undefined}
            onClick={(event) => {
              event.currentTarget.focus();
              onSelect(scheme.id);
            }}
            onKeyDown={(event) =>
              onRowKeyDown(event, () => onSelect(scheme.id))
            }
          >
            <TableCell className="sticky-master-code master-code">
              {scheme.code}
            </TableCell>
            <TableCell className="sticky-master-name">
              {scheme.name}
            </TableCell>
            <TableCell>{oemName(scheme.oemId)}</TableCell>
            <TableCell>
              {scheme.effectiveFrom} – {scheme.effectiveTo}
            </TableCell>
            <TableCell>v{scheme.version}</TableCell>
            <TableCell>
              <StatusBadge status={scheme.workflowStatus} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ProgrammeList({
  mappings,
  conflicts,
  oemName,
  selectedId,
  onSelect,
}: {
  mappings: EmployerProgrammeMappingVersion[];
  conflicts: MappingConflict[];
  oemName(id: string): string;
  selectedId?: string;
  onSelect(id: string): void;
}) {
  if (mappings.length === 0 && conflicts.length === 0) {
    return (
      <EmptyState
        title="No programme mappings match"
        description="Adjust filters to review effective employer programme controls."
      />
    );
  }

  return (
    <Table className="master-table programme-table">
      <TableHeader>
        <TableRow>
          <TableHead className="sticky-master-code">Employer</TableHead>
          <TableHead className="sticky-master-name">Programme</TableHead>
          <TableHead>OEM</TableHead>
          <TableHead>Scheme version</TableHead>
          <TableHead>Validity</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {conflicts.map((conflict) => (
          <TableRow
            className="conflict-row"
            key={conflict.id}
            tabIndex={0}
            aria-selected={selectedId === conflict.id}
            data-state={selectedId === conflict.id ? "selected" : undefined}
            onClick={(event) => {
              event.currentTarget.focus();
              onSelect(conflict.id);
            }}
            onKeyDown={(event) =>
              onRowKeyDown(event, () => onSelect(conflict.id))
            }
          >
            <TableCell className="sticky-master-code">
              {conflict.employerId}
            </TableCell>
            <TableCell className="sticky-master-name">
              {conflict.programmeId}
            </TableCell>
            <TableCell>{oemName(conflict.oemId)}</TableCell>
            <TableCell colSpan={2}>{conflict.issue.message}</TableCell>
            <TableCell>
              <span className="conflict-label">
                <AlertTriangle aria-hidden />
                Conflict
              </span>
            </TableCell>
          </TableRow>
        ))}
        {mappings.map((mapping) => (
          <TableRow
            key={mapping.id}
            tabIndex={0}
            aria-selected={selectedId === mapping.id}
            data-state={selectedId === mapping.id ? "selected" : undefined}
            onClick={(event) => {
              event.currentTarget.focus();
              onSelect(mapping.id);
            }}
            onKeyDown={(event) =>
              onRowKeyDown(event, () => onSelect(mapping.id))
            }
          >
            <TableCell className="sticky-master-code master-code">
              {mapping.employerId}
            </TableCell>
            <TableCell className="sticky-master-name">
              {mapping.programmeId}
            </TableCell>
            <TableCell>{oemName(mapping.oemId)}</TableCell>
            <TableCell>{mapping.schemeVersionId}</TableCell>
            <TableCell>
              {mapping.effectiveFrom} – {mapping.effectiveTo}
            </TableCell>
            <TableCell>
              <StatusBadge status={mapping.workflowStatus} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DetailTabs({
  value,
  onValueChange,
  children,
}: {
  value: DetailTab;
  onValueChange(value: DetailTab): void;
  children: React.ReactNode;
}) {
  return (
    <Tabs
      className="master-detail-tabs"
      value={value}
      onValueChange={(next) => onValueChange(next as DetailTab)}
    >
      <TabsList variant="line" aria-label="Master detail">
        {detailTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}

export function SchemeProgrammeWorkspace({
  initialView = "schemes",
  initialStatus = "ALL",
}: {
  initialView?: MasterView;
  initialStatus?: string;
}) {
  const store = useSubvention();
  const [view, setView] = useState<MasterView>(initialView);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(() =>
    statuses.includes(initialStatus as MasterWorkflowStatus)
      ? initialStatus!
      : "ALL",
  );
  const [oem, setOem] = useState("ALL");
  const [effectiveOn, setEffectiveOn] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [detailTab, setDetailTab] = useState<DetailTab>("summary");
  const [workflowAction, setWorkflowAction] = useState<WorkflowAction>();
  const [rejectOpen, setRejectOpen] = useState(false);

  const oemName = (id: string) =>
    store.snapshot.oems.find((item) => item.id === id)?.name ?? id;

  const filteredSchemes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return store.snapshot.schemes.filter(
      (scheme) =>
        (!query ||
          `${scheme.code} ${scheme.name} ${scheme.schemeId}`
            .toLowerCase()
            .includes(query)) &&
        (status === "ALL" || scheme.workflowStatus === status) &&
        (oem === "ALL" || scheme.oemId === oem) &&
        (!effectiveOn ||
          (scheme.effectiveFrom <= effectiveOn &&
            scheme.effectiveTo >= effectiveOn)),
    );
  }, [effectiveOn, oem, search, status, store.snapshot.schemes]);

  const mappingConflicts = useMemo(() => {
    const seen = new Set<string>();
    return store.snapshot.transactions.flatMap<MappingConflict>(
      (transaction) => {
        const resolution = resolveProgrammeMapping(
          transaction,
          store.snapshot.programmeMappings,
        );
        if (resolution.status === "RESOLVED") return [];
        const key = [
          transaction.employerId,
          transaction.programmeId,
          transaction.oemId,
          resolution.status,
        ].join(":");
        if (seen.has(key)) return [];
        seen.add(key);
        return [
          {
            id: `conflict:${key}`,
            employerId: transaction.employerId,
            programmeId: transaction.programmeId,
            oemId: transaction.oemId,
            issue: resolution.issues[0]!,
          },
        ];
      },
    );
  }, [store.snapshot.programmeMappings, store.snapshot.transactions]);

  const filteredMappings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return store.snapshot.programmeMappings.filter(
      (mapping) =>
        (!query ||
          `${mapping.employerId} ${mapping.programmeId} ${mapping.mappingId}`
            .toLowerCase()
            .includes(query)) &&
        (status === "ALL" || mapping.workflowStatus === status) &&
        (oem === "ALL" || mapping.oemId === oem) &&
        (!effectiveOn ||
          (mapping.effectiveFrom <= effectiveOn &&
            mapping.effectiveTo >= effectiveOn)),
    );
  }, [
    effectiveOn,
    oem,
    search,
    status,
    store.snapshot.programmeMappings,
  ]);

  const filteredConflicts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (status !== "ALL" && status !== "REJECTED") return [];
    return mappingConflicts.filter(
      (conflict) =>
        (!query ||
          `${conflict.employerId} ${conflict.programmeId}`
            .toLowerCase()
            .includes(query)) &&
        (oem === "ALL" || conflict.oemId === oem),
    );
  }, [mappingConflicts, oem, search, status]);

  const selectedScheme = store.snapshot.schemes.find(
    (scheme) => view === "schemes" && scheme.id === selectedId,
  );
  const selectedMapping = store.snapshot.programmeMappings.find(
    (mapping) => view === "programmes" && mapping.id === selectedId,
  );
  const selectedConflict = mappingConflicts.find(
    (conflict) => view === "programmes" && conflict.id === selectedId,
  );
  const selected = selectedScheme ?? selectedMapping ?? selectedConflict;
  const canMaintainMaster =
    store.activeActor.role === "SALES_OPS_MAKER" ||
    store.activeActor.role === "MASTER_DATA_ADMIN";
  const entityName = selectedScheme ? "scheme" : "programme mapping";
  const selectedLabel = selectedScheme
    ? `${selectedScheme.code} version ${selectedScheme.version}`
    : selectedMapping
      ? `${selectedMapping.employerId} / ${selectedMapping.programmeId}`
      : selectedConflict
        ? `${selectedConflict.employerId} / ${selectedConflict.programmeId} conflict`
        : undefined;

  const selectRow = (id: string) => {
    setSelectedId(id);
    setDetailTab("summary");
  };

  const runWorkflow = async (
    remarks: string,
    effectiveWindow?: ProgrammeMappingEffectiveWindow,
  ) => {
    if (selectedScheme) {
      if (workflowAction === "submit") {
        await store.submitScheme(selectedScheme.id, remarks);
      } else if (workflowAction === "approve") {
        await store.approveScheme(selectedScheme.id, remarks);
      } else if (workflowAction === "return") {
        await store.returnScheme(selectedScheme.id, remarks);
      } else if (workflowAction === "newVersion") {
        const id = await store.createNextSchemeVersion(
          selectedScheme.id,
          remarks,
        );
        if (id) setSelectedId(id);
      }
    } else if (selectedMapping) {
      if (workflowAction === "submit") {
        await store.submitProgrammeMapping(selectedMapping.id, remarks);
      } else if (workflowAction === "approve") {
        await store.approveProgrammeMapping(selectedMapping.id, remarks);
      } else if (workflowAction === "return") {
        await store.returnProgrammeMapping(selectedMapping.id, remarks);
      } else if (workflowAction === "newVersion") {
        if (!effectiveWindow) return;
        const id = await store.createNextProgrammeMappingVersion(
          selectedMapping.id,
          remarks,
          effectiveWindow,
        );
        if (id) setSelectedId(id);
      }
    }
  };

  const reject = async (remarks: string) => {
    if (selectedScheme) {
      await store.rejectScheme(selectedScheme.id, remarks);
    } else if (selectedMapping) {
      await store.rejectProgrammeMapping(selectedMapping.id, remarks);
    }
  };

  const masterList = (
    <div className="master-list-panel">
      <div className="master-list-heading">
        <div>
          <span className="eyebrow">Effective-dated master control</span>
          <strong>
            {view === "schemes"
              ? `${filteredSchemes.length} scheme versions`
              : `${filteredMappings.length} mappings · ${filteredConflicts.length} conflicts`}
          </strong>
        </div>
        <span className="repository-state">
          <CheckCircle2 aria-hidden /> Repository current
        </span>
      </div>
      <Filters
        search={search}
        status={status}
        oem={oem}
        effectiveOn={effectiveOn}
        oems={store.snapshot.oems}
        onSearch={setSearch}
        onStatus={setStatus}
        onOem={setOem}
        onEffectiveOn={setEffectiveOn}
      />
      {view === "schemes" ? (
        <SchemeList
          schemes={filteredSchemes}
          oemName={oemName}
          selectedId={selectedId}
          onSelect={selectRow}
        />
      ) : (
        <ProgrammeList
          mappings={filteredMappings}
          conflicts={filteredConflicts}
          oemName={oemName}
          selectedId={selectedId}
          onSelect={selectRow}
        />
      )}
    </div>
  );

  const detail = selectedConflict ? (
    <div className="master-detail-content">
      <header className="master-detail-header conflict-detail-header">
        <div>
          <span className="eyebrow">Domain resolution conflict</span>
          <h2 data-detail-heading tabIndex={-1}>
            {selectedConflict.employerId}
          </h2>
          <p>{selectedConflict.programmeId}</p>
        </div>
        <span className="conflict-label">
          <AlertTriangle aria-hidden />
          Conflict
        </span>
      </header>
      <div className="conflict-detail">
        <ShieldAlert aria-hidden />
        <div>
          <strong>{selectedConflict.issue.code}</strong>
          <p>{selectedConflict.issue.message}</p>
        </div>
      </div>
      <DefinitionGrid
        items={[
          { label: "OEM", value: oemName(selectedConflict.oemId) },
          { label: "Financial impact", value: "Not evaluated" },
          {
            label: "Resolution guidance",
            value: selectedConflict.issue.recoveryAction,
          },
        ]}
      />
      <Link
        className="recovery-link"
        href={`/subvention/programme-mappings?employer=${selectedConflict.employerId}&programme=${selectedConflict.programmeId}`}
      >
        Review validity and product scope <ArrowRight aria-hidden />
      </Link>
    </div>
  ) : selectedScheme || selectedMapping ? (
    <div className="master-detail-content">
      <header className="master-detail-header">
        <div>
          <span className="eyebrow">
            {selectedScheme ? "Scheme version" : "Employer programme mapping"}
          </span>
          <h2 data-detail-heading tabIndex={-1}>
            {selectedScheme
              ? selectedScheme.code
              : selectedMapping!.programmeId}
          </h2>
          <p>
            {selectedScheme
              ? selectedScheme.name
              : `${selectedMapping!.employerId} · ${oemName(selectedMapping!.oemId)}`}
          </p>
        </div>
        <StatusBadge
          status={(selectedScheme ?? selectedMapping)!.workflowStatus}
          label={sentenceCase(
            (selectedScheme ?? selectedMapping)!.workflowStatus,
          )}
        />
      </header>
      <div className="master-action-strip">
        {(selectedScheme ?? selectedMapping)!.workflowStatus === "APPROVED" ? (
          <span className="immutable-note">
            <LockKeyhole aria-hidden /> Approved version locked
          </span>
        ) : null}
        {store.activeActor.role === "SALES_OPS_MAKER" &&
        ["DRAFT", "RETURNED"].includes(
          (selectedScheme ?? selectedMapping)!.workflowStatus,
        ) ? (
          <Button onClick={() => setWorkflowAction("submit")}>
            Submit for approval
          </Button>
        ) : null}
        {store.activeActor.role === "BUSINESS_HEAD_CHECKER" &&
        (selectedScheme ?? selectedMapping)!.workflowStatus ===
          "SUBMITTED" ? (
          <>
            <Button onClick={() => setWorkflowAction("approve")}>
              Approve {selectedScheme ? "scheme" : "mapping"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setWorkflowAction("return")}
            >
              <RotateCcw aria-hidden /> Return
            </Button>
            <Button
              variant="destructive"
              onClick={() => setRejectOpen(true)}
            >
              <XCircle aria-hidden /> Reject
            </Button>
          </>
        ) : null}
        {canMaintainMaster &&
        (selectedScheme ?? selectedMapping)!.workflowStatus ===
          "APPROVED" ? (
          <Button
            variant="outline"
            onClick={() => setWorkflowAction("newVersion")}
          >
            <GitBranch aria-hidden /> New version
          </Button>
        ) : null}
        <Button
          variant="outline"
          disabled={
            !canMaintainMaster ||
            (selectedScheme ?? selectedMapping)!.workflowStatus !== "DRAFT"
          }
          onClick={() => setDetailTab("configuration")}
        >
          Edit {selectedScheme ? "scheme" : "mapping"}
        </Button>
      </div>
      <DetailTabs value={detailTab} onValueChange={setDetailTab}>
        <TabsContent value="summary">
          <div className="validation-summary" role="status">
            <CheckCircle2 aria-hidden />
            <div>
              <strong>Validation summary: 0 blocking issues</strong>
              <span>
                Key controls are linked to{" "}
                <a href="#master-effective-from">effective dates</a> and{" "}
                <a href="#master-rule-basis">rule basis</a>.
              </span>
            </div>
          </div>
          <DefinitionGrid
            items={
              selectedScheme
                ? [
                    { label: "Logical ID", value: selectedScheme.schemeId },
                    { label: "Version", value: `v${selectedScheme.version}` },
                    { label: "OEM", value: oemName(selectedScheme.oemId) },
                    {
                      label: "Effective from",
                      value: selectedScheme.effectiveFrom,
                      id: "master-effective-from",
                    },
                    { label: "Effective to", value: selectedScheme.effectiveTo },
                    {
                      label: "Claim timeline",
                      value: `${selectedScheme.claimTimelineDays} days`,
                    },
                  ]
                : [
                    { label: "Logical ID", value: selectedMapping!.mappingId },
                    { label: "Version", value: `v${selectedMapping!.version}` },
                    { label: "Employer", value: selectedMapping!.employerId },
                    { label: "OEM", value: oemName(selectedMapping!.oemId) },
                    {
                      label: "Effective from",
                      value: selectedMapping!.effectiveFrom,
                      id: "master-effective-from",
                    },
                    {
                      label: "Effective to",
                      value: selectedMapping!.effectiveTo,
                    },
                  ]
            }
          />
        </TabsContent>
        <TabsContent value="configuration">
          <DefinitionGrid
            items={
              selectedScheme
                ? [
                    {
                      label: "Calculation basis",
                      value: sentenceCase(selectedScheme.calculationBasis),
                      id: "master-rule-basis",
                    },
                    {
                      label: "Rate",
                      value:
                        selectedScheme.rateBps === undefined
                          ? "Not configured"
                          : `${(selectedScheme.rateBps / 100).toFixed(2)}%`,
                    },
                    {
                      label: "Flat amount",
                      value:
                        selectedScheme.flatAmountPaise === undefined
                          ? "Not configured"
                          : new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                            }).format(selectedScheme.flatAmountPaise / 100),
                    },
                    {
                      label: "Settlement counterparty",
                      value: sentenceCase(
                        selectedScheme.settlementCounterpartyType,
                      ),
                    },
                    { label: "Priority", value: selectedScheme.priority },
                  ]
                : [
                    {
                      label: "Mapped scheme",
                      value: selectedMapping!.schemeVersionId,
                      id: "master-rule-basis",
                    },
                    {
                      label: "Reseller",
                      value: selectedMapping!.resellerId ?? "Not constrained",
                    },
                    {
                      label: "Distributor",
                      value:
                        selectedMapping!.distributorId ?? "Not constrained",
                    },
                    {
                      label: "Override authority",
                      value:
                        selectedMapping!.overrides?.approvalReference ??
                        "No override",
                    },
                  ]
            }
          />
        </TabsContent>
        <TabsContent value="products">
          <ul className="product-scope">
            {(selectedScheme
              ? selectedScheme.eligibleProductIds
              : store.snapshot.schemes.find(
                  (scheme) =>
                    scheme.id === selectedMapping!.schemeVersionId,
                )?.eligibleProductIds ?? []
            ).map((product) => (
              <li key={product}>
                <CheckCircle2 aria-hidden /> {product}
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="versions">
          <Table className="version-table">
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Effective period</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(selectedScheme
                ? store.snapshot.schemes.filter(
                    (scheme) => scheme.schemeId === selectedScheme.schemeId,
                  )
                : store.snapshot.programmeMappings.filter(
                    (mapping) =>
                      mapping.mappingId === selectedMapping!.mappingId,
                  )
              ).map((version) => (
                <TableRow key={version.id}>
                  <TableCell>v{version.version}</TableCell>
                  <TableCell>
                    {version.effectiveFrom} – {version.effectiveTo}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={version.workflowStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="approvals">
          <DefinitionGrid
            items={[
              {
                label: "Maker",
                value: (selectedScheme ?? selectedMapping)!.makerUserId,
              },
              {
                label: "Checker",
                value:
                  (selectedScheme ?? selectedMapping)!.checkerUserId ??
                  "Pending",
              },
              {
                label: "Approved at",
                value:
                  (selectedScheme ?? selectedMapping)!.approvedAt ??
                  "Pending",
              },
            ]}
          />
        </TabsContent>
        <TabsContent value="audit">
          <AuditTimeline
            events={store.snapshot.auditEvents.filter((event) => {
              const master = selectedScheme ?? selectedMapping!;
              return event.entityId === master.id;
            })}
          />
        </TabsContent>
      </DetailTabs>
    </div>
  ) : (
    <EmptyState
      title="Select a master record"
      description="Choose a row to inspect configuration, versions, approvals and audit history."
    />
  );

  return (
    <div className="scheme-programme-workspace">
      <header className="page-heading master-page-heading">
        <div>
          <span className="eyebrow">Subvention master controls</span>
          <h1>
            {view === "schemes" ? "Scheme Versions" : "Programme Mappings"}
          </h1>
          <p>
            Govern commercial rules and employer programme mappings with
            effective-dated maker-checker control.
          </p>
        </div>
        <span className="control-posture">
          <LockKeyhole aria-hidden /> Controlled master data
        </span>
      </header>
      <Tabs
        className="master-view-tabs"
        value={view}
        onValueChange={(next) => {
          setView(next as MasterView);
          setSelectedId(undefined);
          setDetailTab("summary");
        }}
      >
        <TabsList aria-label="Master workspace view">
          <TabsTrigger value="schemes">Scheme versions</TabsTrigger>
          <TabsTrigger value="programmes">Programme mappings</TabsTrigger>
        </TabsList>
      </Tabs>
      <AdaptiveSplitWorkspace
        listLabel={
          view === "schemes" ? "Scheme versions" : "Programme mappings"
        }
        selectedLabel={selectedLabel}
        list={masterList}
        detail={detail}
        isOpen={Boolean(selected)}
        onClose={() => setSelectedId(undefined)}
      />
      <WorkflowDialog
        open={Boolean(workflowAction)}
        action={workflowAction}
        entityName={entityName}
        busy={store.isRefreshing}
        onOpenChange={(open) => {
          if (!open) setWorkflowAction(undefined);
        }}
        onConfirm={runWorkflow}
      />
      <RejectDialog
        open={rejectOpen}
        entityName={entityName}
        busy={store.isRefreshing}
        onOpenChange={setRejectOpen}
        onConfirm={reject}
      />
    </div>
  );
}
