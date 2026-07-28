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
    async (command: () => Promise<unknown>) => {
      setIssues([]);
      setActionError(undefined);
      setIsRefreshing(true);
      try {
        await command();
        await refresh();
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
