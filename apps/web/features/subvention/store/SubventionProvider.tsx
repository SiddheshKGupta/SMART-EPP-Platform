"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type {
  Actor,
  DomainIssue,
  EligibilityDecision,
  EmployerProgrammeMappingVersion,
  ImportResult,
  PurchaseTransactionInput,
  ProgrammeMappingEffectiveWindow,
  SchemeEffectiveWindow,
  SchemeVersion,
  SubventionSnapshot,
} from "@smart-epp/domain";
import {
  createDemoSubventionRepository,
  createDemoSubventionSeed,
} from "../data/seed";

export interface SubventionActionError {
  message: string;
}

export type SubventionCommandResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: SubventionActionError;
      issues: DomainIssue[];
    };

export interface SubventionContextValue {
  snapshot: SubventionSnapshot;
  activeActor: Actor;
  setActiveActor(actor: Actor): void;
  submitScheme(
    id: string,
    remarks: string,
  ): Promise<SubventionCommandResult<SchemeVersion>>;
  approveScheme(
    id: string,
    remarks: string,
  ): Promise<SubventionCommandResult<SchemeVersion>>;
  returnScheme(
    id: string,
    remarks: string,
  ): Promise<SubventionCommandResult<SchemeVersion>>;
  rejectScheme(
    id: string,
    remarks: string,
  ): Promise<SubventionCommandResult<SchemeVersion>>;
  createNextSchemeVersion(
    id: string,
    remarks: string,
    effectiveWindow: SchemeEffectiveWindow,
  ): Promise<SubventionCommandResult<string>>;
  submitProgrammeMapping(
    id: string,
    remarks: string,
  ): Promise<SubventionCommandResult<EmployerProgrammeMappingVersion>>;
  approveProgrammeMapping(
    id: string,
    remarks: string,
  ): Promise<SubventionCommandResult<EmployerProgrammeMappingVersion>>;
  returnProgrammeMapping(
    id: string,
    remarks: string,
  ): Promise<SubventionCommandResult<EmployerProgrammeMappingVersion>>;
  rejectProgrammeMapping(
    id: string,
    remarks: string,
  ): Promise<SubventionCommandResult<EmployerProgrammeMappingVersion>>;
  createNextProgrammeMappingVersion(
    id: string,
    remarks: string,
    effectiveWindow: ProgrammeMappingEffectiveWindow,
  ): Promise<SubventionCommandResult<string>>;
  evaluateTransaction(
    id: string,
  ): Promise<SubventionCommandResult<EligibilityDecision>>;
  evaluateTransactions(
    ids: string[],
  ): Promise<SubventionCommandResult<EligibilityDecision[]>>;
  importTransactions(
    rows: PurchaseTransactionInput[],
  ): Promise<SubventionCommandResult<ImportResult>>;
  issues: DomainIssue[];
  actionError?: SubventionActionError;
  isRefreshing: boolean;
}

const SubventionContext = createContext<SubventionContextValue | undefined>(
  undefined,
);

function isDomainIssue(value: unknown): value is DomainIssue {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<DomainIssue>;
  return (
    typeof candidate.code === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.recoveryAction === "string"
  );
}

function domainIssuesFrom(error: unknown): DomainIssue[] {
  return Array.isArray(error) && error.every(isDomainIssue) ? error : [];
}

function actionErrorFrom(error: unknown): SubventionActionError {
  return {
    message:
      error instanceof Error
        ? error.message
        : "The requested subvention action could not be completed.",
  };
}

export function SubventionProvider({ children }: { children: ReactNode }) {
  const [repository] = useState(createDemoSubventionRepository);
  const [snapshot, setSnapshot] = useState<SubventionSnapshot>(
    createDemoSubventionSeed,
  );
  const [activeActorId, setActiveActorId] = useState<string>(
    () =>
      (typeof window === "undefined"
        ? undefined
        : window.sessionStorage.getItem("smart-epp-active-actor")) ??
      snapshot.actors[0]!.userId,
  );
  const activeActor =
    snapshot.actors.find((actor) => actor.userId === activeActorId) ??
    snapshot.actors[0]!;
  const [issues, setIssues] = useState<DomainIssue[]>([]);
  const [actionError, setActionError] = useState<
    SubventionActionError | undefined
  >();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const setActiveActor = useCallback((actor: Actor) => {
    window.sessionStorage.setItem("smart-epp-active-actor", actor.userId);
    setActiveActorId(actor.userId);
  }, []);

  const refresh = useCallback(async () => {
    setSnapshot(await repository.getSnapshot());
  }, [repository]);

  const runCommand = useCallback(
    async <T,>(
      command: () => Promise<T>,
    ): Promise<SubventionCommandResult<T>> => {
      setIssues([]);
      setActionError(undefined);
      setIsRefreshing(true);
      try {
        const value = await command();
        await refresh();
        return { ok: true, value };
      } catch (error) {
        const domainIssues = domainIssuesFrom(error);
        const commandError = actionErrorFrom(error);
        if (domainIssues.length > 0) {
          setIssues(domainIssues);
        } else {
          setActionError(commandError);
        }
        return { ok: false, error: commandError, issues: domainIssues };
      } finally {
        setIsRefreshing(false);
      }
    },
    [refresh],
  );

  const submitScheme = useCallback(
    (id: string, remarks: string) =>
      runCommand(() => repository.submitScheme(id, activeActor, remarks)),
    [activeActor, repository, runCommand],
  );

  const approveScheme = useCallback(
    (id: string, remarks: string) =>
      runCommand(() => repository.approveScheme(id, activeActor, remarks)),
    [activeActor, repository, runCommand],
  );

  const returnScheme = useCallback(
    (id: string, remarks: string) =>
      runCommand(() => repository.returnScheme(id, activeActor, remarks)),
    [activeActor, repository, runCommand],
  );

  const rejectScheme = useCallback(
    (id: string, remarks: string) =>
      runCommand(() => repository.rejectScheme(id, activeActor, remarks)),
    [activeActor, repository, runCommand],
  );

  const createNextSchemeVersion = useCallback(
    async (
      id: string,
      remarks: string,
      effectiveWindow: SchemeEffectiveWindow,
    ): Promise<SubventionCommandResult<string>> => {
      const result = await runCommand(() =>
        repository.createNextSchemeVersion(
          id,
          activeActor,
          remarks,
          effectiveWindow,
        ),
      );
      return result.ok
        ? { ok: true, value: result.value.id }
        : result;
    },
    [activeActor, repository, runCommand],
  );

  const submitProgrammeMapping = useCallback(
    (id: string, remarks: string) =>
      runCommand(() =>
        repository.submitProgrammeMapping(id, activeActor, remarks),
      ),
    [activeActor, repository, runCommand],
  );

  const approveProgrammeMapping = useCallback(
    (id: string, remarks: string) =>
      runCommand(() =>
        repository.approveProgrammeMapping(id, activeActor, remarks),
      ),
    [activeActor, repository, runCommand],
  );

  const returnProgrammeMapping = useCallback(
    (id: string, remarks: string) =>
      runCommand(() =>
        repository.returnProgrammeMapping(id, activeActor, remarks),
      ),
    [activeActor, repository, runCommand],
  );

  const rejectProgrammeMapping = useCallback(
    (id: string, remarks: string) =>
      runCommand(() =>
        repository.rejectProgrammeMapping(id, activeActor, remarks),
      ),
    [activeActor, repository, runCommand],
  );

  const createNextProgrammeMappingVersion = useCallback(
    async (
      id: string,
      remarks: string,
      effectiveWindow: ProgrammeMappingEffectiveWindow,
    ): Promise<SubventionCommandResult<string>> => {
      const result = await runCommand(() =>
        repository.createNextProgrammeMappingVersion(
          id,
          activeActor,
          remarks,
          effectiveWindow,
        ),
      );
      return result.ok
        ? { ok: true, value: result.value.id }
        : result;
    },
    [activeActor, repository, runCommand],
  );

  const evaluateTransaction = useCallback(
    (id: string) =>
      runCommand(() => repository.evaluateTransaction(id, activeActor)),
    [activeActor, repository, runCommand],
  );

  const evaluateTransactions = useCallback(
    (ids: string[]) =>
      runCommand(() => repository.evaluateTransactions(ids, activeActor)),
    [activeActor, repository, runCommand],
  );

  const importTransactions = useCallback(
    (rows: PurchaseTransactionInput[]) =>
      runCommand(() => repository.importTransactions(rows, activeActor)),
    [activeActor, repository, runCommand],
  );

  return (
    <SubventionContext.Provider
      value={{
        snapshot,
        activeActor,
        setActiveActor,
        submitScheme,
        approveScheme,
        returnScheme,
        rejectScheme,
        createNextSchemeVersion,
        submitProgrammeMapping,
        approveProgrammeMapping,
        returnProgrammeMapping,
        rejectProgrammeMapping,
        createNextProgrammeMappingVersion,
        evaluateTransaction,
        evaluateTransactions,
        importTransactions,
        issues,
        actionError,
        isRefreshing,
      }}
    >
      {children}
    </SubventionContext.Provider>
  );
}

export function useSubvention(): SubventionContextValue {
  const value = useContext(SubventionContext);
  if (!value) {
    throw new Error("useSubvention must be used within SubventionProvider");
  }
  return value;
}
