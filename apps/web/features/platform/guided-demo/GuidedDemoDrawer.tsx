"use client";

import { Check, Circle, Play, StepBack, StepForward } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usePlatform } from "@/features/platform/store/PlatformProvider";

const stepIcon = { COMPLETE: Check, CURRENT: Play, UPCOMING: Circle };

export function GuidedDemoDrawer() {
  const router = useRouter();
  const { snapshot, activeJourneyId, setJourneyStep, stopJourney } = usePlatform();
  const journey = snapshot.guidedJourneys.find((item) => item.id === activeJourneyId);
  const employer = snapshot.employers.find((item) => item.id === journey?.employerId);
  const employee = snapshot.employees.find((item) => item.id === journey?.employeeId);
  const application = snapshot.applications.find((item) => item.id === journey?.applicationId);
  const asset = snapshot.assets.find((item) => item.id === application?.assetId);
  const lease = snapshot.leases.find((item) => item.id === journey?.leaseId);
  const currentIndex = journey?.steps.findIndex((item) => item.status === "CURRENT") ?? -1;
  const current = currentIndex >= 0 ? journey?.steps[currentIndex] : undefined;
  const navigate = (index: number) => {
    const step = journey?.steps[index];
    if (!step) return;
    setJourneyStep(step.id);
    router.push(step.href);
  };

  return <Sheet open={Boolean(journey && current)} onOpenChange={(open) => { if (!open) stopJourney(); }}>
    <SheetContent side="right" className="guided-demo-drawer" showCloseButton={false} aria-label="Guided Demo Journey">
      <SheetHeader className="guided-demo-header"><span className="eyebrow">Connected case journey</span><SheetTitle>Guided Demo Journey</SheetTitle><SheetDescription>One source-backed EPP case across registered workspaces.</SheetDescription></SheetHeader>
      {journey && current && employer && employee && application && asset && lease ? <div className="guided-demo-content">
        <dl className="guided-demo-case"><div><dt>Employer</dt><dd>{employer.name} <span>{employer.id}</span></dd></div><div><dt>Employee</dt><dd>{employee.name} <span>{employee.id}</span></dd></div><div><dt>Application</dt><dd>{application.id}</dd></div><div><dt>Asset</dt><dd>{asset.oem} {asset.model} <span>{asset.id}</span></dd></div><div><dt>Lease</dt><dd>{lease.id}</dd></div></dl>
        <ol className="guided-demo-steps" aria-label="Journey steps">{journey.steps.map((step) => { const Icon = stepIcon[step.status]; return <li key={step.id} data-status={step.status}><Icon aria-hidden="true" /><div><strong>{step.label}</strong><span>{step.status}</span></div></li>; })}</ol>
        <section className="guided-demo-current" aria-live="polite"><span className="eyebrow">Current step</span><h3>{current.label}</h3><p>Open the filtered operational evidence for this connected Northstar case, then continue only when you are ready.</p></section>
        <div className="guided-demo-actions"><Button className="guided-demo-primary" onClick={() => navigate(currentIndex)}>Open current step</Button><div><Button variant="outline" onClick={() => navigate(currentIndex - 1)} disabled={currentIndex <= 0}><StepBack aria-hidden />Previous journey step</Button><Button variant="outline" onClick={() => navigate(currentIndex + 1)} disabled={currentIndex >= journey.steps.length - 1}>Next journey step<StepForward aria-hidden /></Button></div><Button variant="ghost" onClick={stopJourney}>Exit Demo</Button></div>
      </div> : null}
    </SheetContent>
  </Sheet>;
}
