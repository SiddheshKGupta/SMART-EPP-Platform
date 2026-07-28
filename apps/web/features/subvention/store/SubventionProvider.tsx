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
  SubventionSnapshot,
} from "@smart-epp/domain";
import {
  createDemoSubventionRepository,
  createDemoSubventionSeed,
} from "../data/seed";

export interface SubventionActionError {
  message: string;
}

export interface SubventionContextValue {
  snapshot: SubventionSnapshot;
  activeActor: Actor;
  setActiveActor(actor: Actor): void;
  submitScheme(id: string, remarks: string): Promise<void>;
  approveScheme(id: string, remarks: string): Promise<void>;
  returnScheme(id: string, remarks: string): Promise<void>;
  rejectScheme(id: string, remarks: string): Promise<void>;
  createNextSchemeVersion(
    id: string,
    remarks: string,
  ): Promise<string | undefined>;
  submitProgrammeMapping(id: string, remarks: string): Promise<void>;
  approveProgrammeMapping(id: string, remarks: string): Promise<void>;
  returnProgrammeMapping(id: string, remarks: string): Promise<void>;
  rejectProgrammeMapping(id: string, remarks: string): Promise<void>;
  createNextProgrammeMappingVersion(
    id: string,
    remarks: string,
  ): Promise<string | undefined>;
  evaluateTransaction(id: string): Promise<void>;
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
  const [activeActor, setActiveActor] = useState<Actor>(
    () => snapshot.actors[0]!,
  );
  const [issues, setIssues] = useState<DomainIssue[]>([]);
  const [actionError, setActionError] = useState<
    SubventionActionError | undefined
  >();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setSnapshot(await repository.getSnapshot());
  }, [repository]);

  const runCommand = useCallback(
    async <T,>(command: () => Promise<T>): Promise<T | undefined> => {
      setIssues([]);
      setActionError(undefined);
      setIsRefreshing(true);
      try {
        const result = await command();
        await refresh();
        return result;
      } catch (error) {
        const domainIssues = domainIssuesFrom(error);
        if (domainIssues.length > 0) {
          setIssues(domainIssues);
        } else {
          setActionError(actionErrorFrom(error));
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [refresh],
  );

  const submitScheme = useCallback(
    async (id: string, remarks: string) => {
      await runCommand(() =>
        repository.submitScheme(id, activeActor, remarks),
      );
    },
    [activeActor, repository, runCommand],
  );

  const approveScheme = useCallback(
    async (id: string, remarks: string) => {
      await runCommand(() =>
        repository.approveScheme(id, activeActor, remarks),
      );
    },
    [activeActor, repository, runCommand],
  );

  const returnScheme = useCallback(
    async (id: string, remarks: string) => {
      await runCommand(() =>
        repository.returnScheme(id, activeActor, remarks),
      );
    },
    [activeActor, repository, runCommand],
  );

  const rejectScheme = useCallback(
    async (id: string, remarks: string) => {
      await runCommand(() =>
        repository.rejectScheme(id, activeActor, remarks),
      );
    },
    [activeActor, repository, runCommand],
  );

  const createNextSchemeVersion = useCallback(
    async (id: string, remarks: string) =>
      (
        await runCommand(() =>
          repository.createNextSchemeVersion(id, activeActor, remarks),
        )
      )?.id,
    [activeActor, repository, runCommand],
  );

  const submitProgrammeMapping = useCallback(
    async (id: string, remarks: string) => {
      await runCommand(() =>
        repository.submitProgrammeMapping(id, activeActor, remarks),
      );
    },
    [activeActor, repository, runCommand],
  );

  const approveProgrammeMapping = useCallback(
    async (id: string, remarks: string) => {
      await runCommand(() =>
        repository.approveProgrammeMapping(id, activeActor, remarks),
      );
    },
    [activeActor, repository, runCommand],
  );

  const returnProgrammeMapping = useCallback(
    async (id: string, remarks: string) => {
      await runCommand(() =>
        repository.returnProgrammeMapping(id, activeActor, remarks),
      );
    },
    [activeActor, repository, runCommand],
  );

  const rejectProgrammeMapping = useCallback(
    async (id: string, remarks: string) => {
      await runCommand(() =>
        repository.rejectProgrammeMapping(id, activeActor, remarks),
      );
    },
    [activeActor, repository, runCommand],
  );

  const createNextProgrammeMappingVersion = useCallback(
    async (id: string, remarks: string) =>
      (
        await runCommand(() =>
          repository.createNextProgrammeMappingVersion(
            id,
            activeActor,
            remarks,
          ),
        )
      )?.id,
    [activeActor, repository, runCommand],
  );

  const evaluateTransaction = useCallback(
    async (id: string) => {
      await runCommand(() =>
        repository.evaluateTransaction(id, activeActor),
      );
    },
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
