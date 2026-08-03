import React, { useRef } from "react";
import { createRoot } from "react-dom/client";
import { Download, RotateCcw, Upload } from "lucide-react";
import { PlatformShell } from "@/components/shell/PlatformShell";
import { Button } from "@/components/ui/button";
import { RouteContractPage } from "@/components/shared/RouteContractPage";
import OverviewPage from "@/app/subvention/page";
import { OperationsWorkbench } from "@/features/subvention/operations/OperationsWorkbench";
import { DocumentUploadWorkspace } from "@/features/subvention/evidence/DocumentUploadWorkspace";
import { PurchaseRepositoryWorkspace } from "@/features/subvention/transactions/PurchaseRepositoryWorkspace";
import { EligibilityWorkspace } from "@/features/subvention/eligibility/EligibilityWorkspace";
import { ClaimPreparation } from "@/features/subvention/claims/ClaimPreparation";
import { ClaimLifecycleTracker } from "@/features/subvention/claims/ClaimLifecycleTracker";
import { MasterDataWorkbench } from "@/features/subvention/masters/MasterDataWorkbench";
import { MasterHierarchy } from "@/features/subvention/masters/MasterHierarchy";
import { SchemeProgrammeWorkspace } from "@/features/subvention/schemes/SchemeProgrammeWorkspace";
import {
  parseSubventionState,
  serializeSubventionState,
  SUBVENTION_STATE_STORAGE_KEY,
  useSubvention,
} from "@/features/subvention/store/SubventionProvider";
import { usePathname } from "next/navigation";

function StateTools() {
  const { snapshot } = useSubvention();
  const importRef = useRef<HTMLInputElement>(null);
  const exportState = () => {
    const blob = new Blob([serializeSubventionState(snapshot)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Smart_EPP_Subvention_State_${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importState = async (file?: File) => {
    if (!file) return;
    try {
      const state = parseSubventionState(await file.text());
      window.localStorage.setItem(SUBVENTION_STATE_STORAGE_KEY, serializeSubventionState(state));
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "The state file could not be imported.");
    }
  };
  const reset = () => {
    if (!window.confirm("Reset all standalone prototype changes and restore the canonical seed data?")) return;
    window.localStorage.removeItem(SUBVENTION_STATE_STORAGE_KEY);
    window.sessionStorage.removeItem("smart-epp-active-actor");
    window.location.reload();
  };
  return (
    <div className="standalone-state-tools" aria-label="Standalone data tools">
      <span>Offline data</span>
      <Button size="sm" variant="ghost" onClick={exportState}><Download />Export</Button>
      <Button size="sm" variant="ghost" onClick={() => importRef.current?.click()}><Upload />Import</Button>
      <Button size="sm" variant="ghost" onClick={reset}><RotateCcw />Reset</Button>
      <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importState(event.target.files?.[0])} />
    </div>
  );
}

function DataModelPage() {
  return <div className="space-y-4"><header className="border-b pb-4"><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#53284F]">Administration</div><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Data model &amp; master hierarchy</h1><p className="mt-1 max-w-3xl text-sm text-slate-600">How commercial reference data flows into programme configuration, eligibility and claim evidence.</p></header><MasterHierarchy /></div>;
}

function RoutedPage() {
  const pathname = usePathname();
  switch (pathname) {
    case "/subvention/operations": return <OperationsWorkbench />;
    case "/subvention/purchase-imports": return <DocumentUploadWorkspace />;
    case "/subvention/transactions": return <PurchaseRepositoryWorkspace />;
    case "/subvention/eligibility": return <EligibilityWorkspace />;
    case "/subvention/claims": return <main className="mx-auto w-full max-w-[1480px] p-5 lg:p-7"><ClaimPreparation /><ClaimLifecycleTracker /></main>;
    case "/subvention/masters": return <MasterDataWorkbench />;
    case "/subvention/schemes": return <SchemeProgrammeWorkspace />;
    case "/subvention/programme-mappings": return <SchemeProgrammeWorkspace initialView="programmes" />;
    case "/subvention/administration/data-model": return <DataModelPage />;
    case "/subvention/reconciliation": return <RouteContractPage title="Reconciliation" description="Resolve billing, collection and accounting variances against approved values." filters={{}} />;
    case "/subvention/recovery": return <RouteContractPage title="Recovery" description="Monitor counterparty receivables, filing obligations and recovery follow-up." filters={{}} />;
    default: return <OverviewPage />;
  }
}

function StandaloneApp() {
  return <PlatformShell><StateTools /><RoutedPage /></PlatformShell>;
}

if (!window.location.hash.startsWith("#/")) window.location.hash = "#/subvention";
createRoot(document.getElementById("root")!).render(<StandaloneApp />);
